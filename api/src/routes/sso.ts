import { Hono } from "hono";
import { requireAuth } from "../middleware/auth";
import { generateSSOToken } from "../lib/sso";
import { DEFAULT_APPS } from "../config/apps";
import type { SessionPayload } from "../lib/sso";
import type { Env } from "../types/env";

type Variables = {
  user: SessionPayload;
};

const ssoRoute = new Hono<{ Bindings: Env; Variables: Variables }>();

/**
 * GET /api/sso/generate?app=xxx
 * Génère un token SSO pour redirection vers une application
 */
ssoRoute.get("/generate", requireAuth, async (c) => {
  const appId = c.req.query("app");

  if (!appId) {
    return c.json({ error: "Paramètre 'app' requis" }, 400);
  }

  const user = c.get("user");

  // Vérifier que l'utilisateur a accès à cette app
  const hasAccess = user.role === "admin" || user.apps.includes(appId);

  if (!hasAccess) {
    return c.json(
      {
        error: `Vous n'avez pas accès à cette application. Contactez l'administrateur.`,
      },
      403
    );
  }

  // Vérifier que l'app existe
  const targetApp = DEFAULT_APPS.find((a) => a.id === appId);

  if (!targetApp) {
    return c.json({ error: "Application inconnue" }, 404);
  }

  // Générer le token SSO (5 minutes)
  const ssoToken = await generateSSOToken(
    {
      id: user.id,
      username: user.username,
      nom: user.nom,
      role: user.role,
      apps: user.apps,
    },
    appId,
    c.env.JWT_SECRET
  );

  return c.json({
    token: ssoToken,
    redirectUrl: `${targetApp.url}/sso/login`,
  });
});

export default ssoRoute;
