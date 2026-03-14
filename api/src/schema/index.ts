export * from "./auth";

// Type minimal pour les permissions (compatible avec select partiel)
type UserPermissions = {
  peut_acces_stock: boolean;
  peut_acces_prix: boolean;
  peut_admin_maintenance: boolean | null;
  peut_acces_construction: boolean | null;
  peut_acces_shelly: boolean | null;
};

// Fonction pour convertir les permissions en liste d'apps accessibles
export function getUserApps(user: UserPermissions): string[] {
  const apps: string[] = [];
  
  if (user.peut_acces_stock) apps.push("stock");
  if (user.peut_acces_prix) apps.push("prix");
  if (user.peut_admin_maintenance) apps.push("maintenance-admin");
  if (user.peut_acces_construction) apps.push("construction");
  if (user.peut_acces_shelly) apps.push("shelly-admin");
  
  return apps;
}
