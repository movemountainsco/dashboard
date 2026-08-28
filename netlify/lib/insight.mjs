/**
 * Move Mountains Co. — AI insight generation.
 *
 * Two kinds of summary:
 *   1. Department  — runs right after a week/month is submitted. Compares the
 *                    new figures against the previous period and the trailing
 *                    average, and calls out anything that looks wrong.
 *   2. Management  — one high-level rollup across every department.
 *
 * Grounding rules baked into the prompts: only cite numbers that appear in the
 * supplied data, never invent a cause, and say plainly when a figure looks
 * like a data-entry problem rather than a real change.
 */

import { DEPARTMENTS, allFields, withDerived, num } from './schema.mjs';

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = process.env.INSIGHT_MODEL || 'claude-sonnet-5';
const API_KEY = process.env.ANTHROPIC_API_KEY;

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

function fmt(type, v) {
  if (v === null || v === undefined || v === '') return 'not recorded';
  if (type === 'currency') {
    return '$' + num(v).toLocaleString('en-US', {
      minimumFractionDigits: 2, maximumFractionDigits: 2,
    });
  }
  if (type === 'percent') return num(v).toFixed(2) + '%';
  if (type === 'number') {
    const n = num(v);
    return Number.isInteger(n) ? String(n) : n.toFixed(2);
  }
  return String(v);
}

function pctChange(now, before) {
  const a = num(now);
  const b = num(before);
  if (!b) return null;
  return ((a - b) / b) * 100;
}

/**
 * Render one period as "Label: value (▲ 4.2% vs prior)" lines.
 * Only numeric field types get a delta.
 */
function renderComparison(departmentKey, current, prior) {
  const fields = allFields(departmentKey);
  const lines = [];

  for (const f of fields) {
    const v = current?.[f.key];
    if (v === undefined || v === null || v === '') continue;

    let line = `- ${f.label}: ${fmt(f.type, v)}`;

    if (prior && ['currency', 'number', 'percent'].includes(f.type)) {
      const p = prior[f.key];
      if (p !== undefined && p !== null && p !== '') {
        const d = pctChange(v, p);
        if (d === null) {
          line += `  (prior period was ${fmt(f.type, p)})`;
        } else if (Math.abs(d) < 0.05) {
          line += `  (flat vs prior)`;
        } else {
          const arrow = d >= 0 ? 'up' : 'down';
          line += `  (${arrow} ${Math.abs(d).toFixed(1)}% vs prior, was ${fmt(f.type, p)})`;
        }
      }
    }
    lines.push(line);
  }
  return lines.join('\n');
}

/** Trailing mean for each numeric field, used to spot outlier weeks. */
function trailingAverages(departmentKey, history) {
  const fields = allFields(departmentKey)
    .filter((f) => ['currency', 'number', 'percent'].includes(f.type));
  const out = [];

  for (const f of fields) {
    const vals = history
      .map((h) => h.data?.[f.key])
      .filter((v) => v !== undefined && v !== null && v !== '')
      .map(num);
    if (vals.length < 2) continue;
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    out.push(`- ${f.label}: ${fmt(f.type, mean)} (mean of last ${vals.length})`);
  }
  return out.join('\n');
}

/* ------------------------------------------------------------------ */
/* Prompts                                                             */
/* ------------------------------------------------------------------ */

const DEPT_SYSTEM = `You write short internal analytics notes for Move Mountains Co., a wedding photography and video company.

Rules, in priority order:
1. Only cite numbers that appear in the data you are given. Never invent or estimate a figure.
2. Never invent a CAUSE. You may say a number moved and what it is arithmetically driven by, but do not speculate about why unless the data says so. "Shooters fell 77%, which is most of the drop in the weekly total" is fine. "Shooters fell because it was a slow season" is not.
3. If a value looks like a data-entry problem rather than a real change, say so directly. Signals: a percentage that jumps an order of magnitude, a total that does not reconcile with its parts, a date far outside the plausible range, or placeholder text such as "nan", "n/a" or "TBD" sitting in a field that should hold real data.
4. Plain, factual, unhyped. No filler openers, no "In conclusion". Do not congratulate anyone.
5. Exactly two paragraphs. No headings, no bullet points, no markdown.

Paragraph 1: what moved this period and what it is mechanically driven by.
Paragraph 2: what it means for the year-to-date position or the backlog, plus anything that needs checking.`;

