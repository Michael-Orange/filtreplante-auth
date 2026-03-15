import type {
  LoginResponse,
  MeResponse,
  PublicUsersResponse,
  AppsResponse,
  SSOResponse,
  UsersResponse,
  UserResponse,
  PasswordResponse
} from '../types/api';

const API_URL = import.meta.env.VITE_API_URL || '';
const TOKEN_KEY = 'auth_session_token';

function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function storeToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function authHeaders(): Record<string, string> {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const api = {
  // Auth
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password })
    });
    const data = await response.json();
    if (data.success && data.token) {
      storeToken(data.token);
    }
    return data;
  },

  logout: async (): Promise<void> => {
    clearStoredToken();
    await fetch(`${API_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: authHeaders(),
    });
  },

  me: async (): Promise<MeResponse | null> => {
    const response = await fetch(`${API_URL}/api/auth/me`, {
      credentials: 'include',
      headers: authHeaders(),
    });
    if (!response.ok) return null;
    return response.json();
  },

  // Users publics (dropdown login)
  getPublicUsers: async (): Promise<PublicUsersResponse> => {
    const response = await fetch(`${API_URL}/api/auth/users`);
    return response.json();
  },

  // Apps
  getApps: async (): Promise<AppsResponse> => {
    const response = await fetch(`${API_URL}/api/apps`, {
      credentials: 'include',
      headers: authHeaders(),
    });
    return response.json();
  },

  // SSO
  generateSSO: async (app: string): Promise<SSOResponse> => {
    const response = await fetch(`${API_URL}/api/sso/generate?app=${app}`, {
      credentials: 'include',
      headers: authHeaders(),
    });
    return response.json();
  },

  // Admin
  getAllUsers: async (): Promise<UsersResponse> => {
    const response = await fetch(`${API_URL}/api/admin/users`, {
      credentials: 'include',
      headers: authHeaders(),
    });
    return response.json();
  },

  createUser: async (data: {
    username: string;
    name: string;
    email: string;
    password: string;
    role: 'admin' | 'user';
    permissions: {
      stock: boolean;
      prix: boolean;
      maintenance: boolean;
      construction: boolean;
      shelly: boolean;
    };
  }): Promise<UserResponse> => {
    const body = {
      username: data.username,
      nom: data.name,
      email: data.email,
      password: data.password,
      role: data.role,
      actif: true,
      peut_acces_stock: data.permissions.stock,
      peut_acces_prix: data.permissions.prix,
      peut_admin_maintenance: data.permissions.maintenance,
      peut_acces_construction: data.permissions.construction,
      peut_acces_shelly: data.permissions.shelly,
    };
    const response = await fetch(`${API_URL}/api/admin/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      credentials: 'include',
      body: JSON.stringify(body)
    });
    return response.json();
  },

  updateUser: async (id: number, data: {
    name?: string;
    email?: string;
    role?: 'admin' | 'user';
    active?: boolean;
    permissions?: {
      stock?: boolean;
      prix?: boolean;
      maintenance?: boolean;
      construction?: boolean;
      shelly?: boolean;
    };
  }): Promise<UserResponse> => {
    const body: Record<string, unknown> = {};
    if (data.name !== undefined) body.nom = data.name;
    if (data.email !== undefined) body.email = data.email;
    if (data.role !== undefined) body.role = data.role;
    if (data.active !== undefined) body.actif = data.active;
    if (data.permissions) {
      if (data.permissions.stock !== undefined) body.peut_acces_stock = data.permissions.stock;
      if (data.permissions.prix !== undefined) body.peut_acces_prix = data.permissions.prix;
      if (data.permissions.maintenance !== undefined) body.peut_admin_maintenance = data.permissions.maintenance;
      if (data.permissions.construction !== undefined) body.peut_acces_construction = data.permissions.construction;
      if (data.permissions.shelly !== undefined) body.peut_acces_shelly = data.permissions.shelly;
    }
    const response = await fetch(`${API_URL}/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      credentials: 'include',
      body: JSON.stringify(body)
    });
    return response.json();
  },

  deleteUser: async (id: number): Promise<UserResponse> => {
    const response = await fetch(`${API_URL}/api/admin/users/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: authHeaders(),
    });
    return response.json();
  },

  getPassword: async (id: number): Promise<PasswordResponse> => {
    const response = await fetch(`${API_URL}/api/admin/users/${id}/password`, {
      credentials: 'include',
      headers: authHeaders(),
    });
    return response.json();
  },

  changePassword: async (id: number, password: string): Promise<UserResponse> => {
    const response = await fetch(`${API_URL}/api/admin/users/${id}/password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      credentials: 'include',
      body: JSON.stringify({ password })
    });
    return response.json();
  },
};
