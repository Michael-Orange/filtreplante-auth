import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { getDb } from "../lib/db";
import { encryptPassword, decryptPassword } from "../lib/crypto";
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

/**
 * GET /api/admin/users
 */
adminRoute.get("/users", async (c) => {
  try {
    const db = getDb(c.env.DATABASE_URL);
    const allUsers = await db.select().from(users).orderBy(users.nom);
    const sanitized = allUsers.map(({ password_encrypted, password_encoded, ...rest }) => rest);
    return c.json(sanitized);
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
      .select()
      .from(users)
      .where(eq(users.username, validated.username.toLowerCase().trim()))
      .limit(1);

    if (existing) {
      return c.json({ error: "Ce username existe déjà" }, 409);
    }

    // Dual-write : Base64 + CryptoJS AES
    const encoded = btoa(validated.password);
    const encrypted = encryptPassword(validated.password, c.env.CRYPTO_SECRET);

    const [newUser] = await db
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
      })
      .returning();

    const { password_encrypted, password_encoded, ...sanitized } = newUser;

    return c.json({
      success: true,
      user: sanitized,
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

    const [updated] = await db
      .update(users)
      .set({
        ...validated,
        email: validated.email || null,
        updated_at: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    if (!updated) {
      return c.json({ error: "Utilisateur non trouvé" }, 404);
    }

    const { password_encrypted, password_encoded, ...sanitized } = updated;

    return c.json({ success: true, user: sanitized });
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
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

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
 * Lire le mot de passe — priorité Base64, fallback CryptoJS
 */
adminRoute.get("/users/:id/password", async (c) => {
  try {
    const userId = parseInt(c.req.param("id"));
    const db = getDb(c.env.DATABASE_URL);

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!user) {
      return c.json({ error: "Utilisateur non trouvé" }, 404);
    }

    let password: string;
    if (user.password_encoded) {
      password = atob(user.password_encoded);
    } else {
      password = decryptPassword(user.password_encrypted, c.env.CRYPTO_SECRET);
    }

    return c.json({ password });
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

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

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
