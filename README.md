# 📚 MarkDocs

> ✍️ Écrivez, publiez et vendez vos contenus depuis un seul espace Markdown.

**MarkDocs** est une plateforme de documentation et de publication construite comme une **PWA installable**. Elle permet de créer des documentations publiques, de publier des livres gratuits ou payants, de gérer l'historique des versions et d'exporter les contenus en Markdown, EPUB ou PDF.

## ✨ Fonctionnalités

- 📝 Éditeur Markdown pour créer, modifier et supprimer des documents
- 📖 Deux types de contenus :
  - **Documentation** : publiée intégralement lorsqu'elle est mise en ligne
  - **Livre** : gratuit ou vendu avec aperçu avant achat
- 🌐 Pages publiques accessibles via `/d/<slug>`
- 🔗 Support des domaines personnalisés pour publier un document à la racine d'un domaine
- 💳 Paiements avec **Stripe** et **PayPal** pour les livres payants
- 📦 Téléchargements en **Markdown**, **EPUB** et **PDF**
- 💾 Historique automatique des versions avec restauration en un clic
- 🔎 Recherche plein texte parmi les contenus publiés
- 📱 PWA installable avec manifeste, icônes et service worker
- 🌍 Interface bilingue français / anglais
- 🔐 Protection optionnelle de l'espace d'administration par mot de passe
- 🛡️ Headers de sécurité, CORS, limitation de débit et validation côté serveur
- 📸 Snapshot du contenu lors d'un achat : le téléchargement reste disponible même si le document original est ensuite modifié ou supprimé

## 🧰 Stack technique

- **Frontend** : Next.js 14, React 18, Material UI
- **Backend** : Node.js, Express
- **Base de données** : MongoDB avec Mongoose
- **Contenu** : Markdown avec `marked`
- **Exports** : EPUB avec `epub-gen-memory`, PDF avec `pdfkit`
- **Paiements** : Stripe et PayPal
- **Déploiement** : Docker et Docker Compose

## 🗂️ Organisation du projet

```text
.
├── server/                 # API Express et logique métier
│   ├── src/
│   │   ├── app.js          # Configuration Express, sécurité, CORS et routes
│   │   ├── index.js        # Point d'entrée et connexion MongoDB
│   │   ├── models/         # Modèles Mongoose : Doc, Version et Order
│   │   ├── routes/         # Routes admin, publiques, checkout et webhooks
│   │   ├── middleware/     # Protection de l'API d'administration
│   │   └── lib/            # Markdown et génération des exports
│   └── test/               # Tests unitaires Node.js
├── web/                    # Application Next.js et PWA
│   ├── app/
│   │   ├── route.js        # Page marketing à la racine (/)
│   │   ├── app/             # Espace d'écriture et d'administration
│   │   └── d/[slug]/        # Page publique d'un document ou d'un livre
│   ├── landing/             # Landing page bilingue
│   ├── lib/                 # Client API et traductions EN/FR
│   ├── public/              # Manifest, service worker et icônes
│   └── middleware.js        # Résolution des domaines personnalisés
├── docker-compose.yml       # MongoDB pour le développement local
├── docker-compose.prod.yml  # Exemple de déploiement avec Docker
└── package.json             # Workspaces et scripts racine
```

### 🔄 Fonctionnement général

1. Le frontend Next.js fournit la landing page, l'espace d'administration et les pages publiques.
2. L'API Express gère les documents, les versions, les exports, la recherche et les commandes.
3. MongoDB stocke les documents, snapshots de versions et commandes.
4. Lorsqu'un livre payant est acheté, son titre et son contenu sont figés dans la commande afin de garantir un téléchargement stable.
5. Le middleware Next.js peut transformer un domaine personnalisé en page publique `/d/<slug>`.

## 🚀 Installation locale

### Prérequis

