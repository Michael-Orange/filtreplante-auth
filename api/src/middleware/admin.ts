import { Context, Next } from "hono";
import type { SessionPayload } from "../lib/sso";
import type { Env } from "../types/env";

type Variables = {
  user: SessionPayload;
};

/**
 * Middleware admin
 * Vérifie que l'utilisateur a le rôle admin
 * ⚠️ Doit être utilisé APRÈS requireAuth
 */
export async function requireAdmin(c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) {
  const user = c.get("user");
  
  if (user.role !== "admin") {
    return c.json({ error: "Accès refusé : droits administrateur requis" }, 403);
  }
  
  await next();
}
