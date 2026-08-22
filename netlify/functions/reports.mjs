/**
 * /api/reports
 *
 *   GET  /api/reports?department=payroll              -> all reports, newest first
 *   GET  /api/reports?department=payroll&period=2026-W34 -> one report
 *   POST /api/reports  { department, period, data }   -> create or update
 *
 * Every request is checked against the caller's Identity roles. A department
 * head can only ever touch their own department; management can touch any.
 */

import {
  getUser, canRead, canWrite, json, unauthorized, forbidden, badRequest,
} from '../lib/auth.mjs';
import { DEPARTMENTS } from '../lib/schema.mjs';
import { isValidPeriod } from '../lib/periods.mjs';
import { getReport, listReports, putReport } from '../lib/store.mjs';

export default async (req, context) => {
  const user = getUser(context);
  if (!user) return unauthorized();

  if (req.method === 'GET') return handleGet(req, user);
  if (req.method === 'POST') return handlePost(req, user);
  return json({ error: 'Method not allowed' }, 405);
};

async function handleGet(req, user) {
  const url = new URL(req.url);
  const department = url.searchParams.get('department');
  const period = url.searchParams.get('period');

  if (!department || !DEPARTMENTS[department]) {
    return badRequest('Unknown department.');
  }
  if (!canRead(user, department)) return forbidden();

  if (period) {
    const report = await getReport(department, period);
    return json({ report });
  }

  const reports = await listReports(department);
  return json({ reports });
}

async function handlePost(req, user) {
  let body;
  try {
    body = await req.json();
  } catch {
    return badRequest('Request body must be JSON.');
  }

  const { department, period, data } = body || {};

  if (!department || !DEPARTMENTS[department]) {
    return badRequest('Unknown department.');
  }
  if (!canWrite(user, department)) return forbidden();

  const dept = DEPARTMENTS[department];
  if (!isValidPeriod(dept.cadence, period)) {
    return badRequest(
      dept.cadence === 'monthly'
        ? 'Period must look like 2026-08.'
        : 'Period must look like 2026-W34.',
    );
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return badRequest('Missing report data.');
  }

  // Only accept keys the schema knows about. Stops a stale or tampered
  // client from writing junk into the store.
  const allowed = new Set(dept.fields.map((f) => f.key));
  const clean = {};
  for (const [k, v] of Object.entries(data)) {
    if (allowed.has(k)) clean[k] = v;
  }

  const missing = dept.fields
    .filter((f) => f.required)
    .filter((f) => clean[f.key] === undefined || clean[f.key] === null || clean[f.key] === '')
    .map((f) => f.label);

  if (missing.length) {
    return badRequest(`Please fill in: ${missing.join(', ')}`);
  }

  const report = await putReport({ department, period, data: clean, user });
  return json({ report, ok: true });
}

export const config = {
  path: '/api/reports',
};
