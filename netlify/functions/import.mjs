/**
 * POST /api/import   (management only)
 *
 * Bulk-loads historical reports — the Jotform back-catalogue, or a CSV export
 * from anywhere else. Writes straight to Blobs, so imported rows behave
 * exactly like app submissions and can be edited in the UI afterwards.
 *
 * Body:
 *   {
 *     "department": "payroll",
 *     "dryRun": true,                 // optional — validate without writing
 *     "overwrite": false,             // optional — replace existing periods
 *     "rows": [
 *       { "period": "2026-W33", "data": { "w2_salary": 1000, ... } },
 *       { "date": "2026-08-21",  "data": { ... } }   // period derived from date
 *     ]
 *   }
 *
 * Returns a per-row result so a partial import is obvious rather than silent.
 */

import {
  getUser, isManagement, json, unauthorized, forbidden, badRequest,
} from '../lib/auth.mjs';
import { DEPARTMENTS } from '../lib/schema.mjs';
import { isValidPeriod, periodKeyFor } from '../lib/periods.mjs';
import { getReport, putReport } from '../lib/store.mjs';

const MAX_ROWS = 500;

export default async (req, context) => {
  const user = getUser(context);
  if (!user) return unauthorized();
  // Import can overwrite any department's history — management only.
  if (!isManagement(user)) return forbidden('Only management can import history.');
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let body;
  try {
    body = await req.json();
  } catch {
    return badRequest('Request body must be JSON.');
  }

  const { department, rows, dryRun = false, overwrite = false } = body || {};

  const dept = DEPARTMENTS[department];
  if (!dept) return badRequest('Unknown department.');
  if (!Array.isArray(rows) || rows.length === 0) return badRequest('No rows supplied.');
  if (rows.length > MAX_ROWS) {
    return badRequest(`Too many rows (${rows.length}). Split into batches of ${MAX_ROWS}.`);
  }

  const allowed = new Set(dept.fields.map((f) => f.key));
  const results = [];
  const seenPeriods = new Set();

  for (const [index, row] of rows.entries()) {
    const result = { index, period: null, status: 'skipped', reason: null };

    // Accept an explicit period, or derive one from a submission date.
    let period = row?.period || null;
    if (!period && row?.date) period = periodKeyFor(dept.cadence, row.date);
    result.period = period;

    if (!period || !isValidPeriod(dept.cadence, period)) {
      result.reason = `Invalid or missing period (cadence: ${dept.cadence}).`;
      results.push(result);
      continue;
    }

    // Two source rows landing in the same week is a real signal that the
    // date-to-period mapping is off — surface it instead of silently
    // letting the second row clobber the first.
    if (seenPeriods.has(period)) {
      result.reason = 'Duplicate period within this batch.';
      results.push(result);
      continue;
    }
    seenPeriods.add(period);

    if (!row?.data || typeof row.data !== 'object') {
      result.reason = 'Row has no data object.';
      results.push(result);
      continue;
    }

    const existing = await getReport(department, period);
    if (existing && !overwrite) {
      result.reason = 'Already exists (pass overwrite: true to replace).';
      results.push(result);
      continue;
    }

    const clean = {};
    const unknown = [];
    for (const [k, v] of Object.entries(row.data)) {
      if (allowed.has(k)) clean[k] = v;
      else unknown.push(k);
    }

    if (Object.keys(clean).length === 0) {
      result.reason = `No recognised fields. Unknown keys: ${unknown.join(', ') || 'none'}`;
      results.push(result);
      continue;
    }

    if (unknown.length) result.unknownFields = unknown;

    if (dryRun) {
      result.status = 'would-import';
      result.fieldCount = Object.keys(clean).length;
      results.push(result);
      continue;
    }

    await putReport({
      department,
      period,
      data: clean,
      user: {
        email: row.submittedBy || 'import@movemountains.co',
        name: row.submittedByName || 'Imported from Jotform',
      },
    });

    result.status = existing ? 'replaced' : 'imported';
    result.fieldCount = Object.keys(clean).length;
    results.push(result);
  }

  const counts = results.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  return json({
    ok: true,
    department,
    dryRun,
    total: rows.length,
    counts,
    results,
  });
};

export const config = {
  path: '/api/import',
};
