# Filtreplante Auth - Frontend

Portail d'authentification central pour l'écosystème Filtreplante.

## 🚀 Stack Technique

- **React 18** + TypeScript (strict mode)
- **Vite** - Bundler ultra-rapide
- **wouter** - Routing léger
- **@tanstack/react-query** - Gestion état serveur
- **Tailwind CSS** - Styling avec design system Pine Blue
- **Cloudflare Pages** - Déploiement

## 📦 Installation

```bash
npm install
```

## 🛠️ Développement

```bash
npm run dev
```

L'application sera accessible sur `http://localhost:5173`

### Configuration

Créer un fichier `.env.local` :

```env
# Laisser vide pour utiliser le proxy Vite (recommandé en dev)
VITE_API_URL=
```

Le proxy Vite redirige automatiquement `/api/*` vers `http://127.0.0.1:8787` (wrangler dev).

## 🏗️ Build

```bash
npm run build
```

Les fichiers de production seront générés dans le dossier `dist/`.

## 🎨 Design System - Pine Blue

### Couleurs

- **Primary**: `#317873`
- **Primary Hover**: `#285f5b`
- **Primary Light**: `#e8f4f3`
- **Success**: `#10b981`
- **Warning**: `#f59e0b`
- **Danger**: `#ef4444`

### Polices

- **Titres**: Inter (Google Fonts)
- **Corps**: Roboto (Google Fonts)

### Touch Targets

Tous les éléments interactifs ont une hauteur minimale de **44px** (mobile-first).

## 📁 Structure

```
web/
├─ src/
│  ├─ main.tsx              # Entry point
│  ├─ App.tsx               # Router principal
│  ├─ lib/
│  │  ├─ api.ts             # Client API
│  │  └─ utils.ts           # Helpers
│  ├─ hooks/
│  │  ├─ useAuth.ts         # Hook auth
│  │  └─ useUsers.ts        # Hook admin users
│  ├─ pages/
│  │  ├─ LoginPage.tsx      # Page login
│  │  ├─ AppsPage.tsx       # Dashboard apps
│  │  └─ AdminPage.tsx      # Gestion utilisateurs
│  ├─ components/
│  │  ├─ AppCard.tsx        # Card d'une app
│  │  ├─ UserTable.tsx      # Tableau users admin
│  │  ├─ UserModal.tsx      # Modal créer/modifier user
│  │  ├─ PasswordModal.tsx  # Modal voir/changer password
│  │  └─ Layout.tsx         # Layout commun
│  └─ types/
│     ├─ user.ts            # Types User, AppInfo
│     └─ api.ts             # Types réponses API
├─ index.html
├─ package.json
├─ vite.config.ts
├─ tailwind.config.ts
└─ tsconfig.json
```

## 🔐 Authentification

L'application utilise des cookies HTTP-only pour l'authentification. Tous les appels API incluent `credentials: 'include'` pour envoyer les cookies.

### Routes

- `/login` - Page de connexion
- `/apps` - Portail des applications (protégé)
- `/admin` - Gestion des utilisateurs (admin uniquement)

### Redirect SSO

L'URL `/login?redirect=stock` génère automatiquement un token SSO et redirige vers l'application après connexion.

## 🌐 API Backend

Backend Cloudflare Workers : `https://filtreplante-auth.michael-orange09.workers.dev`

## 📝 Scripts

- `npm run dev` - Démarrer le serveur de développement
- `npm run build` - Build pour production
- `npm run preview` - Prévisualiser le build
- `npm run lint` - Vérifier les types TypeScript

## 🚢 Déploiement

Le projet est configuré pour être déployé sur **Cloudflare Pages**.

1. Connecter le repo GitHub à Cloudflare Pages
2. Configuration build :
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Environment variable**: `VITE_API_URL=https://filtreplante-auth.michael-orange09.workers.dev`

## ⚠️ Points Critiques

1. **Credentials**: Tous les fetch doivent inclure `credentials: 'include'`
2. **CORS**: Le backend autorise `https://filtreplante.com` en production
3. **Mobile-first**: Tous les boutons ≥ 44px height
4. **Pas de localStorage**: L'auth est gérée par cookies HTTP-only

## 📄 License

Propriétaire - Filtreplante
