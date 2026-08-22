/**
 * GET /api/compliance?weeks=12
 *
 * The management view: for every department the caller can see, which of the
 * recent periods have a report and which are missing, plus the latest
 * headline number and who filed it.
 *
 * Department heads get this too, scoped to their own departments — that's
 * how they see which weeks they still owe and can go back and fill them in.
 */

import {
  getUser, readableDepartments, isManagement, json, unauthorized,
} from '../lib/auth.mjs';
import { DEPARTMENTS } from '../lib/schema.mjs';
import { recentPeriods, currentDuePeriod, periodLabel } from '../lib/periods.mjs';
import { listPeriods, getReport } from '../lib/store.mjs';

const DEFAULT_WINDOW = 12;
const MAX_WINDOW = 52;

export default async (req, context) => {
  const user = getUser(context);
  if (!user) return unauthorized();

  const url = new URL(req.url);
  const requested = parseInt(url.searchParams.get('weeks') || '', 10);
  const windowSize = Number.isFinite(requested)
    ? Math.min(Math.max(requested, 1), MAX_WINDOW)
    : DEFAULT_WINDOW;

  const departments = readableDepartments(user);

  const results = await Promise.all(
    departments.map(async (key) => {
      const dept = DEPARTMENTS[key];
      const submitted = await listPeriods(key);

      // Monthly departments get a proportionally shorter window so the grid
      // doesn't stretch back years when management asks for 52 weeks.
      const count = dept.cadence === 'monthly'
        ? Math.max(3, Math.ceil(windowSize / 4))
        : windowSize;

      const periods = recentPeriods(dept.cadence, count).map((period) => ({
        period,
        label: periodLabel(period),
        submitted: submitted.has(period),
      }));

      const missing = periods.filter((p) => !p.submitted).map((p) => p.period);
      const due = currentDuePeriod(dept.cadence);
      const latestSubmitted = periods.find((p) => p.submitted)?.period || null;

      // Pull the most recent actual report for its headline figure.
      let latest = null;
      if (latestSubmitted) {
        const report = await getReport(key, latestSubmitted);
        if (report) {
          latest = {
            period: report.period,
            label: periodLabel(report.period),
            submittedBy: report.submittedByName || report.submittedBy || 'Imported from Jotform',
            submittedAt: report.submittedAt || null,
            source: report.source || 'app',
            headline: dept.headline
              ? {
                label: dept.headline.label,
                type: dept.headline.type,
                value: report.data?.[dept.headline.key] ?? null,
              }
              : null,
          };
        }
      }

      return {
        department: key,
        label: dept.label,
        cadence: dept.cadence,
        accent: dept.accent,
        role: dept.role,
        due,
        dueLabel: periodLabel(due),
        currentOnTime: submitted.has(due),
        missing,
        missingCount: missing.length,
        totalSubmitted: submitted.size,
        periods,
        latest,
      };
    }),
  );

  // Worst offenders first — the point of this screen is spotting gaps.
  results.sort((a, b) => {
    if (a.currentOnTime !== b.currentOnTime) return a.currentOnTime ? 1 : -1;
    return b.missingCount - a.missingCount;
  });

  return json({
    isManagement: isManagement(user),
    windowSize,
    generatedAt: new Date().toISOString(),
    departments: results,
    summary: {
      total: results.length,
      onTime: results.filter((r) => r.currentOnTime).length,
      late: results.filter((r) => !r.currentOnTime).length,
    },
  });
};

export const config = {
  path: '/api/compliance',
};
