import assert from "node:assert/strict";
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";
import test from "node:test";
import {
  COOKIE,
  adminEmailsFromEnv,
  devLoginAllowed,
  isCompanyEmail,
  newSession,
  readSession,
  sessionCookie,
  signSession,
} from "../netlify/functions/lib/auth.mjs";
import { decideAccess } from "../netlify/functions/lib/access.mjs";
import { verifyGoogleIdToken } from "../netlify/functions/lib/google.mjs";
import { createApp } from "../netlify/functions/lib/http.mjs";
import { createMemoryStore } from "../netlify/functions/lib/memory-store.mjs";
import { HttpError } from "../netlify/functions/lib/util.mjs";
import { appWith, call, signIn, testEnv } from "./harness.mjs";

const env = testEnv();

test("HMAC session rejects tampering, expiry, and the wrong secret", () => {
  const token = signSession(
    { email: "sean@movemountains.co", name: "Sean Brown", role: "admin", exp: Date.now() + 60_000 },
    env,
  );
  const session = readSession(token, env);
  assert.equal(session.email, "sean@movemountains.co");
  assert.equal(session.role, "admin");

  const [body, sig] = token.split(".");
  const flipped = (sig[0] === "a" ? "b" : "a") + sig.slice(1);
  assert.equal(readSession(`${body}.${flipped}`, env), null);
  assert.equal(readSession(`${body}x.${sig}`, env), null);
  assert.equal(readSession("not-a-token", env), null);

  const expired = signSession(
    { email: "sean@movemountains.co", name: "Sean", role: "admin", exp: Date.now() - 1000 },
    env,
  );
  assert.equal(readSession(expired, env), null);
  assert.equal(readSession(token, { ...env, SESSION_SECRET: "a-different-secret-value" }), null);
  assert.throws(() => signSession({ email: "a@movemountains.co" }, { SESSION_SECRET: "short" }), HttpError);
});

test("session cookie is HttpOnly and only Secure on https", () => {
  const token = newSession({ email: "sean@movemountains.co", name: "Sean", role: "admin" }, env);
  const secure = sessionCookie(token, { env });
  assert.match(secure, new RegExp(`^${COOKIE}=`));
  assert.match(secure, /HttpOnly/);
  assert.match(secure, /SameSite=Lax/);
  assert.match(secure, /Secure/);
  const local = sessionCookie(token, { env: { ...env, URL: "http://127.0.0.1:8787", CONTEXT: "" } });
  assert.doesNotMatch(local, /Secure/);
  const cleared = sessionCookie(token, { clear: true, env });
  assert.match(cleared, /Max-Age=0/);
});

test("sean@ is always an admin, plus REPORTS_ADMIN_EMAILS", () => {
  assert.deepEqual(adminEmailsFromEnv(""), ["sean@movemountains.co"]);
  assert.deepEqual(adminEmailsFromEnv("ali@movemountains.co, yan@movemountains.co"), [
    "ali@movemountains.co",
    "yan@movemountains.co",
    "sean@movemountains.co",
  ]);
  const ali = decideAccess({
    email: "Ali@movemountains.co",
    emailVerified: true,
    adminEmails: adminEmailsFromEnv("ali@movemountains.co"),
  });
  assert.equal(ali.ok && ali.role, "admin");
  const sean = decideAccess({
    email: "sean@movemountains.co",
    emailVerified: "true",
    adminEmails: adminEmailsFromEnv("ali@movemountains.co"),
  });
  assert.equal(sean.role, "admin");
  const josh = decideAccess({
    email: "ortiz@movemountains.co",
    emailVerified: true,
    adminEmails: adminEmailsFromEnv(""),
  });
  assert.equal(josh.role, "member");
});

test("sign-in is limited to verified @movemountains.co addresses", () => {
  assert.equal(isCompanyEmail("sean@movemountains.co"), true);
  assert.equal(isCompanyEmail("sean@gmail.com"), false);
  const outside = decideAccess({ email: "sean@gmail.com", emailVerified: true, adminEmails: [] });
  assert.equal(outside.ok, false);
  assert.equal(outside.status, 403);
  const unverified = decideAccess({
    email: "sean@movemountains.co",
    emailVerified: false,
    adminEmails: [],
  });
  assert.equal(unverified.ok, false);
  const missing = decideAccess({ email: "", emailVerified: true, adminEmails: [] });
  assert.equal(missing.status, 401);
});

