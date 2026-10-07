import {
  ASK_SEAN,
  DEFAULT_ADMIN_EMAIL,
  adminEmailsFromEnv,
  isCompanyEmail,
} from "./auth.mjs";
import { cleanEmail, slug } from "./util.mjs";

export { ASK_SEAN, isCompanyEmail };

function verified(value) {
  return value === true || value === "true";
}

/**
 * Who may open Reports after Google verifies the account.
 * Verified @movemountains.co addresses sign in.
 * sean@movemountains.co is always an admin, plus REPORTS_ADMIN_EMAILS.
 */
export function decideAccess({ email, emailVerified, adminEmails }) {
  const clean = cleanEmail(email);
  if (!clean || !clean.includes("@")) {
    return { ok: false, status: 401, message: "That Google account has no email." };
  }
  if (!verified(emailVerified)) {
    return { ok: false, status: 403, message: "That Google account has not verified its email." };
  }
  if (!isCompanyEmail(clean)) {
    return { ok: false, status: 403, message: ASK_SEAN };
  }
  const admins = new Set((adminEmails || adminEmailsFromEnv()).map((item) => cleanEmail(item)));
  admins.add(DEFAULT_ADMIN_EMAIL);
  return { ok: true, email: clean, role: admins.has(clean) ? "admin" : "member" };
}

export function matchDepartment(value, org) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const id = slug(raw);
  const lower = raw.toLowerCase();
  return (
    (org?.departments || []).find(
      (dept) => dept.id === raw || dept.id === id || dept.name.toLowerCase() === lower,
    ) || null
  );
}

export function findPerson(value, org) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
  const people = org?.people || [];
  if (lower.includes("@")) {
    return people.find((person) => cleanEmail(person.email) === lower) || null;
  }
  return (
    people.find((person) => {
      if (String(person.name || "").toLowerCase() === lower) return true;
      return (person.aliases || []).some((alias) => String(alias).toLowerCase() === lower);
    }) || null
  );
}

/** Departments this email heads, plus anything those departments roll up, plus child departments. */
export function departmentsForHead(email, org) {
  const clean = cleanEmail(email);
  const departments = org?.departments || [];
  const ids = new Set(
    departments.filter((dept) => cleanEmail(dept.head?.email) === clean).map((dept) => dept.id),
  );
  for (const dept of departments) {
    if (!ids.has(dept.id)) continue;
    for (const child of dept.rollsUp || []) ids.add(child);
  }
  let changed = true;
  while (changed) {
    changed = false;
    for (const dept of departments) {
      if (dept.parent && ids.has(dept.parent) && !ids.has(dept.id)) {
        ids.add(dept.id);
        changed = true;
      }
    }
  }
  return [...ids];
}

export function peopleUnder(email, org) {
  const deptIds = new Set(departmentsForHead(email, org));
  if (!deptIds.size) return [];
  return (org?.people || []).filter((person) => deptIds.has(person.department));
}

export function visibleDepartments(user, org) {
  if (!user) return [];
  if (user.role === "admin") return org?.departments || [];
  const ids = new Set(departmentsForHead(user.email, org));
  return (org?.departments || []).filter((dept) => ids.has(dept.id));
}

function personKeys(value, org) {
  const keys = new Set();
  const raw = String(value || "").trim();
  if (!raw) return keys;
  keys.add(raw.toLowerCase());
  const found = findPerson(raw, org);
  if (found) {
    keys.add(String(found.name || "").toLowerCase());
    if (found.email) keys.add(cleanEmail(found.email));
    for (const alias of found.aliases || []) keys.add(String(alias).toLowerCase());
  }
  return keys;
}

const ADMIN_SCOPES = new Set(["admins", "admin", "management-only"]);
const COMPANY_SCOPES = new Set(["company", "all", "everyone"]);

export function normalizeAudience(report, org) {
  const emails = new Set();
  const names = new Set();
  const departments = new Set();
  let scope = "addressed";

  const addToken = (token) => {
    if (Array.isArray(token)) {
      for (const item of token) addToken(item);
      return;
    }
    if (token && typeof token === "object") {
      if (token.scope) addToken(token.scope);
      for (const email of token.emails || []) addToken(email);
      for (const name of token.names || []) addToken(name);
      for (const dept of token.departments || []) addToken(dept);
      return;
    }
    const value = String(token ?? "").trim();
    if (!value) return;
    const lower = value.toLowerCase();
    if (ADMIN_SCOPES.has(lower)) {
      if (scope !== "company") scope = "admins";
      return;
    }
    if (COMPANY_SCOPES.has(lower)) {
      scope = "company";
      return;
    }
    if (lower.includes("@")) {
      emails.add(lower);
      return;
    }
    const dept = matchDepartment(value, org);
    if (dept) {
      departments.add(dept.id);
      return;
    }
    names.add(lower);
  };

  addToken(report?.audience);
  if (report?.department) {
    const dept = matchDepartment(report.department, org);
    departments.add(dept ? dept.id : slug(report.department));
  }
  if (report?.person) addToken(report.person);

  return {
    emails: [...emails],
    names: [...names],
    departments: [...departments],
    scope,
  };
}

/**
 * Admins see every report.
 * Department heads see their department(s), rolled-up departments, and people under them.
 * Everyone else sees reports addressed to them (email, name, or alias).
 */
export function canSeeReport(user, report, org) {
  if (!user || !report) return false;
  const email = cleanEmail(user.email);
  if (!email) return false;
  if (user.role === "admin") return true;

  const aud = normalizeAudience(report, org);
  if (aud.scope === "company" && isCompanyEmail(email)) return true;
  if (aud.emails.includes(email)) return true;

  const userName = String(user.name || "").trim().toLowerCase();
  if (userName && aud.names.includes(userName)) return true;
  const self = findPerson(email, org);
  if (self) {
    if (aud.names.includes(String(self.name || "").toLowerCase())) return true;
    for (const alias of self.aliases || []) {
      if (aud.names.includes(String(alias).toLowerCase())) return true;
    }
  }

  const headed = departmentsForHead(email, org);
  if (!headed.length) return false;
  const headedSet = new Set(headed);
  for (const dept of aud.departments) {
    if (headedSet.has(dept)) return true;
  }

  const underKeys = new Set();
  for (const person of peopleUnder(email, org)) {
    for (const key of personKeys(person.email || person.name, org)) underKeys.add(key);
  }
  if (report.person) {
    for (const key of personKeys(report.person, org)) {
      if (underKeys.has(key)) return true;
    }
  }
  for (const value of [...aud.emails, ...aud.names]) {
    if (underKeys.has(value)) return true;
  }
  return false;
}

export function publicUser(user, org) {
  const email = cleanEmail(user.email);
  const direct = (org?.departments || []).filter((dept) => cleanEmail(dept.head?.email) === email);
  return {
    email,
    name: user.name || "",
    role: user.role === "admin" ? "admin" : "member",
    heads: direct.map((dept) => ({ id: dept.id, name: dept.name })),
    sees: visibleDepartments(user, org).map((dept) => ({ id: dept.id, name: dept.name })),
  };
}