- [Node.js](https://nodejs.org/) **18.18 ou supérieur**
- [Docker](https://www.docker.com/) pour lancer MongoDB, ou une instance MongoDB existante

### 1. Cloner le projet

```bash
git clone https://github.com/kl1504/MarkDocs.git
cd MarkDocs
```

### 2. Lancer MongoDB

```bash
docker compose up -d
```

MongoDB sera disponible sur `localhost:27017`.

### 3. Préparer les variables d'environnement

```bash
cp server/.env.example server/.env
cp web/.env.example web/.env.local
```

Pour un environnement local ouvert, vous pouvez laisser `ADMIN_PASSWORD` vide. En dehors du développement local, définissez toujours un mot de passe robuste.

### 4. Installer les dépendances

```bash
npm install
```

### 5. Démarrer l'application

```bash
npm run dev
```

Les services seront accessibles aux adresses suivantes :

- 🌐 Landing page : <http://localhost:3000>
- ✍️ Espace d'écriture : <http://localhost:3000/app>
- ❤️ Health check API : <http://localhost:4000/api/health>

## ⚙️ Variables d'environnement

### API — `server/.env`

| Variable | Description | Exemple |
| --- | --- | --- |
| `PORT` | Port de l'API | `4000` |
| `MONGODB_URI` | URL de connexion MongoDB | `mongodb://localhost:27017/markdocs` |
| `CLIENT_URL` | URL de l'application web | `http://localhost:3000` |
| `ALLOWED_ORIGINS` | Origines autorisées pour l'API privée | `http://localhost:3000` |
| `ADMIN_PASSWORD` | Mot de passe de l'espace d'administration | `change-me` |
| `CURRENCY` | Devise des paiements | `usd` |
| `STRIPE_SECRET_KEY` | Clé secrète Stripe | `sk_...` |
| `STRIPE_WEBHOOK_SECRET` | Secret du webhook Stripe | `whsec_...` |
| `PAYPAL_CLIENT_ID` | Identifiant client PayPal | — |
| `PAYPAL_SECRET` | Secret PayPal | — |
| `PAYPAL_ENV` | Environnement PayPal | `sandbox` ou `live` |

### Frontend — `web/.env.local`

| Variable | Description | Exemple |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | URL de l'API utilisée par le navigateur | `http://localhost:4000` |
| `API_URL` | URL de l'API utilisée côté serveur et par le middleware | `http://localhost:4000` |

Les clés Stripe et PayPal sont facultatives. Un fournisseur dont les clés sont vides est simplement désactivé.

## 🧪 Tests

Les tests utilisent le module natif `node:test` et couvrent notamment :

- 🔐 la vérification du mot de passe administrateur
- 🧩 le découpage des chapitres Markdown
- 📘 la génération des exports EPUB et PDF
- 💰 la logique liée aux commandes et aux snapshots d'achat

Lancer la suite de tests :

```bash
npm test
```

## 📡 API principale

Les routes publiques ne nécessitent pas d'authentification. Les routes sous `/api/docs` utilisent l'en-tête suivant lorsque `ADMIN_PASSWORD` est défini :

```http
Authorization: Bearer <ADMIN_PASSWORD>
```

| Méthode | Route | Accès | Description |
| --- | --- | --- | --- |
| `GET` | `/api/admin/status` | Public | Indique si un mot de passe admin est requis |
| `GET` | `/api/docs` | Admin | Liste les documents |
| `POST` | `/api/docs` | Admin | Crée un document |
| `GET` | `/api/docs/:id` | Admin | Récupère un document |
| `PUT` | `/api/docs/:id` | Admin | Modifie un document |
| `DELETE` | `/api/docs/:id` | Admin | Supprime un document |
| `GET` | `/api/docs/:id/versions` | Admin | Liste l'historique des versions |
| `POST` | `/api/docs/:id/versions/:vid/restore` | Admin | Restaure une version |
| `GET` | `/api/docs/:id/export.:fmt` | Admin | Exporte en `md`, `epub` ou `pdf` |
| `GET` | `/api/docs/public/:slug` | Public | Lit un document publié |
| `GET` | `/api/docs/public/:slug/export.:fmt` | Public | Télécharge un document gratuit |
| `GET` | `/api/search?q=` | Public | Recherche dans les contenus publiés |
| `POST` | `/api/checkout/stripe` | Public contrôlé | Démarre un paiement Stripe |
| `POST` | `/api/checkout/paypal` | Public contrôlé | Démarre un paiement PayPal |
| `GET` | `/api/orders/:token` | Public | Consulte l'état d'une commande |
| `GET` | `/api/orders/:token/download.:fmt` | Public | Télécharge un livre acheté |
| `POST` | `/api/webhooks/stripe` | Signé | Confirme un paiement Stripe |

## 💳 Configurer les paiements

### Stripe

1. Renseignez `STRIPE_SECRET_KEY`.
2. Créez un webhook Stripe vers `https://votre-api/api/webhooks/stripe`.
3. Écoutez l'événement `checkout.session.completed`.
4. Placez le secret du webhook dans `STRIPE_WEBHOOK_SECRET`.

Le paiement est confirmé côté serveur via le webhook signé, et non uniquement via la redirection du navigateur.

### PayPal

1. Créez une application dans le tableau de bord développeur PayPal.
2. Renseignez `PAYPAL_CLIENT_ID` et `PAYPAL_SECRET`.
3. Utilisez `PAYPAL_ENV=sandbox` pour les tests.
4. Passez à `PAYPAL_ENV=live` pour la production.

## 🌍 Domaines personnalisés

Pour publier un document sur son propre domaine :

1. Ouvrez l'onglet **Settings** dans l'espace d'administration.
2. Définissez un domaine personnalisé, par exemple `docs.example.com`.
3. Faites pointer le DNS du domaine vers votre déploiement web.
4. Après propagation DNS, le middleware `web/middleware.js` redirigera la racine du domaine vers le document associé.

La résolution des domaines personnalisés est volontairement désactivée sur `localhost`.

## 🐳 Déploiement Docker

### Développement

```bash
docker compose up -d
```

### Production

Copiez et adaptez les variables nécessaires dans votre environnement, puis lancez :

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

La configuration de production démarre :

- 🗄️ MongoDB sur le réseau Docker
- ⚡ l'API Express sur le port `4000`
- 🌐 l'application Next.js sur le port `3000`

### Déploiement sans Docker

```bash
npm run build
npm start
```

## 🔒 Sécurité

MarkDocs inclut plusieurs protections côté serveur :

- 🔑 mot de passe partagé pour l'espace d'administration
- 🌐 contrôle CORS pour les routes privées
- 🚦 limitation du nombre de requêtes par adresse IP
- 🪖 headers de sécurité via `helmet`
- ✅ validation des titres, contenus, prix et domaines
- 💰 confirmation Stripe par webhook signé
- 🧱 contrôle de l'origine des requêtes de checkout

> ⚠️ Il n'y a pas encore de comptes utilisateurs individuels, de permissions par rôle, d'audit log ou de double authentification. L'administration repose actuellement sur un mot de passe partagé.

## 🗺️ Feuille de route

- 👥 Ajouter plusieurs comptes éditeur
- 🎨 Ajouter des thèmes pour les sites de documentation
- 🧪 Ajouter des tests automatisés pour les checkouts Stripe et PayPal en sandbox

## 🤝 Contribution

Les contributions sont les bienvenues ! Pour proposer une amélioration :

1. Forkez le dépôt.
2. Créez une branche dédiée :

   ```bash
   git checkout -b feat/ma-fonctionnalite
   ```

3. Faites vos modifications et ajoutez des tests si nécessaire.
4. Vérifiez que `npm test` passe.
5. Ouvrez une Pull Request avec une description claire.

## 📄 Licence

Copyright © 2026 MarkDocs. Tous droits réservés.
