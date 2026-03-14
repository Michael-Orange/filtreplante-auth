import { Hono } from "hono";
import { setCookie, deleteCookie, getCookie } from "hono/cookie";
import { eq, and } from "drizzle-orm";
import { neon } from "@neondatabase/serverless";
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

    // Utiliser raw SQL pour éviter les problèmes de JSON parsing du driver Neon HTTP
    // avec les données CryptoJS AES dans password_encrypted
    const sql = neon(c.env.DATABASE_URL);

    let rows;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        rows = await sql`
          SELECT id, username, nom, email, password_encrypted, role, actif,
                 peut_acces_stock, peut_acces_prix, peut_admin_maintenance,
                 peut_acces_construction, peut_acces_shelly
          FROM referentiel.users
          WHERE username = ${validated.username} AND actif = true
          LIMIT 1
        `;
        break;
      } catch (dbErr) {
        if (attempt === 1) throw dbErr;
        await new Promise((r) => setTimeout(r, 300));
      }
    }

    const user = rows?.[0];

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

    // Mettre à jour derniere_connexion (non-bloquant)
    sql`UPDATE referentiel.users SET derniere_connexion = NOW() WHERE id = ${user.id}`
      .catch(() => {});

    // Générer le token de session JWT (7 jours)
    const apps = getUserApps({
      peut_acces_stock: user.peut_acces_stock,
      peut_acces_prix: user.peut_acces_prix,
      peut_admin_maintenance: user.peut_admin_maintenance,
      peut_acces_construction: user.peut_acces_construction,
      peut_acces_shelly: user.peut_acces_shelly,
    });
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
    // SameSite=None requis en production (cross-origin pages.dev → workers.dev)
    const isProduction = c.env.NODE_ENV === "production";
    setCookie(c, "auth_session", sessionToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "None" : "Lax",
      maxAge: 7 * 24 * 60 * 60, // 7 jours
      path: "/",
    });

    console.log(JSON.stringify({ event: "login_success", user: user.username, ts: Date.now() }));

    return c.json({
      success: true,
      token: sessionToken,
      user: {
        id: user.id,
        username: user.username,
        nom: user.nom,
        role: user.role,
        apps,
      },
    });
  } catch (error: any) {
    console.error("Login error:", error?.message, error?.stack);
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
  console.log(JSON.stringify({ event: "logout", ts: Date.now() }));
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
