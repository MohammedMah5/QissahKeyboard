/* =====================================================================
   Firebase v9+ (modular) setup — imported directly from the Firebase CDN
   as native ES modules, so no bundler/build step is required.
   ===================================================================== */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAnalytics,
  isSupported as isAnalyticsSupported,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
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
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// Public client config (safe to expose — access is controlled by Firestore/Auth rules)
const firebaseConfig = {
  apiKey: 'AIzaSyBMqqz5n50sXLRfGUgDnqX0pRZpGzNLrsI',
  authDomain: 'qissahkeyboard.firebaseapp.com',
  projectId: 'qissahkeyboard',
  storageBucket: 'qissahkeyboard.firebasestorage.app',
  messagingSenderId: '634088692961',
  appId: '1:634088692961:web:e3d82cff0bc9e81261aba0',
  measurementId: 'G-XJDVV6SL2D',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Analytics requires a real https/localhost origin, so probe support first
// (it would otherwise throw when the app is opened via file:// during local dev).
isAnalyticsSupported()
  .then((supported) => {
    if (supported) getAnalytics(app);
  })
  .catch(() => {});

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
  serverTimestamp,
};
