import { createHash, timingSafeEqual } from "node:crypto";

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

export function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...extra,
    },
  });
}

export function slug(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function cleanEmail(value) {
  return String(value || "").trim().toLowerCase();
}

/** Compare secrets without leaking which one matched, including on length. */
export function tokensMatch(got, expected) {
  if (!expected || !got) return false;
  const a = createHash("sha256").update(String(got)).digest();
  const b = createHash("sha256").update(String(expected)).digest();
  return timingSafeEqual(a, b);
}

export function bearer(request) {
  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(\S+)\s*$/i);
  return match ? match[1] : "";
}

export async function readJson(request) {
  let text = "";
  try {
    text = await request.text();
  } catch {
    throw new HttpError(400, "Request body could not be read.");
  }
  if (!text.trim()) throw new HttpError(400, "Request body is empty.");
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "Request body must be JSON.");
  }
}

export function publicOrigin(env = process.env, request) {
  const configured = String(env.REPORTS_PUBLIC_URL || env.URL || "").trim();
  if (configured) return configured.replace(/\/$/, "");
  if (request) {
    try {
      return new URL(request.url).origin;
    } catch {
      /* fall through */
    }
  }
  return "https://reports.movemountains.co";
}

export function apiPath(request) {
  const url = new URL(request.url);
  let path = url.pathname;
  const marker = "/.netlify/functions/api";
  const at = path.indexOf(marker);
  if (at !== -1) path = "/api" + path.slice(at + marker.length);
  path = path.replace(/\/+$/, "") || "/";
  return { url, path };
}
