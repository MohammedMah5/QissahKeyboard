# Qissah Keyboard (قصة كيبورد)

An interactive web app for learning English through typing stories. Users type English narratives while receiving instant Arabic translations, building typing fluency and vocabulary in context.

## Features

- **Interactive Typing Game:** Type English stories with real-time hints and translations.
- **Audio Narration:** Listen to professional narration synchronized with each scene.
- **Mechanical Keyboard Sounds:** Realistic keystroke audio feedback.
- **Progress Tracking:** Track completed stories and words typed.
- **Pro Upgrade:** One-time payment to unlock all stories.
- **Developer Studio:** Create and publish custom stories (admin only).

## Tech Stack

- **Frontend:** Native ES modules, no framework
- **Backend:** Firebase (Auth, Firestore, Storage, Analytics)
- **Build Tool:** Vite
- **Hosting:** Firebase Hosting

## Prerequisites

- Node.js >= 18
- npm or yarn
- Firebase CLI (`npm install -g firebase-tools`)

## Local Development Setup

1. **Clone the repository:**
   ```bash
   git clone <repo-url>
   cd Development
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and replace the placeholder values with your Firebase project credentials.

4. **Run the development server:**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:3000`.

⚠️ **IMPORTANT:** Do NOT open `index.html` directly in the browser (file:// protocol). The app uses npm modules (Firebase, Vite) that require the dev server to run. Always use `npm run dev` and access via `http://localhost:3000`.

## Production Deployment

### Build the project

```bash
npm run build
```

This creates an optimized `dist/` folder.

### Deploy to Firebase

```bash
# Deploy everything (Hosting, Firestore rules, Storage rules, Functions)
firebase deploy

# Deploy only Hosting
firebase deploy --only hosting

# Deploy only Firestore rules
firebase deploy --only firestore:rules

# Deploy only Storage rules
firebase deploy --only storage:rules
```

## Project Structure

```
├── index.html          # Main HTML entry point
├── main.js             # Application bootstrap
├── auth.js             # Authentication flows
├── game.js             # Typing gameplay engine
├── studio.js           # Story creation studio
├── ui.js               # UI rendering and view management
├── db.js               # Firestore data access layer
├── state.js            # Global application state
├── utils.js            # Utility functions
├── firebase-init.js    # Firebase SDK initialization
├── license.js          # Upgrade/license logic
├── seed-data.js        # Demo data for development
├── styles.css          # Global styles
├── vite.config.js      # Vite build configuration
├── package.json        # Dependencies and scripts
├── .env                # Environment variables (not committed)
├── .env.example        # Environment variable template
├── .gitignore          # Git ignore rules
├── firebase.json       # Firebase project configuration
├── firestore.rules     # Firestore security rules
├── storage.rules       # Firebase Storage security rules
├── firestore.indexes.json # Firestore composite indexes
├── manifest.json       # PWA manifest
└── Assets/             # Static assets (images, audio, fonts)
```

## Security

- **Environment Variables:** All Firebase configuration is loaded from `.env`. Never commit `.env` to version control.
- **Firestore Rules:** Strict client-side rules enforce authentication and ownership.
- **Storage Rules:** Public assets are readable; user uploads are isolated by UID.
- **No Console Logs:** Production builds strip debug logging.

## License

Proprietary. All rights reserved.