test("dev login is local only", async () => {
  assert.equal(devLoginAllowed(testEnv({ REPORTS_DEV: "1" })), true);
  assert.equal(devLoginAllowed(testEnv({ NETLIFY_DEV: "true" })), true);
  assert.equal(devLoginAllowed(testEnv()), false);
  assert.equal(devLoginAllowed(testEnv({ REPORTS_DEV: "1", CONTEXT: "production" })), false);
  assert.equal(devLoginAllowed(testEnv({ NETLIFY_DEV: "true", CONTEXT: "deploy-preview" })), false);
  assert.equal(devLoginAllowed(testEnv({ REPORTS_DEV: "1", CONTEXT: "branch-deploy" })), false);

  const blocked = appWith({ REPORTS_DEV: "1", CONTEXT: "production" });
  const hidden = await call(blocked.app, "/api/session/dev", {
    method: "POST",
    body: { email: "sean@movemountains.co" },
  });
  assert.equal(hidden.status, 404);

  const { app } = appWith({ REPORTS_DEV: "1" });
  const outsider = await call(app, "/api/session/dev", {
    method: "POST",
    body: { email: "sean@gmail.com", name: "Sean" },
  });
  assert.equal(outsider.status, 403);

  const { res, cookie } = await signIn(app, "ortiz@movemountains.co", "Joshua Ortiz");
  assert.equal(res.status, 200);
  assert.equal(res.json.user.role, "member");
  assert.match(cookie, new RegExp(`^${COOKIE}=`));
  const me = await call(app, "/api/session", { cookie });
  assert.equal(me.json.user.email, "ortiz@movemountains.co");

  const flipped = cookie.replace(/=./, (match) => (match.endsWith("a") ? "=b" : "=a"));
  const tampered = await call(app, "/api/session", { cookie: flipped });
  assert.equal(tampered.json.user, null);
});

test("Google ID token must match the client, the issuer, and a verified company email", async () => {
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const jwk = await exportJWK(publicKey);
  jwk.kid = "test-key";
  jwk.alg = "RS256";
  jwk.use = "sig";
  const jwks = createLocalJWKSet({ keys: [jwk] });
  const clientId = "test-client.apps.googleusercontent.com";

  async function token(claims, { audience = clientId } = {}) {
    return new SignJWT(claims)
      .setProtectedHeader({ alg: "RS256", kid: "test-key" })
      .setIssuer("https://accounts.google.com")
      .setAudience(audience)
      .setSubject(claims.sub || "sub")
      .setExpirationTime("1h")
      .sign(privateKey);
  }

  const good = await token({
    sub: "sean-sub",
    email: "sean@movemountains.co",
    email_verified: true,
    name: "Sean Brown",
  });
  const payload = await verifyGoogleIdToken(good, { clientId, jwks });
  assert.equal(payload.email, "sean@movemountains.co");

  const wrongAudience = await token(
    { email: "sean@movemountains.co", email_verified: true, sub: "x" },
    { audience: "other" },
  );
  await assert.rejects(
    () => verifyGoogleIdToken(wrongAudience, { clientId, jwks }),
    (error) => error instanceof HttpError && error.status === 401,
  );

  const app = createApp({
    store: createMemoryStore(),
    env: testEnv({ REPORTS_ADMIN_EMAILS: "ali@movemountains.co" }),
    jwks,
  });

  const signed = await call(app, "/api/session", { method: "POST", body: { credential: good } });
  assert.equal(signed.status, 200);
  assert.equal(signed.json.user.role, "admin");
  assert.equal(signed.json.user.name, "Sean Brown");
  assert.match(cookieHeader(signed), /HttpOnly/);

  const ali = await call(app, "/api/session", {
    method: "POST",
    body: {
      credential: await token({
        sub: "ali-sub",
        email: "ali@movemountains.co",
        email_verified: true,
        name: "Ali Sherin",
      }),
    },
  });
  assert.equal(ali.json.user.role, "admin");

  const josh = await call(app, "/api/session", {
    method: "POST",
    body: {
      credential: await token({
        sub: "josh-sub",
        email: "ortiz@movemountains.co",
        email_verified: true,
        name: "Joshua Ortiz",
      }),
    },
  });
  assert.equal(josh.json.user.role, "member");

  const refused = await call(app, "/api/session", {
    method: "POST",
    body: {
      credential: await token({
        sub: "gmail-sub",
        email: "sean@gmail.com",
        email_verified: true,
        name: "Sean",
      }),
    },
  });
  assert.equal(refused.status, 403);

  const held = await call(app, "/api/session", {
    method: "POST",
    body: {
      credential: await token({
        sub: "unverified-sub",
        email: "mason@movemountains.co",
        email_verified: false,
        name: "Mason",
      }),
    },
  });
  assert.equal(held.status, 403);
});

function cookieHeader(res) {
  return res.headers.get("set-cookie") || "";
}
