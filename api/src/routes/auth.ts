import { Hono } from "hono";
import { setCookie, deleteCookie } from "hono/cookie";
import { eq, and } from "drizzle-orm";
import { neon } from "@neondatabase/serverless";
import { verifyPassword as verifyCryptoPassword } from "../lib/crypto";
import { generateSessionToken } from "../lib/sso";
import { getDb } from "../lib/db";
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
 *
 * Stratégie : essayer d'abord password_encoded (Base64, via Drizzle ORM)
 * Fallback sur password_encrypted (CryptoJS, via raw SQL) si pas encore migré
 */
auth.post("/login", async (c) => {
  try {
    const body = await c.req.json();
    const validated = LoginSchema.parse(body);

    let user: any = null;
    let isValid = false;

    // Tentative 1 : Drizzle ORM + password_encoded (Base64)
    try {
      const db = getDb(c.env.DATABASE_URL);
      const [dbUser] = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.username, validated.username),
            eq(users.actif, true)
          )
        )
        .limit(1);

      if (dbUser && dbUser.password_encoded) {
        // Vérification Base64
        try {
          const decoded = atob(dbUser.password_encoded);
          isValid = validated.password === decoded;
        } catch {
          isValid = false;
        }
        user = dbUser;
      }
    } catch (drizzleErr) {
      // Drizzle peut échouer si password_encoded n'existe pas encore en DB
      // ou si password_encrypted casse le JSON parsing → fallback raw SQL
      console.log("Drizzle login fallback to raw SQL:", (drizzleErr as Error).message);
    }

    // Tentative 2 (fallback) : Raw SQL + password_encrypted (CryptoJS)
    if (!user || (!isValid && !user.password_encoded)) {
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

      const rawUser = rows?.[0];
      if (rawUser) {
        isValid = verifyCryptoPassword(
          validated.password,
          rawUser.password_encrypted,
          c.env.CRYPTO_SECRET
        );
        user = rawUser;
      }
    }

    if (!user || !isValid) {
      return c.json({ error: "Identifiants invalides" }, 401);
    }

    // Mettre à jour derniere_connexion (non-bloquant)
    const sql = neon(c.env.DATABASE_URL);
    sql`UPDATE referentiel.users SET derniere_connexion = NOW() WHERE id = ${user.id}`
      .catch(() => {});

    // Générer le token de session JWT (7 jours)
    const apps = getUserApps({
      peut_acces_stock: user.peut_acces_stock ?? user.peut_acces_stock,
      peut_acces_prix: user.peut_acces_prix ?? user.peut_acces_prix,
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

    // Set cookie HTTP-only (rétrocompat apps Replit qui utilisent les cookies)
    const isProduction = c.env.NODE_ENV === "production";
    setCookie(c, "auth_session", sessionToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "None" : "Lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    console.log(JSON.stringify({ event: "login_success", user: user.username, ts: Date.now() }));

    // Si returnTo est présent (nouveau flux), rediriger avec le token
    const returnTo = c.req.query("returnTo");
    if (returnTo) {
      const separator = returnTo.includes("?") ? "&" : "?";
      return c.redirect(`${returnTo}${separator}token=${sessionToken}`);
    }

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
 * Récupérer l'utilisateur courant depuis le JWT
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
