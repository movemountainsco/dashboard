import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./netlify/functions/lib/http.mjs";
import { createMemoryStore } from "./netlify/functions/lib/memory-store.mjs";
import { seedIfEmpty } from "./netlify/functions/lib/seed.mjs";

const root = fileURLToPath(new URL(".", import.meta.url));
const publicDir = join(root, "public");
const port = Number(process.env.PORT || 8787);

process.env.SESSION_SECRET ||= "local-dev-session-secret";
process.env.REPORTS_INGEST_TOKEN ||= "local-dev-ingest-token";
process.env.REPORTS_DEV = "1";
process.env.URL = `http://127.0.0.1:${port}`;
delete process.env.CONTEXT;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".txt": "text/plain; charset=utf-8",
  ".ico": "image/x-icon",
};

const store = createMemoryStore();
const app = createApp({ store, env: process.env });
await seedIfEmpty(store, process.env);

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

async function serveStatic(pathname) {
  const safe = normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  const candidate = join(publicDir, safe);
  if (!candidate.startsWith(publicDir)) return null;
  try {
    const data = await readFile(candidate);
    return { data, type: MIME[extname(candidate)] || "application/octet-stream" };
  } catch {
    return null;
  }
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://127.0.0.1:${port}`);
    if (url.pathname.startsWith("/api/")) {
      const body = req.method === "GET" || req.method === "HEAD" ? undefined : await readBody(req);
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (value == null) continue;
        if (Array.isArray(value)) {
          for (const item of value) headers.append(key, item);
        } else headers.set(key, value);
      }
      const request = new Request(url, { method: req.method, headers, body });
      const response = await app.handle(request);
      res.statusCode = response.status;
      const cookies =
        typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
      response.headers.forEach((value, key) => {
        if (key.toLowerCase() === "set-cookie") return;
        res.setHeader(key, value);
      });
      if (cookies.length) res.setHeader("set-cookie", cookies);
      res.end(Buffer.from(await response.arrayBuffer()));
      return;
    }

    const asset = url.pathname.includes(".") ? await serveStatic(url.pathname) : null;
    const file = asset || (await serveStatic("/index.html"));
    if (!file) {
      res.statusCode = 404;
      res.end("Not found");
      return;
    }
    res.statusCode = 200;
    res.setHeader("content-type", file.type);
    res.setHeader("cache-control", "no-cache");
    res.end(file.data);
  } catch (error) {
    console.error(error);
    res.statusCode = 500;
    res.end("Something went wrong.");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`MMC Reports  http://127.0.0.1:${port}`);
  console.log("Dev sign-in is on. Ingest token: local-dev-ingest-token");
});
