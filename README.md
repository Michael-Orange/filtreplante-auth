# 🔐 Filtreplante Auth - Service d'Authentification Centralisé

Service d'authentification SSO (Single Sign-On) pour l'écosystème Filtreplante, déployé sur **Cloudflare Workers**.

## 📋 Table des Matières

- [Stack Technique](#stack-technique)
- [Architecture](#architecture)
- [Installation](#installation)
- [Configuration](#configuration)
- [Développement Local](#développement-local)
- [Routes API](#routes-api)
- [Système SSO](#système-sso)
- [Sécurité](#sécurité)
- [Déploiement](#déploiement)

---

## 🛠️ Stack Technique

- **Runtime** : Cloudflare Workers (Edge)
- **Framework** : Hono
- **Base de données** : PostgreSQL (Neon Serverless)
- **ORM** : Drizzle ORM
- **Authentification** : JWT avec jose (compatible Web Crypto API)
- **Chiffrement** : CryptoJS AES (réversible)
- **Validation** : Zod
- **TypeScript** : Mode strict

---

## 🏗️ Architecture

```
/api
├─ src/
│  ├─ index.ts              # Entry point Hono
│  ├─ lib/
│  │  ├─ db.ts             # Drizzle client Neon
│  │  ├─ crypto.ts         # Chiffrement CryptoJS
│  │  └─ sso.ts            # JWT tokens (jose)
│  ├─ routes/
│  │  ├─ auth.ts           # Login, logout, me
│  │  ├─ users.ts          # Liste users publique
│  │  ├─ admin.ts          # CRUD users (admin)
│  │  ├─ apps.ts           # Apps accessibles
│  │  └─ sso.ts            # Génération tokens SSO
│  ├─ middleware/
│  │  ├─ auth.ts           # requireAuth
│  │  ├─ admin.ts          # requireAdmin
│  │  └─ error.ts          # Error handler
│  ├─ schema/
│  │  ├─ auth.ts           # Schema Drizzle
│  │  └─ index.ts          # getUserApps()
│  ├─ validators/
│  │  ├─ auth.ts           # Zod schemas
│  │  └─ users.ts          # Zod schemas
│  ├─ types/
│  │  ├─ env.ts            # Env vars types
│  │  ├─ user.ts           # User types
│  │  └─ app.ts            # App types
│  └─ config/
│     └─ apps.ts           # Apps disponibles
├─ package.json
├─ wrangler.toml
├─ tsconfig.json
├─ drizzle.config.ts
└─ .env
```

---

## 📦 Installation

```bash
cd api
npm install
```

---

## ⚙️ Configuration

### Variables d'environnement

Créer un fichier `.env` à la racine de `/api` :

```bash
# Database
DATABASE_URL=postgresql://neondb_owner:npg_RtU4PSaFfrY9@ep-flat-wave-ai8s9lqh-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require

# Auth Secrets
JWT_SECRET=<64 caractères hex>
CRYPTO_SECRET=<32 caractères hex>

# Environment
NODE_ENV=development
```

### Générer les secrets

```javascript
// Node.js
const crypto = require('crypto');
console.log('JWT_SECRET:', crypto.randomBytes(64).toString('hex'));
console.log('CRYPTO_SECRET:', crypto.randomBytes(32).toString('hex'));
```

### Configuration Cloudflare Workers

Les secrets doivent être configurés via `wrangler` :

```bash
npx wrangler secret put DATABASE_URL
npx wrangler secret put JWT_SECRET
npx wrangler secret put CRYPTO_SECRET
```

---

## 🚀 Développement Local

```bash
cd api
npm run dev
```

Le serveur démarre sur `http://localhost:8787`

---

## 📡 Routes API

### **Publiques**

#### `POST /api/auth/login`
Authentification avec username/password

**Body** :
```json
{
  "username": "michael",
  "password": "motdepasse"
}
```

**Response** :
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "michael",
    "nom": "Michael",
    "role": "admin",
    "apps": ["stock", "prix", "maintenance-admin"]
  }
}
```

#### `GET /api/auth/users`
Liste des utilisateurs actifs (pour dropdown login)

**Response** :
```json
[
  { "username": "michael", "nom": "Michael" },
  { "username": "marine", "nom": "Marine" }
]
```

---

### **Protégées (authentification requise)**

#### `GET /api/auth/me`
Récupère l'utilisateur courant

**Headers** : Cookie `auth_session`

**Response** :
```json
{
  "id": 1,
  "username": "michael",
  "nom": "Michael",
  "role": "admin",
  "apps": ["stock", "prix"],
  "type": "session"
}
```

#### `POST /api/auth/logout`
Déconnexion (supprime le cookie)

#### `GET /api/auth/logout?returnUrl=xxx`
Déconnexion avec redirection

#### `GET /api/apps`
Liste des applications accessibles pour l'utilisateur

**Response** :
```json
[
  {
    "id": "stock",
    "name": "Gestion Stock",
    "url": "https://stock.filtreplante.com",
    "icon": "📦",
    "description": "Gestion des stocks et inventaire"
  }
]
```

---

### **SSO (authentification requise)**

#### `GET /api/sso/generate?app=stock`
Génère un token SSO pour redirection vers une application

**Response** :
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "redirectUrl": "https://stock.filtreplante.com/sso/login"
}
```

---

### **Admin (authentification + rôle admin requis)**

#### `GET /api/admin/users`
Liste tous les utilisateurs

#### `POST /api/admin/users`
Créer un utilisateur

**Body** :
```json
{
  "username": "nouveau",
  "nom": "Nouveau User",
  "email": "nouveau@filtreplante.com",
  "password": "motdepasse123",
  "role": "user",
  "actif": true,
  "peut_acces_stock": true,
  "peut_acces_prix": false
}
```

#### `PATCH /api/admin/users/:id`
Modifier un utilisateur

#### `DELETE /api/admin/users/:id`
Supprimer un utilisateur

#### `GET /api/admin/users/:id/password`
Récupérer le mot de passe déchiffré (admin uniquement)

**Response** :
```json
{
  "password": "motdepasse123"
}
```

#### `POST /api/admin/users/:id/password`
Changer le mot de passe d'un utilisateur

---

## 🔄 Système SSO

### Flow d'authentification inter-apps

1. **User clique sur une app** depuis le dashboard
2. **Frontend appelle** `GET /api/sso/generate?app=stock`
3. **Backend vérifie** les permissions de l'utilisateur
4. **Backend génère** un JWT SSO (valide 5 minutes)
5. **Frontend redirige** vers `https://stock.filtreplante.com/sso/login?token=xxx`
6. **App cible valide** le token avec le même `JWT_SECRET`
7. **App cible crée** sa propre session locale

### Payload JWT SSO

```json
{
  "userId": 1,
  "username": "michael",
  "nom": "Michael",
  "role": "admin",
  "apps": ["stock", "prix"],
  "peut_acces_shelly": true,
  "type": "sso",
  "targetApp": "stock",
  "exp": 1234567890
}
```

---

## 🔒 Sécurité

### Chiffrement des mots de passe

⚠️ **IMPORTANT** : Les mots de passe sont chiffrés avec **CryptoJS AES** (réversible), pas bcrypt/argon2.

**Raison** : L'admin doit pouvoir récupérer les mots de passe en clair (feature spécifique Filtreplante).

```typescript
// Chiffrement
const encrypted = encryptPassword("motdepasse", CRYPTO_SECRET);

// Déchiffrement
const decrypted = decryptPassword(encrypted, CRYPTO_SECRET);

// Vérification
const isValid = verifyPassword("motdepasse", encrypted, CRYPTO_SECRET);
```

### Sessions JWT

- **Durée** : 7 jours
- **Stockage** : Cookie HTTP-only `auth_session`
- **SameSite** : Lax
- **Secure** : true (production)

### Tokens SSO

- **Durée** : 5 minutes (temporaire)
- **Usage** : Redirection inter-apps uniquement

### Protections Admin

- ❌ Admin ne peut pas se retirer le rôle admin
- ❌ Admin ne peut pas désactiver son compte
- ❌ Admin ne peut pas se supprimer

### CORS

Configuré strictement pour les domaines `*.filtreplante.com`

---

## 🚀 Déploiement

### Déploiement sur Cloudflare Workers

```bash
cd api
npx wrangler deploy
```

### Configuration des secrets

```bash
npx wrangler secret put DATABASE_URL
npx wrangler secret put JWT_SECRET
npx wrangler secret put CRYPTO_SECRET
```

### URL de production

```
https://filtreplante-auth.workers.dev
```

---

## 📊 Base de Données

### Schema PostgreSQL

**Schema** : `referentiel`  
**Table** : `referentiel.users`

```sql
CREATE TABLE referentiel.users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  nom TEXT NOT NULL,
  email TEXT,
  password_encrypted TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  actif BOOLEAN DEFAULT true,
  
  -- Permissions
  peut_acces_stock BOOLEAN DEFAULT false,
  peut_acces_prix BOOLEAN DEFAULT false,
  peut_admin_maintenance BOOLEAN DEFAULT false,
  peut_acces_construction BOOLEAN DEFAULT false,
  peut_acces_shelly BOOLEAN DEFAULT false,
  
  -- Métadonnées
  date_creation TIMESTAMP DEFAULT NOW(),
  derniere_connexion TIMESTAMP,
  created_by TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Mapping Permissions → Apps

```typescript
peut_acces_stock → "stock"
peut_acces_prix → "prix"
peut_admin_maintenance → "maintenance-admin"
peut_acces_construction → "construction"
peut_acces_shelly → "shelly-admin"
```

---

## 🧪 Tests

### Test de santé

```bash
curl https://filtreplante-auth.workers.dev/health
```

### Test login

```bash
curl -X POST https://filtreplante-auth.workers.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"michael","password":"motdepasse"}'
```

---

## 📝 Notes Importantes

1. **Pas de Better Auth** : Implémentation 100% custom avec JWT + Drizzle
2. **jose au lieu de jsonwebtoken** : Compatible Cloudflare Workers (Web Crypto API)
3. **Chiffrement réversible** : CryptoJS AES pour permettre la récupération des mots de passe
4. **Table existante** : Le schema Drizzle reflète la table existante (pas de CREATE TABLE)
5. **Async JWT** : Toutes les fonctions JWT sont async (contrairement à jsonwebtoken)

---

## 🤝 Support

Pour toute question ou problème, contacter l'équipe Filtreplante.

---

**Version** : 1.0.0  
**Dernière mise à jour** : Mars 2026
