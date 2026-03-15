// Application types
export interface AppInfo {
  id: string;
  name: string;
  url: string;
  icon: string;
  description?: string;
  directLink?: boolean;
  publicAccess?: boolean;
  requiresPermission?: string;
  specialUsers?: string[];
  ssoCallbackUrl?: string;
  /** Auth v2 : l'app utilise @filtreplante/auth avec Bearer token (pas de SSO callback) */
  authV2?: boolean;
}
