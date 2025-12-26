# BlindTest Party

Le blindtest multijoueur instantane. Devine les chansons, defie tes amis !

## Fonctionnalites

- **Mode Guest** : Joue instantanement sans inscription
- **Mode Compte** : Progression, stats, badges
- **Multijoueur temps reel** : Rooms publiques/privees
- **Gamification** : XP, niveaux, achievements

## Stack Technique

### Frontend
- React 18 + TypeScript
- Vite
- Tailwind CSS
- Framer Motion
- Socket.io Client
- Zustand

### Backend
- Node.js + Express
- Socket.io
- Prisma (PostgreSQL)

## Installation

```bash
# Cloner le repo
git clone https://github.com/TheoSks/New-blindtest.git
cd New-blindtest

# Installer les dependances
npm install

# Configurer l'environnement
cp .env.example .env
# Editer .env avec vos valeurs

# Lancer en developpement
npm run dev
```

## Structure du Projet

```
blindtest-party/
├── apps/
│   ├── web/          # Frontend React
│   └── api/          # Backend Node.js
├── packages/
│   └── shared/       # Types partages
└── package.json
```

## Scripts

- `npm run dev` - Lance le frontend et backend en developpement
- `npm run dev:web` - Lance uniquement le frontend
- `npm run dev:api` - Lance uniquement le backend
- `npm run build` - Build pour la production

## Licence

MIT
