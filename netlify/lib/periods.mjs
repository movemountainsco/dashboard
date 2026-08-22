/**
 * Period helpers.
 *
 * A "period" is the reporting window a submission belongs to:
 *   weekly  -> ISO week, e.g. "2026-W34"
 *   monthly -> calendar month, e.g. "2026-08"
 *
 * Using ISO weeks (Monday-start) matters: it means a report filed Monday
 * morning for the week that just ended lands in the right bucket, and it
 * gives every department a stable key to backfill against.
 */

const MS_PER_DAY = 86400000;

/** Parse "YYYY-MM-DD" or a Date into a UTC-midnight Date. */
export function toUTCDate(input) {
  if (input instanceof Date) {
    return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()));
  }
  const s = String(input).slice(0, 10);
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d));
}

/** ISO week number + ISO week-year for a date. */
export function isoWeekParts(date) {
  const d = toUTCDate(date);
  if (!d) return null;
  // Shift to the Thursday of this ISO week — that Thursday's year is the ISO year.
  const day = d.getUTCDay() || 7; // Sunday = 7
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const isoYear = d.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const week = Math.ceil(((d - yearStart) / MS_PER_DAY + 1) / 7);
  return { year: isoYear, week };
}

/** "2026-W34" for a given date. */
export function weekKey(date) {
  const p = isoWeekParts(date);
  if (!p) return null;
  return `${p.year}-W${String(p.week).padStart(2, '0')}`;
}

/** "2026-08" for a given date. */
export function monthKey(date) {
  const d = toUTCDate(date);
  if (!d) return null;
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Period key for a department cadence. */
export function periodKeyFor(cadence, date) {
  return cadence === 'monthly' ? monthKey(date) : weekKey(date);
}

/** Monday (UTC) that starts a given ISO week key. */
export function weekKeyToStart(key) {
  const m = /^(\d{4})-W(\d{2})$/.exec(key);
  if (!m) return null;
  const year = Number(m[1]);
  const week = Number(m[2]);
  // Jan 4th is always in ISO week 1.
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const week1Monday = new Date(jan4.getTime() - (jan4Day - 1) * MS_PER_DAY);
  return new Date(week1Monday.getTime() + (week - 1) * 7 * MS_PER_DAY);
}

/** Human label for a period key, e.g. "Week of Aug 17, 2026" / "August 2026". */
export function periodLabel(key) {
  if (!key) return '';
  if (key.includes('W')) {
    const start = weekKeyToStart(key);
    if (!start) return key;
    return `Week of ${start.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
    })}`;
  }
  const [y, m] = key.split('-').map(Number);
  if (!y || !m) return key;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', {
    month: 'long', year: 'numeric', timeZone: 'UTC',
  });
}

/** Step a week key backwards/forwards by n weeks. */
export function shiftWeekKey(key, n) {
  const start = weekKeyToStart(key);
  if (!start) return null;
  return weekKey(new Date(start.getTime() + n * 7 * MS_PER_DAY));
}

/** Step a month key backwards/forwards by n months. */
export function shiftMonthKey(key, n) {
  const [y, m] = key.split('-').map(Number);
  if (!y || !m) return null;
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return monthKey(d);
}

export function shiftPeriod(cadence, key, n) {
  return cadence === 'monthly' ? shiftMonthKey(key, n) : shiftWeekKey(key, n);
}

/**
 * The most recent COMPLETED period for a cadence.
 *
 * Weekly reports cover the week that just ended, so on any given day the
 * period people should be filing for is last week, not the one in progress.
 * Same logic for monthly.
 */
export function currentDuePeriod(cadence, now = new Date()) {
  if (cadence === 'monthly') {
    return shiftMonthKey(monthKey(now), -1);
  }
  return shiftWeekKey(weekKey(now), -1);
}

/**
 * List the last `count` periods ending at the current due period,
 * newest first.
 */
export function recentPeriods(cadence, count, now = new Date()) {
  const out = [];
  let key = currentDuePeriod(cadence, now);
  for (let i = 0; i < count; i += 1) {
    out.push(key);
    key = shiftPeriod(cadence, key, -1);
    if (!key) break;
  }
  return out;
}

/** Validate a period key's shape. */
export function isValidPeriod(cadence, key) {
  if (typeof key !== 'string') return false;
  return cadence === 'monthly'
    ? /^\d{4}-\d{2}$/.test(key)
    : /^\d{4}-W\d{2}$/.test(key);
}
