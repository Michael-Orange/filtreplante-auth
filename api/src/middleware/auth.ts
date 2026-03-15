import { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import { verifyToken, type SessionPayload } from "../lib/sso";
import type { Env } from "../types/env";

type Variables = {
  user: SessionPayload;
};

/**
 * Middleware d'authentification
 * Vérifie le cookie auth_session OU le header Authorization: Bearer
 * (fallback nécessaire car les cookies cross-site sont bloqués par les navigateurs modernes)
 */
export async function requireAuth(c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) {
  let token = getCookie(c, "auth_session");
  if (!token) {
    const authHeader = c.req.header("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.slice(7);
    }
  }

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
