import { SignJWT, jwtVerify } from "jose";

/**
 * JWT avec jose (compatible Cloudflare Workers)
 * ⚠️ IMPORTANT : Toutes les fonctions sont async (contrairement à jsonwebtoken)
 */

export interface BasePayload {
  id: number;
  username: string;
  nom: string;
  role: string;
  apps: string[];
}

export interface SessionPayload extends BasePayload {
  type: "session";
}

export interface SSOPayload extends BasePayload {
  type: "sso";
  targetApp: string;
  peut_acces_shelly: boolean;
}

function getSecretKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

/**
 * Génère un token de session JWT (7 jours)
 */
export async function generateSessionToken(
  user: Omit<SessionPayload, "type">,
  secret: string
): Promise<string> {
  return new SignJWT({ ...user, type: "session" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecretKey(secret));
}

/**
 * Génère un token SSO JWT (5 minutes)
 */
export async function generateSSOToken(
  user: Omit<SessionPayload, "type">,
  targetApp: string,
  secret: string
): Promise<string> {
  return new SignJWT({
    ...user,
    type: "sso",
    targetApp,
    peut_acces_shelly: user.apps.includes("shelly-admin"),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(getSecretKey(secret));
}

/**
 * Vérifie et décode un token JWT
 */
export async function verifyToken(
  token: string,
  secret: string
): Promise<SessionPayload | SSOPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(secret));
    return payload as unknown as SessionPayload | SSOPayload;
  } catch {
    return null;
  }
}
