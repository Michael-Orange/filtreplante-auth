import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { neon } from "@neondatabase/serverless";
import { getDb } from "../lib/db";
import { encryptPassword } from "../lib/crypto";
import { users } from "../schema";
import { requireAuth } from "../middleware/auth";
import { requireAdmin } from "../middleware/admin";
import { CreateUserSchema, UpdateUserSchema, ChangePasswordSchema } from "../validators/users";
import type { SessionPayload } from "../lib/sso";
import type { Env } from "../types/env";

type Variables = {
  user: SessionPayload;
};

const adminRoute = new Hono<{ Bindings: Env; Variables: Variables }>();

adminRoute.use("/*", requireAuth, requireAdmin);

// Colonnes safe pour Drizzle (exclut password_encrypted qui casse le JSON parsing Neon)
const safeColumns = {
  id: users.id,
  username: users.username,
  nom: users.nom,
  email: users.email,
  password_encoded: users.password_encoded,
  role: users.role,
  actif: users.actif,
  peut_acces_stock: users.peut_acces_stock,
  peut_acces_prix: users.peut_acces_prix,
  peut_admin_maintenance: users.peut_admin_maintenance,
  peut_acces_construction: users.peut_acces_construction,
  peut_acces_shelly: users.peut_acces_shelly,
  date_creation: users.date_creation,
  derniere_connexion: users.derniere_connexion,
  created_by: users.created_by,
  updated_at: users.updated_at,
} as const;

// Colonnes publiques (sans passwords)
const publicColumns = {
  id: users.id,
  username: users.username,
  nom: users.nom,
  email: users.email,
  role: users.role,
  actif: users.actif,
  peut_acces_stock: users.peut_acces_stock,
  peut_acces_prix: users.peut_acces_prix,
  peut_admin_maintenance: users.peut_admin_maintenance,
  peut_acces_construction: users.peut_acces_construction,
  peut_acces_shelly: users.peut_acces_shelly,
  date_creation: users.date_creation,
  derniere_connexion: users.derniere_connexion,
  created_by: users.created_by,
  updated_at: users.updated_at,
} as const;

/**
 * GET /api/admin/users
 */
adminRoute.get("/users", async (c) => {
  try {
    const db = getDb(c.env.DATABASE_URL);
    const allUsers = await db.select(publicColumns).from(users).orderBy(users.nom);
    return c.json(allUsers);
  } catch (error) {
    console.error("Error fetching all users:", error);
    return c.json({ error: "Erreur serveur" }, 500);
  }
});

/**
 * POST /api/admin/users
 * Dual-write : écrit dans password_encoded (Base64) ET password_encrypted (CryptoJS)
 */
adminRoute.post("/users", async (c) => {
  try {
    const body = await c.req.json();
    const validated = CreateUserSchema.parse(body);

    const db = getDb(c.env.DATABASE_URL);
    const currentUser = c.get("user");

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, validated.username.toLowerCase().trim()))
      .limit(1);

    if (existing) {
      return c.json({ error: "Ce username existe déjà" }, 409);
    }

    // Dual-write : Base64 + CryptoJS AES
    const encoded = btoa(validated.password);
    const encrypted = encryptPassword(validated.password, c.env.CRYPTO_SECRET);

    // INSERT puis re-select les colonnes safe (évite .returning() qui inclut password_encrypted)
    await db
      .insert(users)
      .values({
        username: validated.username.toLowerCase().trim(),
        nom: validated.nom,
        email: validated.email || null,
        password_encrypted: encrypted,
        password_encoded: encoded,
        role: validated.role,
        actif: validated.actif,
        peut_acces_stock: validated.peut_acces_stock,
        peut_acces_prix: validated.peut_acces_prix,
        peut_admin_maintenance: validated.peut_admin_maintenance,
        peut_acces_construction: validated.peut_acces_construction,
        peut_acces_shelly: validated.peut_acces_shelly,
        created_by: currentUser.username,
      });

    const [newUser] = await db
      .select(publicColumns)
      .from(users)
      .where(eq(users.username, validated.username.toLowerCase().trim()))
      .limit(1);

    return c.json({
      success: true,
      user: newUser,
      password: validated.password,
    });
  } catch (error: any) {
    console.error("Error creating user:", error);
    if (error.name === "ZodError") {
      return c.json({ error: "Données invalides", details: error.errors }, 400);
    }
    return c.json({ error: "Erreur serveur" }, 500);
  }
});

