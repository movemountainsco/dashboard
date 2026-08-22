/**
 * GET /api/session
 *
 * Tells the frontend who it is talking to and what it may see: the field
 * schema, the departments this user can read/write, and whether they get the
 * management view. One call, so the app can render its whole shell without
 * a waterfall of requests.
 */

import { getUser, isManagement, readableDepartments, writableDepartments, json, unauthorized } from '../lib/auth.mjs';
import { serializableSchema } from '../lib/schema.mjs';
import { currentDuePeriod } from '../lib/periods.mjs';
import { DEPARTMENTS } from '../lib/schema.mjs';

export default async (req, context) => {
  const user = getUser(context);
  if (!user) return unauthorized();

  const readable = readableDepartments(user);
  const writable = writableDepartments(user);

  // What each readable department currently owes.
  const due = {};
  for (const key of readable) {
    due[key] = currentDuePeriod(DEPARTMENTS[key].cadence);
  }

  return json({
    user: { email: user.email, name: user.name, roles: user.roles },
    isManagement: isManagement(user),
    readable,
    writable,
    due,
    schema: serializableSchema(),
    // Surfaced so we can spot a mis-provisioned account instead of showing
    // someone a blank app with no explanation.
    hasNoAccess: readable.length === 0,
  });
};

export const config = {
  path: '/api/session',
};
