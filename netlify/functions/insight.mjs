/**
 * /api/insight
 *
 *   GET  /api/insight?department=payroll&period=2026-W34
 *        -> the cached AI breakdown for that submission, generating it on
 *           first request.
 *
 *   GET  /api/insight?scope=management&period=2026-W34
 *        -> cross-department executive rollup. Management role only.
 *
 *   POST /api/insight  { department, period }            -> force regenerate
 *   POST /api/insight  { scope: 'management', period }   -> force regenerate
 *
 * Summaries are cached in Blobs so the same week is not re-billed on every
 * page load. Regenerating is always explicit.
 */

import { getStore } from '@netlify/blobs';
import {
  getUser, canRead, json, unauthorized, forbidden, badRequest,
} from '../lib/auth.mjs';
import { DEPARTMENTS, DEPARTMENT_KEYS } from '../lib/schema.mjs';
import { isValidPeriod } from '../lib/periods.mjs';
import { getReport, listReports, isPerPerson, submitterSlug } from '../lib/store.mjs';
import {
  buildDepartmentPrompt, buildManagementPrompt, generate,
  DEPT_SYSTEM, MGMT_SYSTEM, isConfigured,
} from '../lib/insight.mjs';

const HISTORY_DEPTH = 8;

function store() {
  return getStore({ name: 'insights', consistency: 'strong' });
}

function isManagement(user) {
  const roles = user?.app_metadata?.roles || [];
  return roles.includes('admin') || roles.includes('management');
}

export default async (req, context) => {
  const user = getUser(context);
  if (!user) return unauthorized();

  const url = new URL(req.url);
  let scope = url.searchParams.get('scope');
  let department = url.searchParams.get('department');
  let period = url.searchParams.get('period');
  let submitter = url.searchParams.get('submitter')
    || (url.searchParams.get('mine') === 'true' ? user.email : null);
  let refresh = req.method === 'POST';

  if (req.method === 'POST') {
    let body;
    try {
      body = await req.json();
    } catch {
      return badRequest('Request body must be JSON.');
    }
    scope = body.scope || scope;
    department = body.department || department;
    period = body.period || period;
    submitter = body.submitter || (body.mine ? user.email : submitter);
  } else if (req.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405);
  }

  if (!isConfigured()) {
    return json({
      ok: false,
      configured: false,
      error: 'AI summaries are not configured yet. Set ANTHROPIC_API_KEY in the site environment variables and redeploy.',
    }, 200);
  }

  if (scope === 'management') return handleManagement({ user, period, refresh });
  return handleDepartment({ user, department, period, refresh, submitter });
};

/* ------------------------------------------------------------------ */

async function handleDepartment({ user, department, period, refresh, submitter }) {
  if (!department || !DEPARTMENTS[department]) return badRequest('Unknown department.');
  if (!canRead(user, department)) return forbidden();

  const dept = DEPARTMENTS[department];
  if (!isValidPeriod(dept.cadence, period)) {
    return badRequest(
      dept.cadence === 'monthly'
        ? 'Period must look like 2026-08.'
        : 'Period must look like 2026-W34.',
    );
  }

  // Per-person departments need their own person's report, not whichever one
  // happened to be written first. Default to the caller when they belong to
  // the department, so a planner opening their own week just works.
  const perPerson = isPerPerson(department);
  const who = perPerson ? (submitter || user.email) : null;

  const key = perPerson
    ? `${department}/${period}/${submitterSlug(who)}.json`
    : `${department}/${period}.json`;
  const blobs = store();

  if (!refresh) {
    const cached = await blobs.get(key, { type: 'json' }).catch(() => null);
    if (cached) return json({ ok: true, cached: true, insight: cached });
  }

  const current = await getReport(department, period, who);
  if (!current) {
    return json({
      ok: false,
      error: perPerson
        ? `No ${dept.label} report on record for ${period} from ${who}.`
        : `No ${dept.label} report on record for ${period}.`,
    }, 404);
  }

  // Newest-first history, excluding the period we are summarising. For a
  // per-person department this is scoped to one person, so a planner is
  // compared against their own prior weeks and not against a colleague's.
  const all = await listReports(department, who ? { submitter: who } : {});
  const older = all
    .filter((r) => r.period < period)
    .sort((a, b) => (a.period < b.period ? 1 : -1));

  const prior = older[0] || null;
  const history = older.slice(0, HISTORY_DEPTH);

  const prompt = buildDepartmentPrompt({
    departmentKey: department,
    period,
    current: current.data,
    prior: prior?.data || null,
    history,
  });

  const result = await generate(DEPT_SYSTEM, prompt);
  if (!result.ok) return json({ ok: false, error: result.error }, 502);

  const insight = {
    department,
    period,
    submitter: who,
    text: result.text,
    model: result.model,
    generated_at: new Date().toISOString(),
    based_on: {
      prior_period: prior?.period || null,
      history_periods: history.map((h) => h.period),
    },
  };

  await blobs.setJSON(key, insight);
  return json({ ok: true, cached: false, insight });
}

/* ------------------------------------------------------------------ */

async function handleManagement({ user, period, refresh }) {
  if (!isManagement(user)) return forbidden();
  if (!period) return badRequest('A period is required, e.g. 2026-W34.');

  const key = `management/${period}.json`;
  const blobs = store();

  if (!refresh) {
    const cached = await blobs.get(key, { type: 'json' }).catch(() => null);
    if (cached) return json({ ok: true, cached: true, insight: cached });
  }

  const snapshots = [];
  const missing = [];

  for (const deptKey of DEPARTMENT_KEYS) {
    const dept = DEPARTMENTS[deptKey];
    const all = await listReports(deptKey);
    if (!all.length) { missing.push(deptKey); continue; }

    const sorted = [...all].sort((a, b) => (a.period < b.period ? 1 : -1));

    // Weekly departments match the requested week. Monthly departments use
    // their latest submission, since a week does not map onto a month.
    let match;
    if (dept.cadence === 'monthly') {
      match = sorted[0];
    } else {
      match = sorted.find((r) => r.period === period);
    }

    if (!match) { missing.push(deptKey); continue; }

    const prior = sorted.find((r) => r.period < match.period) || null;
    snapshots.push({
      department: deptKey,
      period: match.period,
      data: match.data,
      prior: prior?.data || null,
    });
  }

  if (!snapshots.length) {
    return json({ ok: false, error: `No submissions on record for ${period}.` }, 404);
  }

  const prompt = buildManagementPrompt({ period, snapshots, missing });
  const result = await generate(MGMT_SYSTEM, prompt, 900);
  if (!result.ok) return json({ ok: false, error: result.error }, 502);

  const insight = {
    scope: 'management',
    period,
    text: result.text,
    model: result.model,
    generated_at: new Date().toISOString(),
    departments_included: snapshots.map((s) => s.department),
    departments_missing: missing,
  };

  await blobs.setJSON(key, insight);
  return json({ ok: true, cached: false, insight });
}

export const config = {
  path: '/api/insight',
};
