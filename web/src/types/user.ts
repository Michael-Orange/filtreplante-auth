// User session (depuis JWT /api/auth/me)
export interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  active: boolean;
  permissions: {
    stock: boolean;
    prix: boolean;
    maintenance: boolean;
    construction: boolean;
    shelly: boolean;
  };
  lastLogin?: string;
  createdAt: string;
}

// User brut depuis l'API admin (champs DB)
export interface DbUser {
  id: number;
  username: string;
  nom: string;
  email: string | null;
  role: string;
  actif: boolean;
  peut_acces_stock: boolean;
  peut_acces_prix: boolean;
  peut_admin_maintenance: boolean;
  peut_acces_construction: boolean;
  peut_acces_shelly: boolean;
  date_creation: string;
  derniere_connexion: string | null;
  created_by: string | null;
  updated_at: string;
}

// User JWT brut (depuis /api/auth/me)
export interface JwtUser {
  id: number;
  username: string;
  nom: string;
  role: string;
  apps: string[];
  type: string;
}

export interface AppInfo {
  id: string;
  name: string;
  description?: string;
  icon: string;
  url: string;
  directLink?: boolean;
  requiresPermission?: string;
}

export interface PublicUser {
  username: string;
  nom: string;
}
