import { Hono } from "hono";
import { setCookie, deleteCookie, getCookie } from "hono/cookie";
import { eq, and } from "drizzle-orm";
import { createDb } from "../lib/db";
import { verifyPassword } from "../lib/crypto";
import { generateSessionToken, verifyToken } from "../lib/sso";
import { users, getUserApps } from "../schema";
import { LoginSchema } from "../validators/auth";
import { requireAuth } from "../middleware/auth";
import type { Env } from "../types/env";

type Variables = {
  user: any;
};

const auth = new Hono<{ Bindings: Env; Variables: Variables }>();

/**
 * POST /api/auth/login
 * Authentification avec username/password
 */
auth.post("/login", async (c) => {
  try {
    const body = await c.req.json();
    const validated = LoginSchema.parse(body);

    const db = createDb(c.env.DATABASE_URL);

    // Récupérer l'utilisateur
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.username, validated.username), eq(users.actif, true)))
      .limit(1);

    if (!user) {
      return c.json({ error: "Identifiants invalides" }, 401);
    }

    // Vérifier le mot de passe avec CryptoJS
    const isValid = verifyPassword(
      validated.password,
      user.password_encrypted,
      c.env.CRYPTO_SECRET
    );

    if (!isValid) {
      return c.json({ error: "Identifiants invalides" }, 401);
    }

    // Mettre à jour derniere_connexion
    await db
      .update(users)
      .set({ derniere_connexion: new Date() })
      .where(eq(users.id, user.id));

    // Générer le token de session JWT (7 jours)
    const apps = getUserApps(user);
    const sessionToken = await generateSessionToken(
      {
        id: user.id,
        username: user.username,
        nom: user.nom,
        role: user.role,
        apps,
      },
      c.env.JWT_SECRET
    );

    // Set cookie HTTP-only
    setCookie(c, "auth_session", sessionToken, {
      httpOnly: true,
      secure: c.env.NODE_ENV === "production",
      sameSite: "Lax",
      maxAge: 7 * 24 * 60 * 60, // 7 jours
      path: "/",
    });

    return c.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        nom: user.nom,
        role: user.role,
        apps,
      },
    });
  } catch (error: any) {
    console.error("Login error:", error);
    if (error.name === "ZodError") {
      return c.json({ error: "Données invalides", details: error.errors }, 400);
    }
    return c.json({ error: "Erreur serveur" }, 500);
  }
});

/**
 * GET /api/auth/me
 * Récupérer l'utilisateur courant depuis le cookie
 */
auth.get("/me", requireAuth, async (c) => {
  const user = c.get("user");
  return c.json(user);
});

/**
 * POST /api/auth/logout
 * Déconnexion (supprime le cookie)
 */
auth.post("/logout", (c) => {
  deleteCookie(c, "auth_session");
  return c.json({ success: true });
});

/**
 * GET /api/auth/logout?returnUrl=xxx
 * Déconnexion avec redirection
 */
auth.get("/logout", (c) => {
  const returnUrl = c.req.query("returnUrl");
  deleteCookie(c, "auth_session");
  
  if (returnUrl) {
    return c.redirect(returnUrl);
  }
  
  return c.json({ success: true });
});

export default auth;
