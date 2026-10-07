import { createRemoteJWKSet, jwtVerify } from "jose";
import { HttpError } from "./util.mjs";

const GOOGLE_CERTS = "https://www.googleapis.com/oauth2/v3/certs";
const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];
const TOKENINFO = "https://oauth2.googleapis.com/tokeninfo";
const USERINFO = "https://openidconnect.googleapis.com/v1/userinfo";

function emailIsVerified(value) {
  return value === true || value === "true";
}

function clientIdFrom(options) {
  return options.clientId ?? options.env?.GOOGLE_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID ?? "";
}

let remoteJwks;

function googleJwks() {
  if (!remoteJwks) remoteJwks = createRemoteJWKSet(new URL(GOOGLE_CERTS));
  return remoteJwks;
}

/**
 * Verify a Google Identity Services ID token.
 * Signature is checked against Google's JWKS (or `jwks` in tests).
 * `aud` must equal GOOGLE_CLIENT_ID, `iss` must be Google, and `exp` must be current.
 */
export async function verifyGoogleIdToken(idToken, options = {}) {
  const clientId = clientIdFrom(options);
  if (!clientId) throw new HttpError(500, "Google sign-in is not configured.");
  const token = String(idToken || "").trim();
  if (!token) throw new HttpError(401, "That Google sign-in could not be verified.");

  try {
    const { payload } = await jwtVerify(token, options.jwks || googleJwks(), {
      issuer: GOOGLE_ISSUERS,
      audience: clientId,
    });
    return payload;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(401, "That Google sign-in could not be verified.");
  }
}

/**
 * Verify a Google OAuth access token from the GIS token client (popup).
 * Calls tokeninfo, requires aud/azp = GOOGLE_CLIENT_ID, a future exp, and
 * email_verified. Name comes from tokeninfo or the OpenID userinfo endpoint.
 */
export async function verifyGoogleAccessToken(accessToken, options = {}) {
  const clientId = clientIdFrom(options);
  if (!clientId) throw new HttpError(500, "Google sign-in is not configured.");
  const token = String(accessToken || "").trim();
  if (!token) throw new HttpError(401, "That Google sign-in could not be verified.");

  const fetchImpl = options.fetch || globalThis.fetch;
  const now = options.now ?? Math.floor(Date.now() / 1000);
  let info;
  try {
    const response = await fetchImpl(`${TOKENINFO}?access_token=${encodeURIComponent(token)}`);
    if (!response.ok) throw new HttpError(401, "That Google sign-in could not be verified.");
    info = await response.json();
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(401, "That Google sign-in could not be verified.");
  }
  if (!info || typeof info !== "object") {
    throw new HttpError(401, "That Google sign-in could not be verified.");
  }

  const aud = info.aud ? String(info.aud) : "";
  const azp = info.azp ? String(info.azp) : "";
  if ((!aud && !azp) || (aud && aud !== clientId) || (azp && azp !== clientId)) {
    throw new HttpError(401, "That Google sign-in could not be verified.");
  }

  const exp = Number(info.exp);
  if (Number.isFinite(exp)) {
    if (exp <= now) throw new HttpError(401, "That Google sign-in could not be verified.");
  } else if (!(Number(info.expires_in) > 0)) {
    throw new HttpError(401, "That Google sign-in could not be verified.");
  }

  if (!emailIsVerified(info.email_verified)) {
    throw new HttpError(401, "That Google account has not verified its email.");
  }

  let email = String(info.email || "").trim();
  let name = String(info.name || "").trim();
  let sub = String(info.sub || "").trim();
  if (!email || !name || !sub) {
    try {
      const response = await fetchImpl(USERINFO, {
        headers: { authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const profile = await response.json();
        email = email || String(profile.email || "").trim();
        name = name || String(profile.name || "").trim();
        sub = sub || String(profile.sub || "").trim();
      }
    } catch (error) {
      if (error instanceof HttpError) throw error;
    }
  }
  if (!email || !sub) throw new HttpError(401, "That Google sign-in could not be verified.");

  return { sub, email, email_verified: true, name };
}
