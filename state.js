/* =====================================================================
   Qissah Keyboard — Shared application state (single source of truth)
   Every module imports these same object/array references and mutates
   them in place; nothing here is ever reassigned wholesale, which is
   what previously let one flow (e.g. finishing a story) clobber state
   set by another (e.g. developer status).
   ===================================================================== */

// `uid`/`name`/`isDeveloper`/stats are populated from Firestore; `isPro` is a
// lifetime-purchase flag persisted both in Firestore and localStorage so the
// Pro status (and the UI it gates) survives page reloads.
export const userState = {
  isLoggedIn: false,
  isPro: false,
  isDeveloper: false,
  devPreviewAsUser: false,
  uid: null,
  name: '',
  wordsTyped: 0,
  storiesFinished: 0,
  streak: 0,
};

// Cache of { [storyId]: true } for the signed-in user, loaded from Firestore.
// Exported as a mutable object so importers see live updates without reassignment.
export const userProgress = {};

export function resetUserProgress() {
  Object.keys(userProgress).forEach((key) => delete userProgress[key]);
}

// Categories & stories loaded from Firestore (or the local seed as an offline fallback).
// Kept as stable array references — mutate contents via splice/push, never reassign.
export const categories = [];
export const stories = [];

export function setCategories(list) {
  categories.splice(0, categories.length, ...list);
}

export function setStories(list) {
  stories.splice(0, stories.length, ...list);
}

export const appState = {
  activeCategory: null,
};

// ------------------------- Pro status persistence -------------------------
// localStorage key for the lifetime Pro flag.
const PRO_STORAGE_KEY = 'qissah_isPro';

// Hydrate isPro from localStorage as a fast local fallback.
// (The authoritative value is refreshed from Firestore when the user signs in.)
userState.isPro = localStorage.getItem(PRO_STORAGE_KEY) === 'true';

/**
 * Updates the Pro status across local state and localStorage.
 * (The Firestore write is handled by the upgrade flow.)
 * @param {boolean} isPro
 */
export function setProStatus(isPro) {
  userState.isPro = isPro;
  localStorage.setItem(PRO_STORAGE_KEY, String(isPro));
}

/** Resets the Pro flag — call on sign-out. */
export function clearProStatus() {
  userState.isPro = false;
  localStorage.removeItem(PRO_STORAGE_KEY);
}
