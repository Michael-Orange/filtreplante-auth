import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "../schema";

// Créer une connexion Drizzle pour Cloudflare Workers avec Neon
export function createDb(databaseUrl: string) {
  const sql = neon(databaseUrl);
  return drizzle(sql, { schema });
}

export type DbClient = ReturnType<typeof createDb>;
