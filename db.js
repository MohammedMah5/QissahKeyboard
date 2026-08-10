/* =====================================================================
   Qissah Keyboard — Firestore data access layer.
   Every read/write to Firestore goes through this module so UI/game/studio
   code never touches the SDK directly.
   ===================================================================== */

import {
  db,
  doc,
  getDoc,
  setDoc,
  addDoc,
  deleteDoc,
  collection,
  getDocs,
  writeBatch,
  increment,
  serverTimestamp,
} from './firebase-init.js';
import { seedCategories, seedStories } from './seed-data.js';
import { userState, userProgress, categories, stories, setCategories, setStories } from './state.js';

// ------------------------- Categories & stories -------------------------
async function seedDatabase() {
  const batch = writeBatch(db);
  seedCategories.forEach(({ id, ...data }) => batch.set(doc(db, 'categories', id), data));
  seedStories.forEach(({ id, ...data }) => batch.set(doc(db, 'stories', id), data));
  await batch.commit();
}

// One-time self-healing migration: story docs seeded before the asset-path fix
// still point at the old broken "./Narrations/..." URLs (wrong casing/location).
// Detect any such stale thumbnail and rewrite every seeded story from the
// bundled seed data. Only ever runs once (no marker is needed: after the write,
// no stale paths remain, so the check is a no-op on subsequent loads).
async function repairStaleSeedPaths(storySnap) {
  const staleDocs = storySnap.docs.filter((d) => /Narrations\//.test(d.data().thumbnailUrl || ''));
  if (staleDocs.length === 0) return;

  const batch = writeBatch(db);
  seedStories.forEach(({ id, ...data }) => batch.set(doc(db, 'stories', id), data));
  try {
    await batch.commit();
    return true;
  } catch {
    // Non-admin signed-in user can't write stories — the client-side fallback
    // in loadCategoriesAndStories keeps the UI working regardless.
    return false;
  }
}

export async function loadCategoriesAndStories() {
  try {
    let [catSnap, storySnap] = await Promise.all([
      getDocs(collection(db, 'categories')),
      getDocs(collection(db, 'stories')),
    ]);

    if (catSnap.empty) {
      await seedDatabase();
      [catSnap, storySnap] = await Promise.all([
        getDocs(collection(db, 'categories')),
        getDocs(collection(db, 'stories')),
      ]);
    } else {
      // Self-heal stale seeded paths, then re-read so the UI gets fresh data
      const repaired = await repairStaleSeedPaths(storySnap);
      if (repaired) {
        storySnap = await getDocs(collection(db, 'stories'));
      }
    }

    setCategories(
      catSnap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.order || 0) - (b.order || 0))
    );
    setStories(storySnap.docs.map((d) => ({ id: d.id, ...d.data() })));
  } catch (error) {
    // Fallback initialization: Firestore unreachable or rules blocked the read/seed
    setCategories(seedCategories);
    setStories(seedStories);
  }
}

export async function createCategory(name) {
  const id = `cat-${Date.now()}`;
  const data = { name, order: categories.length + 1 };
  await setDoc(doc(db, 'categories', id), data);
  return { id, ...data };
}

export async function saveStory(story, editingId) {
  if (editingId) {
    await setDoc(doc(db, 'stories', editingId), story);
    return { id: editingId, ...story };
  }
  const ref = await addDoc(collection(db, 'stories'), story);
  return { id: ref.id, ...story };
}

export async function deleteStoryDoc(storyId) {
  await deleteDoc(doc(db, 'stories', storyId));
}

// ------------------------- User profile (users/{uid}) -------------------------
export function userDocRef(uid) {
  return doc(db, 'users', uid);
}

/**
 * Ensures a user document has the full default schema for a subscription model:
 * `isPro` (boolean, default false) and `role` (string, default 'free').
 * Only writes the fields that are missing — existing values are never clobbered.
 */
export async function ensureUserDefaults(uid, data) {
  const updates = {};
  if (data?.isPro === undefined) updates.isPro = false;
  if (!data?.role) updates.role = 'free';
  if (Object.keys(updates).length > 0) {
    await setDoc(doc(db, 'users', uid), updates, { merge: true });
  }
}

/**
 * Persists the user's chosen nickname (signup/onboarding or edit flow).
 * Seeds the full default schema from the start: `isPro: false` + `role: 'free'`,
 * so every newly-created user document is immediately queryable for the Pro gate.
 */
export async function saveNickname(uid, nickname) {
  await setDoc(
    userDocRef(uid),
    { nickname, isPro: false, role: 'free', updatedAt: serverTimestamp() },
    { merge: true }
  );
}

/** Reads today's/yesterday's login streak, persists any change, and returns the current streak. */
export async function syncLoginStreak(uid, data) {
  const today = new Date().toISOString().slice(0, 10);
  if (data.lastLoginDate === today) return data.streak || 0;

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const streak = data.lastLoginDate === yesterday ? (data.streak || 0) + 1 : 1;
  await setDoc(userDocRef(uid), { streak, lastLoginDate: today }, { merge: true });
  return streak;
}

/** Atomically adds to the user's lifetime "words typed" counter. */
export async function recordWordsTyped(uid, count) {
  if (!uid || count <= 0) return;
  userState.wordsTyped += count;
  await setDoc(userDocRef(uid), { wordsTyped: increment(count) }, { merge: true });
}

// ------------------------- Story progress (users/{uid}/progress/{storyId}) -------------------------
function progressDocRef(uid, storyId) {
  return doc(db, 'users', uid, 'progress', storyId);
}

/** Marks a story as completed for the signed-in user (once) and updates the finished-stories count. */
export async function markStoryComplete(storyId) {
  if (!userState.uid) return;
  const alreadyDone = Boolean(userProgress[storyId]);

  await setDoc(progressDocRef(userState.uid, storyId), { isCompleted: true, completedAt: serverTimestamp() }, { merge: true });
  userProgress[storyId] = true;

  if (!alreadyDone) {
    userState.storiesFinished += 1;
    await setDoc(userDocRef(userState.uid), { storiesFinished: increment(1) }, { merge: true });
  }
}

/** Reads a single story's completion status directly from Firestore. */
export async function checkStoryProgress(storyId) {
  if (!userState.uid) return false;
  const snap = await getDoc(progressDocRef(userState.uid, storyId));
  return snap.exists() && snap.data().isCompleted === true;
}

/** Loads every progress doc for the signed-in user into the local render cache. */
export async function loadUserProgress(uid) {
  const snapshot = await getDocs(collection(db, 'users', uid, 'progress'));
  Object.keys(userProgress).forEach((key) => delete userProgress[key]);
  snapshot.forEach((docSnap) => {
    if (docSnap.data().isCompleted) userProgress[docSnap.id] = true;
  });
}
