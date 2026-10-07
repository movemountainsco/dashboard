import { createApp } from "../netlify/functions/lib/http.mjs";
import { createMemoryStore } from "../netlify/functions/lib/memory-store.mjs";

export function testEnv(extra = {}) {
  return {
    SESSION_SECRET: "test-session-secret-32",
    REPORTS_INGEST_TOKEN: "test-ingest-token",
    GOOGLE_CLIENT_ID: "test-client.apps.googleusercontent.com",
    REPORTS_ADMIN_EMAILS: "",
    REPORTS_PUBLIC_URL: "https://reports.movemountains.co",
    URL: "https://reports.movemountains.co",
    CONTEXT: "",
    NETLIFY_DEV: "",
    REPORTS_DEV: "",
    ...extra,
  };
}

export function appWith(extra = {}, store = createMemoryStore()) {
  const env = testEnv(extra);
  return { env, store, app: createApp({ store, env }) };
}

export async function call(app, path, { method = "GET", body, cookie, token } = {}) {
  const headers = new Headers();
  if (body !== undefined) headers.set("content-type", "application/json");
  if (cookie) headers.set("cookie", cookie);
  if (token) headers.set("authorization", `Bearer ${token}`);
  const request = new Request("https://reports.movemountains.co" + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const response = await app.handle(request);
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: response.status, json, headers: response.headers, text };
}

export function cookiePair(setCookie) {
  return String(setCookie || "").split(";")[0];
}

export async function signIn(app, email, name = "") {
  const res = await call(app, "/api/session/dev", {
    method: "POST",
    body: { email, name },
  });
  return { res, cookie: cookiePair(res.headers.get("set-cookie")) };
}
