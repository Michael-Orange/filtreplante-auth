import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "../schema";

// Singleton — réutilise la connexion dans le même isolat Worker
let _db: ReturnType<typeof drizzle> | null = null;
let _dbUrl: string | null = null;

export function getDb(databaseUrl: string) {
  if (!_db || _dbUrl !== databaseUrl) {
    _db = drizzle(neon(databaseUrl), { schema });
    _dbUrl = databaseUrl;
  }
  return _db;
}

export type DbClient = ReturnType<typeof getDb>;
