import { pgTable, pgSchema, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";

// Schema PostgreSQL existant
export const referentiel = pgSchema("referentiel");

// Table users existante (REFLECT - ne pas créer)
export const users = referentiel.table("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  nom: text("nom").notNull(),
  email: text("email"),
  password_encrypted: text("password_encrypted").notNull(),
  password_encoded: text("password_encoded"), // Base64 — nouvelles apps CF Workers
  role: text("role").notNull().default("user"),
  actif: boolean("actif").notNull().default(true),
  
  // Permissions par application
  peut_acces_stock: boolean("peut_acces_stock").notNull().default(false),
  peut_acces_prix: boolean("peut_acces_prix").notNull().default(false),
  peut_admin_maintenance: boolean("peut_admin_maintenance").default(false),
  peut_acces_construction: boolean("peut_acces_construction").default(false),
  peut_acces_shelly: boolean("peut_acces_shelly").default(false),
  
  // Métadonnées
  date_creation: timestamp("date_creation").notNull().defaultNow(),
  derniere_connexion: timestamp("derniere_connexion"),
  created_by: text("created_by"),
  updated_at: timestamp("updated_at").defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
