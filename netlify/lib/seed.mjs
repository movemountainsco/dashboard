/**
 * Historical submissions migrated out of Jotform.
 *
 * Shape:
 *   {
 *     <department>: {
 *       "<period>": {
 *         data: { <fieldKey>: value, ... },
 *         submittedBy: "someone@movemountains.co",   // optional
 *         submittedByName: "Someone",                 // optional
 *         submittedAt: "2026-08-17T00:00:00.000Z"     // optional
 *       }
 *     }
 *   }
 *
 * Periods are ISO weeks ("2026-W34") for weekly departments and calendar
 * months ("2026-08") for monthly ones.
 *
 * This file is read-only history. Anything submitted through the app lands
 * in Netlify Blobs instead and takes precedence over the same period here,
 * so a bad import can always be corrected in the UI without editing this file.
 *
 * Populated via POST /api/import (management only) — see netlify/functions/import.mjs.
 */

export const seed = {
  payroll: {},
  marketing: {},
  photo: {},
  gear: {},
  sales: {},
  planning: {},
};

export default seed;
