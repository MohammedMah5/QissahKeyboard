/* =====================================================================
   Firebase v9+ (modular) setup — imported directly from the Firebase CDN
   as native ES modules, so no bundler/build step is required.
   ===================================================================== */

import { initializeApp } from 'firebase/app';
import {
  getAnalytics,
  isSupported as isAnalyticsSupported,
} from 'firebase/analytics';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  addDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
  writeBatch,
  increment,
  serverTimestamp,
} from 'firebase/firestore';

// Load config from environment variables with safe fallbacks
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Validate required config
const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
const missingFields = requiredFields.filter(field => !firebaseConfig[field]);

let app, auth, db, googleProvider;

if (missingFields.length > 0) {
  console.error('Missing required Firebase configuration:', missingFields.join(', '));
  console.error('Please check your .env file and ensure all VITE_FIREBASE_* variables are set.');
  app = null;
  auth = null;
  db = null;
  googleProvider = null;
} else {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  googleProvider = new GoogleAuthProvider();
}

export { app, auth, db, googleProvider };

// Analytics requires a real https/localhost origin, so probe support first
// (it would otherwise throw when the app is opened via file:// during local dev).
if (app) {
  isAnalyticsSupported()
    .then((supported) => {
      if (supported) getAnalytics(app);
    })
    .catch(() => {});
}

export {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
  doc,
  getDoc,
  setDoc,
  addDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
  writeBatch,
  increment,
  serverTimestamp,
};