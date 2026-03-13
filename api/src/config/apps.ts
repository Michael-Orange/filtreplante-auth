import type { AppInfo } from "../types/app";

// Configuration des applications disponibles dans le système Filtreplante
export const DEFAULT_APPS: AppInfo[] = [
  {
    id: "stock",
    name: "Gestion Stock",
    url: "https://stock.filtreplante.com",
    icon: "📦",
    description: "Gestion des stocks et inventaire",
    requiresPermission: "peut_acces_stock",
  },
  {
    id: "prix",
    name: "Prix Référentiel",
    url: "https://prix.filtreplante.com",
    icon: "💰",
    description: "Référentiel des prix produits",
    requiresPermission: "peut_acces_prix",
  },
  {
    id: "factures",
    name: "Factures",
    url: "https://factures.filtreplante.com",
    icon: "🧾",
    description: "Consultation des factures",
    directLink: true,
  },
  {
    id: "maintenance",
    name: "Maintenance",
    url: "https://maintenance.filtreplante.com",
    icon: "🔧",
    description: "Suivi des interventions terrain",
    directLink: true,
    publicAccess: true,
  },
  {
    id: "maintenance-admin",
    name: "Maintenance Admin",
    url: "https://maintenance.filtreplante.com/admin",
    icon: "⚙️",
    description: "Gestion des interventions de maintenance",
    requiresPermission: "peut_admin_maintenance",
  },
  {
    id: "construction",
    name: "Calculateur Construction",
    url: "https://calculateur.filtreplante.com",
    icon: "🏗️",
    description: "Outil de calcul de matériaux pour projets de construction",
    requiresPermission: "peut_acces_construction",
  },
  {
    id: "shelly",
    name: "Shelly Collector",
    url: "https://iot.filtreplante.com",
    icon: "📡",
    description: "Tableau de bord Shelly Collector",
    directLink: true,
    specialUsers: ["michael", "marine", "fatou", "moussa"],
  },
  {
    id: "shelly-admin",
    name: "Shelly Admin",
    url: "https://iot.filtreplante.com/admin",
    icon: "⚡",
    description: "Administration Shelly Collector",
    requiresPermission: "peut_acces_shelly",
  },
];

// Liens personnalisés pour l'app Factures
export const FACTURES_USER_LINKS: Record<string, string> = {
  michael: "https://factures-fp.replit.app/michael_66a",
  marine: "https://factures-fp.replit.app/marine_7cf",
  fatou: "https://factures-fp.replit.app/fatou_7f4",
};
