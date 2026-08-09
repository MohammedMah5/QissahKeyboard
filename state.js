/* =====================================================================
   Qissah Keyboard — Shared application state (single source of truth)
   Every module imports these same object/array references and mutates
   them in place; nothing here is ever reassigned wholesale, which is
   what previously let one flow (e.g. finishing a story) clobber state
   set by another (e.g. developer status).
   ===================================================================== */

// `uid`/`name`/`isDeveloper`/stats are populated from Firestore; `isPro` stays a
// local mock toggle (not persisted) so tier-gated UI stays easy to test.
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
