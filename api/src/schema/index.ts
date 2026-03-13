import type { User } from "./auth";

export * from "./auth";

// Fonction pour convertir les permissions en liste d'apps accessibles
export function getUserApps(user: User): string[] {
  const apps: string[] = [];
  
  if (user.peut_acces_stock) apps.push("stock");
  if (user.peut_acces_prix) apps.push("prix");
  if (user.peut_admin_maintenance) apps.push("maintenance-admin");
  if (user.peut_acces_construction) apps.push("construction");
  if (user.peut_acces_shelly) apps.push("shelly-admin");
  
  return apps;
}
