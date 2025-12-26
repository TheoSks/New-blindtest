# BlindTest Party

Le blindtest multijoueur instantane. Devine les chansons, defie tes amis !

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/TheoSks/New-blindtest)

## Fonctionnalites

- **Mode Guest** : Joue instantanement sans inscription
- **Multijoueur temps reel** : Rooms publiques/privees avec Ably
- **Compatible Vercel** : Deploiement serverless

## Stack Technique

- **Frontend** : React 18 + TypeScript + Vite
- **Styling** : Tailwind CSS + Framer Motion
- **State** : Zustand
- **Real-time** : Ably (WebSocket)
- **API** : Vercel Serverless Functions
- **Deploiement** : Vercel

## Installation

```bash
# Cloner le repo
git clone https://github.com/TheoSks/New-blindtest.git
cd New-blindtest

# Installer les dependances
npm install

# Configurer l'environnement
cp .env.example .env
# Ajouter votre cle API Ably (https://ably.com/)

# Lancer en developpement
npm run dev
```

## Configuration Ably

1. Creer un compte gratuit sur [Ably](https://ably.com/)
2. Creer une nouvelle app
3. Copier la cle API
4. Ajouter dans `.env` : `VITE_ABLY_API_KEY=votre-cle`

## Deploiement Vercel

```bash
# Installer Vercel CLI
npm i -g vercel

# Deployer
vercel
```

Ou connecter le repo GitHub a Vercel pour le deploiement automatique.

## Structure

```
blindtest-party/
├── src/
│   ├── components/     # Composants React
│   ├── pages/          # Pages (Landing, Lobby, Room, Game)
│   ├── hooks/          # Hooks personnalises
│   ├── stores/         # State Zustand
│   ├── lib/            # Utilitaires
│   └── styles/         # CSS global
├── api/                # Serverless Functions Vercel
├── public/             # Assets statiques
└── vercel.json         # Config Vercel
```

## Variables d'environnement

| Variable | Description |
|----------|-------------|
| `VITE_ABLY_API_KEY` | Cle API Ably pour le temps reel |

## Scripts

- `npm run dev` - Developpement local
- `npm run build` - Build production
- `npm run preview` - Preview du build

## Licence

MIT
