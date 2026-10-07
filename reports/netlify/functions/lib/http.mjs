import {
  adminEmailsFromEnv,
  currentUser,
  devLoginAllowed,
  newSession,
  sessionCookie,
} from "./auth.mjs";
import { decideAccess, findPerson, publicUser } from "./access.mjs";
import { verifyGoogleAccessToken, verifyGoogleIdToken } from "./google.mjs";
import {
  applyFilters,
  buildOptions,
  completeBatch,
  getBatch,
  getReport,
  ingestReports,
  presentReport,
  visibleMetas,
} from "./library.mjs";
import { loadOrg } from "./org.mjs";
import { loadTypes } from "./types.mjs";
import { HttpError, apiPath, bearer, json, publicOrigin, readJson, tokensMatch } from "./util.mjs";

const DEV_ACCOUNTS = [
  { email: "sean@movemountains.co", name: "Sean Brown", label: "Sean · Admin" },
  { email: "yan@movemountains.co", name: "Yan Ortiz", label: "Yan · Production" },
  { email: "ali@movemountains.co", name: "Ali Sherin", label: "Ali · Photo editing" },
  { email: "koyla@movemountains.co", name: "Komiljon Sayfiev", label: "Komiljon · Video editing" },
  { email: "kenneth@movemountains.co", name: "Kenneth (Kenny) Barrios", label: "Kenny · Gear & orders" },
  { email: "ortiz@movemountains.co", name: "Joshua Ortiz", label: "Joshua · Shooter" },
  { email: "raul@movemountains.co", name: "Raul Samayoa", label: "Raul · Sales" },
];

function requireIngest(request, env) {
  const expected = env.REPORTS_INGEST_TOKEN || "";
  if (!expected) throw new HttpError(500, "REPORTS_INGEST_TOKEN is not configured.");
  if (!tokensMatch(bearer(request), expected)) throw new HttpError(401, "Unauthorized.");
}

function requireUser(request, env) {
  const user = currentUser(request, env);
  if (!user) throw new HttpError(401, "Sign in to open reports.");
  return user;
}

function filtersFrom(url) {
  return {
    type: url.searchParams.get("type") || "",
    period: url.searchParams.get("period") || "",
    department: url.searchParams.get("department") || "",
    person: url.searchParams.get("person") || "",
    batch: url.searchParams.get("batch") || "",
  };
}

function signedIn(user, org, env, status = 200) {
  const token = newSession(user, env);
  return json({ user: publicUser(user, org) }, status, {
    "set-cookie": sessionCookie(token, { env }),
  });
}

export function createApp({ store, env = process.env, fetchImpl, jwks } = {}) {
  const org = loadOrg();
  const types = loadTypes();

  async function route(request) {
    const { url, path } = apiPath(request);
    const method = request.method.toUpperCase();

    if (method === "GET" && path === "/api/config") {
      const dev = devLoginAllowed(env);
      return json({
        googleClientId: env.GOOGLE_CLIENT_ID || "",
        devLogin: dev,
        devAccounts: dev ? DEV_ACCOUNTS : [],
        domain: "movemountains.co",
      });
    }

    if (path === "/api/session" && method === "GET") {
      const user = currentUser(request, env);
      return json({ user: user ? publicUser(user, org) : null });
    }

    if (path === "/api/session" && method === "DELETE") {
      return json({ user: null }, 200, {
        "set-cookie": sessionCookie("", { clear: true, env }),
      });
    }

    if (path === "/api/session" && method === "POST") {
      const body = await readJson(request);
      let profile;
      if (body.credential) {
        const payload = await verifyGoogleIdToken(body.credential, { env, jwks, fetch: fetchImpl });
        profile = {
          email: payload.email,
          email_verified: payload.email_verified,
          name: payload.name || payload.given_name || "",
        };
      } else if (body.access_token) {
        profile = await verifyGoogleAccessToken(body.access_token, { env, fetch: fetchImpl });
      } else {
        throw new HttpError(400, "Send a Google credential.");
      }
      const decision = decideAccess({
        email: profile.email,
        emailVerified: profile.email_verified,
        adminEmails: adminEmailsFromEnv(env.REPORTS_ADMIN_EMAILS),
      });
      if (!decision.ok) throw new HttpError(decision.status, decision.message);
      const known = findPerson(decision.email, org);
      const user = {
        email: decision.email,
        name: String(profile.name || known?.name || decision.email).trim(),
        role: decision.role,
      };
      return signedIn(user, org, env);
    }

    if (path === "/api/session/dev" && method === "POST") {
      if (!devLoginAllowed(env)) throw new HttpError(404, "Not found.");
      const body = await readJson(request);
      const decision = decideAccess({
        email: body.email,
        emailVerified: true,
        adminEmails: adminEmailsFromEnv(env.REPORTS_ADMIN_EMAILS),
      });
      if (!decision.ok) throw new HttpError(decision.status, decision.message);
      const known = findPerson(decision.email, org);
      const user = {
        email: decision.email,
        name: String(body.name || known?.name || decision.email).trim(),
        role: decision.role,
      };
      return signedIn(user, org, env);
    }

    if (path === "/api/ingest" && method === "POST") {
      requireIngest(request, env);
      const body = await readJson(request);
      const items = Array.isArray(body) ? body : body.reports || body;
      const results = await ingestReports(items, { store, org });
      const origin = publicOrigin(env, request);
      return json({
        ok: true,
        results: results.map((result) => ({ ...result, url: `${origin}/report/${result.id}` })),
      });
    }

    const batchComplete = path.match(/^\/api\/batches\/([^/]+)\/complete$/);
    if (batchComplete && method === "POST") {
      requireIngest(request, env);
      const id = decodeURIComponent(batchComplete[1]);
      const payload = await completeBatch({
        store,
        org,
        types,
        id,
        origin: publicOrigin(env, request),
      });
      return json(payload);
    }

    if (path === "/api/types" && method === "GET") {
      requireUser(request, env);
      return json({
        types: types.map(({ id, label, cadence, group }) => ({ id, label, cadence, group })),
      });
    }

    if (path === "/api/reports" && method === "GET") {
      const user = requireUser(request, env);
      const metas = await visibleMetas(store, user, org);
      const presented = metas.map((meta) => presentReport(meta, org, types));
      const filters = filtersFrom(url);
      return json({
        reports: applyFilters(presented, filters),
        options: buildOptions(presented, types, org),
        catalog: types.map(({ id, label, cadence, group }) => ({ id, label, cadence, group })),
        total: presented.length,
      });
    }

    const reportMatch = path.match(/^\/api\/reports\/([^/]+)$/);
    if (reportMatch && method === "GET") {
      const user = requireUser(request, env);
      const report = await getReport({
        store,
        user,
        org,
        types,
        id: decodeURIComponent(reportMatch[1]),
      });
      if (!report) throw new HttpError(404, "That report is not available.");
      return json({ report });
    }

    const batchMatch = path.match(/^\/api\/batches\/([^/]+)$/);
    if (batchMatch && method === "GET") {
      const user = requireUser(request, env);
      const batch = await getBatch({
        store,
        user,
        org,
        types,
        id: decodeURIComponent(batchMatch[1]).trim().toLowerCase(),
      });
      if (!batch) throw new HttpError(404, "That batch is not available.");
      return json({ batch });
    }

    throw new HttpError(404, "Not found.");
  }

  return {
    async handle(request) {
      try {
        return await route(request);
      } catch (error) {
        if (error instanceof HttpError) return json({ error: error.message }, error.status);
        console.error(error);
        return json({ error: "Something went wrong." }, 500);
      }
    },
  };
}
