import { createHmac, timingSafeEqual } from "node:crypto";
import { HttpError, cleanEmail } from "./util.mjs";

export const COOKIE = "mmc_reports_session";
const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
const TWELVE_HOURS_SEC = 12 * 60 * 60;

export const COMPANY_DOMAIN = "movemountains.co";
export const DEFAULT_ADMIN_EMAIL = "sean@movemountains.co";

export const ASK_SEAN =
  "Ask Sean for access. Sign-in is limited to @movemountains.co accounts.";

function secret(env = process.env) {
  const value = env.SESSION_SECRET || "";
  if (value.length < 16) {
    throw new HttpError(500, "SESSION_SECRET is missing. Add it in the Netlify env vars.");
  }
  return value;
}

export function signSession(payload, env = process.env) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret(env)).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function readSession(token, env = process.env) {
  if (!token || !token.includes(".")) return null;
  const dot = token.lastIndexOf(".");
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac("sha256", secret(env)).update(body).digest("base64url");
  const got = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (got.length !== expBuf.length || !timingSafeEqual(got, expBuf)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!data?.email || !data?.exp || data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

export function readCookie(req, name = COOKIE) {
  const raw = req.headers.get("cookie") || "";
  for (const part of raw.split(";")) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    if (trimmed.slice(0, eq) === name) return decodeURIComponent(trimmed.slice(eq + 1));
  }
  return "";
}

export function sessionCookie(token, { clear = false, env = process.env } = {}) {
  const secure = env.CONTEXT === "production" || String(env.URL || "").startsWith("https://");
  const parts = [
    `${COOKIE}=${clear ? "" : encodeURIComponent(token)}`,
    "HttpOnly",
    "Path=/",
    "SameSite=Lax",
    `Max-Age=${clear ? 0 : TWELVE_HOURS_SEC}`,
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

/** sean@ is always an admin. REPORTS_ADMIN_EMAILS adds more, comma-separated. */
export function adminEmailsFromEnv(raw = process.env.REPORTS_ADMIN_EMAILS) {
  const emails = String(raw || "")
    .split(/[,\s]+/)
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  emails.push(DEFAULT_ADMIN_EMAIL);
  return [...new Set(emails)];
}

export function isCompanyEmail(email) {
  const domain = cleanEmail(email).split("@")[1] || "";
  return domain === COMPANY_DOMAIN;
}

/**
 * Dev login exists only on a local process.
 * Netlify production, deploy previews, and branch deploys never enable it,
 * even if REPORTS_DEV or NETLIFY_DEV is set by mistake.
 */
export function devLoginAllowed(env = process.env) {
  const context = String(env.CONTEXT || "");
  if (context === "production" || context === "deploy-preview" || context === "branch-deploy") {
    return false;
  }
  return env.NETLIFY_DEV === "true" || env.REPORTS_DEV === "1";
}

export function newSession(user, env = process.env, now = Date.now()) {
  return signSession(
    {
      email: cleanEmail(user.email),
      name: user.name || "",
      role: user.role === "admin" ? "admin" : "member",
      exp: now + TWELVE_HOURS_MS,
    },
    env,
  );
}

export function currentUser(req, env = process.env) {
  const token = readCookie(req);
  if (!token) return null;
  const session = readSession(token, env);
  if (!session) return null;
  return {
    email: cleanEmail(session.email),
    name: session.name || "",
    role: session.role === "admin" ? "admin" : "member",
  };
}
