/* =====================================================================
   Qissah Keyboard — Firebase Auth wiring: sign-in/up/out, the Login/Sign-Up
   toggle, and the nickname onboarding/editing screen.
   ===================================================================== */

import {
  auth,
  googleProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
} from './firebase-init.js';
import { userState, userProgress, resetUserProgress } from './state.js';
import { userDocRef, saveNickname, loadUserProgress, syncLoginStreak } from './db.js';
import { getDoc } from './firebase-init.js';
import { showView, getCurrentViewName, render } from './ui.js';

const authForm = document.getElementById('auth-form');
const authTitleEl = document.getElementById('auth-title');
const authEmailInput = document.getElementById('auth-email');
const authPasswordInput = document.getElementById('auth-password');
const authConfirmField = document.getElementById('auth-confirm-field');
const authConfirmPasswordInput = document.getElementById('auth-confirm-password');
const authErrorEl = document.getElementById('auth-error');
const authSignInBtn = document.getElementById('auth-signin-btn');
const authSignUpBtn = document.getElementById('auth-signup-btn');
const ssoGoogle = document.getElementById('sso-google');
const ssoGoogleLabel = document.getElementById('sso-google-label');

const nicknameForm = document.getElementById('nickname-form');
const nicknameInput = document.getElementById('nickname-input');
const nicknameErrorEl = document.getElementById('nickname-error');
const nicknameCancelBtn = document.getElementById('nickname-cancel');
const nicknameSignOutBtn = document.getElementById('nickname-signout');
const navEditNickname = document.getElementById('nav-edit-nickname');

let nicknameReturnView = 'browse';
let isFirstTimeOnboarding = false;

// ------------------------- Auth error messages -------------------------
function friendlyAuthError(error) {
  const messages = {
    'auth/invalid-email': 'البريد الإلكتروني غير صالح',
    'auth/user-not-found': 'لا يوجد حساب بهذا البريد الإلكتروني',
    'auth/wrong-password': 'كلمة المرور غير صحيحة',
    'auth/invalid-credential': 'بيانات الدخول غير صحيحة',
    'auth/email-already-in-use': 'هذا البريد الإلكتروني مستخدم بالفعل',
    'auth/weak-password': 'كلمة المرور ضعيفة جدًا (6 أحرف على الأقل)',
    'auth/popup-closed-by-user': 'تم إغلاق نافذة تسجيل الدخول',
  };
  return messages[error.code] || 'حدث خطأ ما، الرجاء المحاولة مرة أخرى';
}

function showAuthError(message) {
  authErrorEl.textContent = message;
  authErrorEl.hidden = false;
}

function clearAuthError() {
  authErrorEl.hidden = true;
}

function showNicknameError(message) {
  nicknameErrorEl.textContent = message;
  nicknameErrorEl.hidden = false;
}

function clearNicknameError() {
  nicknameErrorEl.hidden = true;
}

// ------------------------- Onboarding / editing: nickname screen -------------------------
function openNicknameScreen({ mode, currentName = '' }) {
  isFirstTimeOnboarding = mode === 'setup';
  nicknameCancelBtn.hidden = isFirstTimeOnboarding; // first-time setup can't be skipped
  nicknameSignOutBtn.hidden = isFirstTimeOnboarding;
  nicknameInput.value = currentName;
  clearNicknameError();
  showView('nickname');
  nicknameInput.focus();
}

nicknameCancelBtn.addEventListener('click', () => showView(nicknameReturnView));

nicknameSignOutBtn.addEventListener('click', async () => {
  await signOut(auth);
  showView('landing');
});

nicknameForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const nickname = nicknameInput.value.trim();
  if (!nickname || !userState.uid) return;

  try {
    await saveNickname(userState.uid, nickname);
    userState.name = nickname;
    userState.isLoggedIn = true;
    render();
    showView(isFirstTimeOnboarding ? 'browse' : nicknameReturnView);
  } catch (error) {
    showNicknameError(friendlyAuthError(error));
  }
});

navEditNickname.addEventListener('click', () => {
  nicknameReturnView = getCurrentViewName();
  openNicknameScreen({ mode: 'edit', currentName: userState.name });
});

// ------------------------- Firebase Auth wiring -------------------------