export function buildDepartmentPrompt({ departmentKey, period, current, prior, history }) {
  const dept = DEPARTMENTS[departmentKey];
  const cur = withDerived(departmentKey, current || {});
  const pri = prior ? withDerived(departmentKey, prior) : null;

  const parts = [
    `Department: ${dept.label}`,
    `Period: ${period}`,
    `Cadence: ${dept.cadence}`,
    '',
    'THIS PERIOD:',
    renderComparison(departmentKey, cur, pri),
  ];

  const avgs = trailingAverages(departmentKey, history || []);
  if (avgs) {
    parts.push('', `TRAILING AVERAGES (last ${history.length} periods, for outlier context):`, avgs);
  }

  if (!pri) {
    parts.push('', 'NOTE: there is no prior period on record, so no period-over-period comparison is possible. Say so rather than implying a trend.');
  }

  return parts.join('\n');
}

const MGMT_SYSTEM = `You write the weekly executive summary for the owner of Move Mountains Co., a wedding photography and video company.

Rules, in priority order:
1. Only cite numbers present in the data. Never invent a figure.
2. Lead with what actually changed or what needs a decision. Do not narrate every department in turn — if a department is steady, it does not need a sentence.
3. Call out missing submissions explicitly. A department that did not report is a fact the owner needs, and its absence must not be mistaken for zero activity.
4. Flag anything that looks like a data problem rather than a real business change.
5. Plain and factual. No hype, no filler, no congratulation.
6. Three short paragraphs maximum. No headings, no bullets, no markdown.

Paragraph 1: the headline position across the business this period.
Paragraph 2: what moved and what is worth attention.
Paragraph 3: gaps, risks, and anything to chase.`;

export function buildManagementPrompt({ period, snapshots, missing }) {
  const parts = [`Period: ${period}`, ''];

  for (const s of snapshots) {
    const dept = DEPARTMENTS[s.department];
    if (!dept) continue;
    parts.push(`--- ${dept.label} (${s.period}) ---`);
    const cur = withDerived(s.department, s.data || {});
    const pri = s.prior ? withDerived(s.department, s.prior) : null;
    parts.push(renderComparison(s.department, cur, pri));
    parts.push('');
  }

  if (missing?.length) {
    parts.push(
      'DEPARTMENTS WITH NO SUBMISSION FOR THIS PERIOD:',
      ...missing.map((m) => `- ${DEPARTMENTS[m]?.label || m}`),
      '',
      'Treat these as unreported, NOT as zero.',
    );
  }

  return parts.join('\n');
}

/* ------------------------------------------------------------------ */
/* Model call                                                          */
/* ------------------------------------------------------------------ */

export function isConfigured() {
  return Boolean(API_KEY);
}

/**
 * Returns { ok, text, error }. Never throws — a failed summary must not
 * block a submission from being saved.
 */
export async function generate(system, prompt, maxTokens = 700) {
  if (!API_KEY) {
    return {
      ok: false,
      error: 'ANTHROPIC_API_KEY is not set on this site. Add it under Site settings -> Environment variables, then redeploy.',
    };
  }

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `Model API returned ${res.status}: ${body.slice(0, 300)}` };
    }

    const data = await res.json();
    const text = (data.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();

    if (!text) return { ok: false, error: 'Model returned an empty response.' };
    return { ok: true, text, model: data.model };
  } catch (err) {
    return { ok: false, error: `Could not reach the model API: ${err.message}` };
  }
}

export { DEPT_SYSTEM, MGMT_SYSTEM };
