// User types
export interface User {
  id: number;
  username: string;
  nom: string;
  email: string | null;
  password_encrypted: string;
  role: string;
  actif: boolean;
  peut_acces_stock: boolean;
  peut_acces_prix: boolean;
  peut_admin_maintenance: boolean;
  peut_acces_construction: boolean;
  peut_acces_shelly: boolean;
  date_creation: Date;
  derniere_connexion: Date | null;
  created_by: string | null;
  updated_at: Date | null;
}

export interface AuthUser {
  id: number;
  username: string;
  nom: string;
  role: string;
  apps: string[];
}

export type UserRole = "admin" | "user";
