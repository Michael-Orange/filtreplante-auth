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
}
