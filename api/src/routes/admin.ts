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

// Appliquer les middlewares auth + admin à toutes les routes
adminRoute.use("/*", requireAuth, requireAdmin);

/**
 * GET /api/admin/users
 * Liste tous les utilisateurs (avec permissions)
 */
adminRoute.get("/users", async (c) => {
  try {
    const db = getDb(c.env.DATABASE_URL);

    const allUsers = await db.select().from(users).orderBy(users.nom);

    // Retirer password_encrypted de la réponse
    const sanitized = allUsers.map(({ password_encrypted, ...rest }) => rest);

    return c.json(sanitized);
  } catch (error) {
    console.error("Error fetching all users:", error);
    return c.json({ error: "Erreur serveur" }, 500);
  }
});

/**
 * POST /api/admin/users
 * Créer un nouvel utilisateur
 */
adminRoute.post("/users", async (c) => {
  try {
    const body = await c.req.json();
    const validated = CreateUserSchema.parse(body);

    const db = getDb(c.env.DATABASE_URL);
    const currentUser = c.get("user");

    // Vérifier si le username existe déjà
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.username, validated.username.toLowerCase().trim()))
      .limit(1);

    if (existing) {
      return c.json({ error: "Ce username existe déjà" }, 409);
    }

    // Chiffrer le mot de passe
    const encrypted = encryptPassword(validated.password, c.env.CRYPTO_SECRET);

    // Créer l'utilisateur
    const [newUser] = await db
      .insert(users)
      .values({
        username: validated.username.toLowerCase().trim(),
        nom: validated.nom,
        email: validated.email || null,
        password_encrypted: encrypted,
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

    const { password_encrypted, ...sanitized } = newUser;

    return c.json({
      success: true,
      user: sanitized,
      password: validated.password, // Retourner le password en clair pour l'admin
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
 * Modifier un utilisateur
 */
adminRoute.patch("/users/:id", async (c) => {
  try {
    const userId = parseInt(c.req.param("id"));
    const body = await c.req.json();
    const validated = UpdateUserSchema.parse(body);

    const db = getDb(c.env.DATABASE_URL);
    const currentUser = c.get("user");

    // Protection : admin ne peut pas se modifier lui-même de manière dangereuse
    if (currentUser.id === userId) {
      if (validated.role && validated.role !== "admin") {
        return c.json({ error: "Vous ne pouvez pas vous retirer le rôle admin" }, 400);
      }
      if (validated.actif === false) {
        return c.json({ error: "Vous ne pouvez pas désactiver votre propre compte" }, 400);
      }
    }

    // Mettre à jour l'utilisateur
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

    const { password_encrypted, ...sanitized } = updated;

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
 * Supprimer un utilisateur
 */
adminRoute.delete("/users/:id", async (c) => {
  try {
    const userId = parseInt(c.req.param("id"));
    const currentUser = c.get("user");

    // Protection : admin ne peut pas se supprimer lui-même
    if (currentUser.id === userId) {
      return c.json({ error: "Vous ne pouvez pas supprimer votre propre compte" }, 400);
    }

    const db = getDb(c.env.DATABASE_URL);

    // Vérifier que l'utilisateur existe
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!user) {
      return c.json({ error: "Utilisateur non trouvé" }, 404);
    }

    // Supprimer l'utilisateur
    await db.delete(users).where(eq(users.id, userId));

    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return c.json({ error: "Erreur serveur" }, 500);
  }
});

/**
 * GET /api/admin/users/:id/password
 * Récupérer le mot de passe déchiffré d'un utilisateur
 */
adminRoute.get("/users/:id/password", async (c) => {
  try {
    const userId = parseInt(c.req.param("id"));
    const db = getDb(c.env.DATABASE_URL);

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!user) {
      return c.json({ error: "Utilisateur non trouvé" }, 404);
    }

    // Déchiffrer le mot de passe
    const decrypted = decryptPassword(user.password_encrypted, c.env.CRYPTO_SECRET);

    return c.json({ password: decrypted });
  } catch (error) {
    console.error("Error decrypting password:", error);
    return c.json({ error: "Erreur serveur" }, 500);
  }
});

/**
 * POST /api/admin/users/:id/password
 * Changer le mot de passe d'un utilisateur
 */
adminRoute.post("/users/:id/password", async (c) => {
  try {
    const userId = parseInt(c.req.param("id"));
    const body = await c.req.json();
    const validated = ChangePasswordSchema.parse(body);

    const db = getDb(c.env.DATABASE_URL);

    // Vérifier que l'utilisateur existe
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!user) {
      return c.json({ error: "Utilisateur non trouvé" }, 404);
    }

    // Chiffrer le nouveau mot de passe
    const encrypted = encryptPassword(validated.password, c.env.CRYPTO_SECRET);

    // Mettre à jour
    await db
      .update(users)
      .set({ password_encrypted: encrypted, updated_at: new Date() })
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