/**
 * PATCH /api/admin/users/:id
 */
adminRoute.patch("/users/:id", async (c) => {
  try {
    const userId = parseInt(c.req.param("id"));
    const body = await c.req.json();
    const validated = UpdateUserSchema.parse(body);

    const db = getDb(c.env.DATABASE_URL);
    const currentUser = c.get("user");

    if (currentUser.id === userId) {
      if (validated.role && validated.role !== "admin") {
        return c.json({ error: "Vous ne pouvez pas vous retirer le rôle admin" }, 400);
      }
      if (validated.actif === false) {
        return c.json({ error: "Vous ne pouvez pas désactiver votre propre compte" }, 400);
      }
    }

    // UPDATE puis re-select (évite .returning() qui inclut password_encrypted)
    await db
      .update(users)
      .set({
        ...validated,
        email: validated.email || null,
        updated_at: new Date(),
      })
      .where(eq(users.id, userId));

    const [updated] = await db
      .select(publicColumns)
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!updated) {
      return c.json({ error: "Utilisateur non trouvé" }, 404);
    }

    return c.json({ success: true, user: updated });
  } catch (error: any) {
    console.error("Error updating user:", error);
    if (error.name === "ZodError") {
      return c.json({ error: "Données invalides", details: error.errors }, 400);
    }
    return c.json({ error: "Erreur serveur" }, 500);
  }
});

/**
 * DELETE /api/admin/users/:id
 */
adminRoute.delete("/users/:id", async (c) => {
  try {
    const userId = parseInt(c.req.param("id"));
    const currentUser = c.get("user");

    if (currentUser.id === userId) {
      return c.json({ error: "Vous ne pouvez pas supprimer votre propre compte" }, 400);
    }

    const db = getDb(c.env.DATABASE_URL);
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return c.json({ error: "Utilisateur non trouvé" }, 404);
    }

    await db.delete(users).where(eq(users.id, userId));
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return c.json({ error: "Erreur serveur" }, 500);
  }
});

/**
 * GET /api/admin/users/:id/password
 * Lire le mot de passe — priorité Base64, fallback CryptoJS via raw SQL
 */
adminRoute.get("/users/:id/password", async (c) => {
  try {
    const userId = parseInt(c.req.param("id"));
    const db = getDb(c.env.DATABASE_URL);

    // D'abord essayer Base64 via Drizzle (safe)
    const [user] = await db
      .select({ id: users.id, password_encoded: users.password_encoded })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return c.json({ error: "Utilisateur non trouvé" }, 404);
    }

    if (user.password_encoded) {
      return c.json({ password: atob(user.password_encoded) });
    }

    // Fallback CryptoJS via raw SQL (évite Drizzle qui crashe sur password_encrypted)
    const sql = neon(c.env.DATABASE_URL);
    const rows = await sql`
      SELECT password_encrypted FROM referentiel.users WHERE id = ${userId} LIMIT 1
    `;
    if (rows[0]?.password_encrypted) {
      const { decryptPassword } = await import("../lib/crypto");
      return c.json({ password: decryptPassword(rows[0].password_encrypted, c.env.CRYPTO_SECRET) });
    }

    return c.json({ error: "Mot de passe non trouvé" }, 404);
  } catch (error) {
    console.error("Error decrypting password:", error);
    return c.json({ error: "Erreur serveur" }, 500);
  }
});

/**
 * POST /api/admin/users/:id/password
 * Dual-write : écrit dans les DEUX colonnes
 */
adminRoute.post("/users/:id/password", async (c) => {
  try {
    const userId = parseInt(c.req.param("id"));
    const body = await c.req.json();
    const validated = ChangePasswordSchema.parse(body);

    const db = getDb(c.env.DATABASE_URL);

    // Vérifier existence sans charger password_encrypted
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return c.json({ error: "Utilisateur non trouvé" }, 404);
    }

    const encoded = btoa(validated.password);
    const encrypted = encryptPassword(validated.password, c.env.CRYPTO_SECRET);

    await db
      .update(users)
      .set({
        password_encrypted: encrypted,
        password_encoded: encoded,
        updated_at: new Date(),
      })
      .where(eq(users.id, userId));

    return c.json({ success: true });
  } catch (error: any) {
    console.error("Error updating password:", error);
    if (error.name === "ZodError") {
      return c.json({ error: "Données invalides", details: error.errors }, 400);
    }
    return c.json({ error: "Erreur serveur" }, 500);
  }
});

export default adminRoute;