// Firestore Security Rules — restrict story writes to admins (role is set below):
//
// match /users/{uid} {
//   allow read, write: if request.auth != null && request.auth.uid == uid;
// }
// match /stories/{storyId} {
//   allow read: if true;
//   allow create, update, delete: if request.auth != null
//     && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
// }

// Bug fix: Firebase can re-fire onAuthStateChanged for the same user (e.g. token refresh).
// Re-running the full profile sync on every firing was the root cause of "isDeveloper"
// (and other profile fields) intermittently resetting mid-session — e.g. right after a
// story-completion write triggered a refresh. Only sync once per signed-in session per uid.
let syncedUid = null;

/** Runs whenever Firebase reports a signed-in user; syncs their Firestore profile (incl. role) and loads it. */
async function ensureUserProfile(user) {
  if (syncedUid === user.uid) return;

  userState.uid = user.uid;
  const ref = userDocRef(user.uid);

  // Developer/admin status is strictly database-driven: read the `role` field
  // from the user's Firestore document. No email-based fallback is used.
  const snap = await getDoc(ref);
  const data = snap.data() || {};
  userState.isDeveloper = data.role === 'admin';

  if (data.nickname) {
    userState.isLoggedIn = true;
    userState.name = data.nickname;
    userState.wordsTyped = data.wordsTyped || 0;
    userState.storiesFinished = data.storiesFinished || 0;
    userState.streak = await syncLoginStreak(user.uid, data);
    await loadUserProgress(user.uid);
    syncedUid = user.uid;
    render();
    // Returning users land on the Browse page once signed in from the Auth screen
    if (getCurrentViewName() === 'auth') showView('browse');
  } else {
    // First-time login via any provider: intercept routing with the nickname screen
    syncedUid = user.uid;
    resetUserProgress();
    openNicknameScreen({ mode: 'setup' });
  }
}

function handleSignedOut() {
  syncedUid = null;
  userState.isLoggedIn = false;
  userState.uid = null;
  userState.name = '';
  userState.isDeveloper = false;
  userState.devPreviewAsUser = false;
  userState.wordsTyped = 0;
  userState.storiesFinished = 0;
  userState.streak = 0;
  resetUserProgress();
  render();
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    ensureUserProfile(user).catch((error) => console.error('Failed to load user profile', error));
  } else {
    handleSignedOut();
  }
});

// ------------------------- Auth modal: Login / Sign Up toggle -------------------------
let authMode = 'login';

function toggleAuthMode() {
  authMode = authMode === 'login' ? 'signup' : 'login';
  const isSignup = authMode === 'signup';

  authTitleEl.textContent = isSignup ? 'التسجيل' : 'تسجيل الدخول';
  authSignInBtn.textContent = isSignup ? 'التسجيل' : 'تسجيل الدخول';
  authSignUpBtn.textContent = isSignup ? 'لديك حساب؟ سجل الدخول' : 'إنشاء حساب جديد';
  ssoGoogleLabel.textContent = isSignup ? 'التسجيل عبر Google' : 'الدخول عبر Google';

  authConfirmField.hidden = !isSignup;
  authConfirmPasswordInput.required = isSignup;

  authEmailInput.value = '';
  authPasswordInput.value = '';
  authConfirmPasswordInput.value = '';
  clearAuthError();
}

authSignUpBtn.addEventListener('click', toggleAuthMode);

// Email/password sign-in or sign-up, branching on the current toggle state
authForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearAuthError();

  if (authMode === 'signup') {
    if (authPasswordInput.value !== authConfirmPasswordInput.value) {
      showAuthError('كلمة المرور وتأكيدها غير متطابقين');
      return;
    }
    try {
      await createUserWithEmailAndPassword(auth, authEmailInput.value.trim(), authPasswordInput.value);
    } catch (error) {
      showAuthError(friendlyAuthError(error));
    }
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, authEmailInput.value.trim(), authPasswordInput.value);
  } catch (error) {
    showAuthError(friendlyAuthError(error));
  }
});

// Google sign-in
ssoGoogle.addEventListener('click', async () => {
  clearAuthError();
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (error) {
    showAuthError(friendlyAuthError(error));
  }
});
