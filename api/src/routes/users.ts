import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { createDb } from "../lib/db";
import { users } from "../schema";
import type { Env } from "../types/env";

const usersRoute = new Hono<{ Bindings: Env }>();

/**
 * GET /api/auth/users
 * Liste des utilisateurs actifs (pour dropdown login)
 * Route publique
 */
usersRoute.get("/", async (c) => {
  try {
    const db = createDb(c.env.DATABASE_URL);

    const activeUsers = await db
      .select({
        username: users.username,
        nom: users.nom,
      })
      .from(users)
      .where(eq(users.actif, true))
      .orderBy(users.nom);

    return c.json(activeUsers);
  } catch (error) {
    console.error("Error fetching users:", error);
    return c.json({ error: "Erreur serveur" }, 500);
  }
});

export default usersRoute;
