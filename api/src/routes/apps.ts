import { Hono } from "hono";
import { requireAuth } from "../middleware/auth";
import { DEFAULT_APPS, FACTURES_USER_LINKS } from "../config/apps";
import type { SessionPayload } from "../lib/sso";
import type { Env } from "../types/env";

type Variables = {
  user: SessionPayload;
};

const appsRoute = new Hono<{ Bindings: Env; Variables: Variables }>();

/**
 * GET /api/apps
 * Retourne les applications accessibles pour l'utilisateur courant
 */
appsRoute.get("/", requireAuth, async (c) => {
  const user = c.get("user");

  // Apps accessibles à tous
  const APPS_FOR_ALL = ["maintenance"];

  // Users spéciaux pour Shelly
  const SHELLY_USERS = ["michael", "marine", "fatou", "moussa"];

  // Filtrer les apps selon les permissions
  let userApps = DEFAULT_APPS.filter((app) => {
    // Admin a accès à tout
    if (user.role === "admin") return true;

    // Apps publiques
    if (app.publicAccess || APPS_FOR_ALL.includes(app.id)) return true;

    // Apps avec permission spécifique
    if (app.requiresPermission && user.apps.includes(app.id)) return true;

    // Shelly pour users spéciaux
    if (app.id === "shelly" && SHELLY_USERS.includes(user.username)) return true;

    return false;
  });

  // Personnaliser l'URL de Factures selon l'utilisateur
  userApps = userApps.map((app) => {
    if (app.id === "factures" && FACTURES_USER_LINKS[user.username]) {
      return { ...app, url: FACTURES_USER_LINKS[user.username] };
    }
    return app;
  });

  // Ajouter Factures si l'utilisateur a un lien personnalisé mais pas encore dans la liste
  const hasFactures = userApps.some((a) => a.id === "factures");
  const facturesLink = FACTURES_USER_LINKS[user.username];
  if (!hasFactures && facturesLink) {
    const facturesApp = DEFAULT_APPS.find((a) => a.id === "factures");
    if (facturesApp) {
      userApps.push({ ...facturesApp, url: facturesLink });
    }
  }

  return c.json(userApps);
});

export default appsRoute;
