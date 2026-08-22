/**
 * Data access layer.
 *
 * Two sources, merged:
 *   1. seed.mjs   — historical submissions migrated out of Jotform. Read-only,
 *                   version-controlled, ships with the function bundle.
 *   2. Netlify Blobs — everything submitted through this app from now on.
 *
 * A live blob always wins over a seed record with the same key, so an old
 * imported week can be corrected through the UI without touching seed.mjs.
 *
 * Blob key format: `<department>/<period>` e.g. `payroll/2026-W34`.
 */

import { getStore } from '@netlify/blobs';
import { seed } from './seed.mjs';
import { DEPARTMENTS, withDerived } from './schema.mjs';

const STORE_NAME = 'mmc-reports';

function store() {
  // Strong consistency: a department head who just submitted needs to see
  // their own report immediately, and management needs the compliance grid
  // to flip to green right away. Eventual consistency would show a
  // confusing "still missing" state for up to a minute after submitting.
  return getStore({ name: STORE_NAME, consistency: 'strong' });
}

function blobKey(department, period) {
  return `${department}/${period}`;
}

/** Normalise a stored record and attach derived values. */
function hydrate(record) {
  if (!record) return null;
  return {
    ...record,
    data: withDerived(record.department, record.data || {}),
  };
}

/** All seed records for a department, keyed by period. */
function seedFor(department) {
  const rows = seed[department] || {};
  return rows;
}

/** Fetch one report. */
export async function getReport(department, period) {
  const live = await store().get(blobKey(department, period), { type: 'json' });
  if (live) return hydrate(live);
  const fromSeed = seedFor(department)[period];
  return fromSeed ? hydrate({ ...fromSeed, department, period, source: 'jotform' }) : null;
}

/**
 * Fetch every report for a department, newest period first.
 * Merges seed + live.
 */
export async function listReports(department) {
  const byPeriod = new Map();

  for (const [period, record] of Object.entries(seedFor(department))) {
    byPeriod.set(period, { ...record, department, period, source: 'jotform' });
  }

  const { blobs } = await store().list({ prefix: `${department}/` });
  await Promise.all(
    blobs.map(async ({ key }) => {
      const record = await store().get(key, { type: 'json' });
      if (record) byPeriod.set(record.period, record);
    }),
  );

  return [...byPeriod.values()]
    .map(hydrate)
    .sort((a, b) => (a.period < b.period ? 1 : -1));
}

/** Just the period keys that exist for a department (cheap — no body reads). */
export async function listPeriods(department) {
  const periods = new Set(Object.keys(seedFor(department)));
  const { blobs } = await store().list({ prefix: `${department}/` });
  for (const { key } of blobs) {
    const period = key.slice(department.length + 1);
    if (period) periods.add(period);
  }
  return periods;
}

/** Create or overwrite a report. */
export async function putReport({ department, period, data, user }) {
  const key = blobKey(department, period);
  const existing = await store().get(key, { type: 'json' });

  const record = {
    department,
    period,
    data,
    submittedBy: existing?.submittedBy || user.email,
    submittedByName: existing?.submittedByName || user.name,
    submittedAt: existing?.submittedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    updatedBy: user.email,
    source: 'app',
  };

  await store().setJSON(key, record);
  return hydrate(record);
}

export { DEPARTMENTS };
