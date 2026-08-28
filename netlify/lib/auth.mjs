/**
 * Authentication + authorisation.
 *
 * Auth comes from Netlify Identity. When the browser sends
 * `Authorization: Bearer <identity-jwt>`, Netlify verifies the token at the
 * edge and hands the decoded user to the function on
 * `context.clientContext.user`. We never trust anything the browser claims
 * about roles — roles are read only from that verified token.
 *
 * Roles are set per-user in the Netlify UI:
 *   Netlify → Project → Identity → (user) → Edit Settings → Roles
 *
 * Recognised roles. One role per department, plus `management`. A person can
 * hold more than one department role.
 *
 *   management        - sees and writes every department + the compliance view
 *   payroll           - Payroll
 *   marketing         - Marketing
 *   photo             - Photo
 *   video             - Video
 *   gear              - Gear
 *   sales             - Sales
 *   planning          - Planning (each planner files their own report)
 *   vendor_relations  - Vendor Relations
 *   scheduling        - Scheduling (also sees Payroll shooter spend, read-only)
 */

import { DEPARTMENTS, DEPARTMENT_KEYS } from './schema.mjs';

export const MANAGEMENT_ROLE = 'management';

/** Pull the verified Identity user off the function context. */
export function getUser(context) {
  const user = context?.clientContext?.user;
  if (!user || !user.email) return null;
  const roles = user.app_metadata?.roles || [];
  return {
    email: String(user.email).toLowerCase(),
    name: user.user_metadata?.full_name || user.email,
    roles: Array.isArray(roles) ? roles.map((r) => String(r).toLowerCase()) : [],
  };
}

export function isManagement(user) {
  return !!user && user.roles.includes(MANAGEMENT_ROLE);
}

/** Departments this user may READ. Management reads everything. */
export function readableDepartments(user) {
  if (!user) return [];
  if (isManagement(user)) return [...DEPARTMENT_KEYS];
  return DEPARTMENT_KEYS.filter((k) => user.roles.includes(DEPARTMENTS[k].role));
}

/**
 * Departments this user may WRITE.
 *
 * Deliberately the same as read access, including for management: Sean and
 * Yan can file on someone's behalf when a department head is out, which is
 * the whole point of supporting backfill.
 */
export function writableDepartments(user) {
  return readableDepartments(user);
}

export function canRead(user, departmentKey) {
  return readableDepartments(user).includes(departmentKey);
}

export function canWrite(user, departmentKey) {
  return writableDepartments(user).includes(departmentKey);
}

/* ------------------------------------------------------------------ */
/* Response helpers                                                    */
/* ------------------------------------------------------------------ */

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export function unauthorized(msg = 'You must sign in to do that.') {
  return json({ error: msg }, 401);
}

export function forbidden(msg = 'You do not have access to that department.') {
  return json({ error: msg }, 403);
}

export function badRequest(msg) {
  return json({ error: msg }, 400);
}
