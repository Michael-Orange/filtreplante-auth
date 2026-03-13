import { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import { verifyToken, type SessionPayload } from "../lib/sso";
import type { Env } from "../types/env";

type Variables = {
  user: SessionPayload;
};

/**
 * Middleware d'authentification
 * Vérifie le cookie auth_session et injecte l'utilisateur dans le contexte
 */
export async function requireAuth(c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) {
  const token = getCookie(c, "auth_session");
  
  if (!token) {
    return c.json({ error: "Non authentifié" }, 401);
  }

  const payload = await verifyToken(token, c.env.JWT_SECRET);
  
  if (!payload || payload.type !== "session") {
    return c.json({ error: "Session invalide" }, 401);
  }

  // Injecter l'utilisateur dans le contexte
  c.set("user", payload as SessionPayload);
  
  await next();
}
