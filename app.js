/* =====================================================================
   Qissah Keyboard — Application Logic (vanilla JS ES module)
   Handles view routing, Firebase Auth + Firestore, the Developer Studio,
   and the interactive typing gameplay engine.
   ===================================================================== */

import {
  auth,
  db,
  googleProvider,
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
  writeBatch,
  serverTimestamp,
} from './firebase-init.js';
import { seedCategories, seedStories } from './seed-data.js';

// Hardcoded admin recognition: this account always gets Developer Studio access
const ADMIN_EMAIL = 'mohmedahmeduae1@gmail.com';

// ------------------------- Application state -------------------------
// `uid`/`name`/`isDeveloper` are populated from Firebase; `isPro` stays a local
// mock toggle (not persisted) so tier-gated UI stays easy to test.
const userState = {
  isLoggedIn: false,
  isPro: false,
  isDeveloper: false,
  devPreviewAsUser: false,
  uid: null,
  name: '',
};

// Cache of { [storyId]: true } for the signed-in user, loaded from Firestore
let userProgress = {};

// Categories & stories loaded from Firestore (or the local seed as an offline fallback)
let categories = [];
let stories = [];
let activeCategory = null;

// ------------------------- Element references -------------------------
const views = {
  landing: document.getElementById('view-landing'),
  auth: document.getElementById('view-auth'),
  browse: document.getElementById('view-browse'),
  nickname: document.getElementById('view-nickname'),
  studio: document.getElementById('view-studio'),
  game: document.getElementById('view-game'),
};

const navAbout = document.getElementById('nav-about');
const navBrowse = document.getElementById('nav-browse');
const navUpgrade = document.getElementById('nav-upgrade');
const navStudio = document.getElementById('nav-studio');
const navDevToggle = document.getElementById('nav-dev-toggle');
const navAuthGuest = document.getElementById('nav-auth-guest');
const navbarUser = document.getElementById('navbar-user');
const navAuthUser = document.getElementById('nav-auth-user');
const navEditNickname = document.getElementById('nav-edit-nickname');

const heroCta = document.getElementById('hero-cta');

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

const browseSidebarEl = document.getElementById('browse-sidebar');
const browseGrid = document.getElementById('browse-grid');

const studioForm = document.getElementById('studio-form');
const studioTitleInput = document.getElementById('studio-title');
const studioCategorySelect = document.getElementById('studio-category');
const studioTierSelect = document.getElementById('studio-tier');
const studioMinutesInput = document.getElementById('studio-minutes');
const studioThumbnailInput = document.getElementById('studio-thumbnail');
const studioErrorEl = document.getElementById('studio-error');
const studioScenesEl = document.getElementById('studio-scenes');
const studioAddSceneBtn = document.getElementById('studio-add-scene');
const studioTitleHeadingEl = document.getElementById('studio-title-heading');

const gameHintEl = document.getElementById('game-hint');
const gameExitBtn = document.getElementById('game-exit');
const gameProgressEl = document.getElementById('game-progress');
const gameImageEl = document.getElementById('game-image');
const gamePromptEl = document.getElementById('game-prompt');
const gameTranslationEl = document.getElementById('game-translation');
const gameNextEl = document.getElementById('game-next');
const gameNextBtn = document.getElementById('game-next-btn');
const completionModal = document.getElementById('completion-modal');
const completionCloseBtn = document.getElementById('completion-close-btn');

// Tracks which view to return to once the nickname screen closes (edit mode only)
let nicknameReturnView = 'browse';
let isFirstTimeOnboarding = false;

// ------------------------- Small utilities -------------------------
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
  ));
}

// ------------------------- View routing -------------------------
function showView(name) {
  // Bug fix: any navigation away from the typing level must drop its keydown listener,
  // otherwise keystrokes/audio keep firing in the background (e.g. while typing in the Studio).
  if (getCurrentViewName() === 'game' && name !== 'game') {
    document.removeEventListener('keydown', handleTyping);
  }

  Object.entries(views).forEach(([key, section]) => {
    section.hidden = key !== name;
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function getCurrentViewName() {
  const entry = Object.entries(views).find(([, section]) => !section.hidden);
  return entry ? entry[0] : 'browse';
}

// ------------------------- Render: Navbar -------------------------
function renderNavbar() {
  // "ترقية" only shows for logged-in users still on the free tier
  navUpgrade.hidden = !(userState.isLoggedIn && !userState.isPro);

  // Developer-only controls: Studio access + a switch to preview as a normal user
  const isDevActive = userState.isLoggedIn && userState.isDeveloper;
  const isDevViewOn = isDevActive && !userState.devPreviewAsUser;
  navDevToggle.hidden = !isDevActive;
  navDevToggle.textContent = userState.devPreviewAsUser ? 'وضع المطور' : 'معاينة كمستخدم';
  navStudio.hidden = !isDevViewOn;
  document.body.classList.toggle('dev-mode-active', isDevViewOn);

  if (userState.isLoggedIn) {
    navAuthGuest.hidden = true;
    navbarUser.hidden = false;
    navAuthUser.textContent = userState.name;
  } else {
    navAuthGuest.hidden = false;
    navbarUser.hidden = true;
  }
}

// ------------------------- Render: Browse sidebar (dynamic categories) -------------------------
function renderSidebar() {
  browseSidebarEl.innerHTML = categories
    .map(
      (cat) => `<button class="category-btn ${cat.id === activeCategory ? 'is-active' : ''}" data-category="${cat.id}">${escapeHtml(cat.name)}</button>`
    )
    .join('');

  browseSidebarEl.querySelectorAll('.category-btn').forEach((button) => {
    button.addEventListener('click', () => {
      activeCategory = button.dataset.category;
      browseSidebarEl.querySelectorAll('.category-btn').forEach((btn) => btn.classList.toggle('is-active', btn === button));
      renderCourseCards();
    });
  });
}

// ------------------------- Render: Course cards -------------------------
function renderCourseCards() {
  const courses = stories.filter((story) => story.category === activeCategory);
  const devControlsOn = userState.isDeveloper && !userState.devPreviewAsUser;

  browseGrid.innerHTML = courses
    .map((course) => {
      const isCompleted = Boolean(userProgress[course.id]);
      const isPro = course.tier === 'pro';
      return `
      <article class="course-card ${isCompleted ? 'is-completed' : ''}" data-story-id="${course.id}">
        <div class="course-card__image" style="background-image: url('${course.thumbnailUrl || ''}')">
          <button
            class="course-card__check-btn ${isCompleted ? 'is-completed' : ''}"
            data-story-id="${course.id}"
            title="${isCompleted ? 'تم إنجاز القصة' : 'وضع علامة كمكتمل'}"
            ${isCompleted ? 'disabled' : ''}
          >
            <i class="fa-solid fa-check"></i>
          </button>
        </div>
        <div class="course-card__body">
          <h3 class="course-card__title">${escapeHtml(course.title)}</h3>
          <div class="course-card__footer">
            <span class="course-card__tier ${isPro ? 'is-pro' : ''}">${isPro ? 'احترافي' : 'مجاني'}</span>
            <span class="course-card__time">
              <i class="fa-regular fa-clock"></i>
              ${course.expectedMinutes} دقائق
            </span>
          </div>
          ${devControlsOn ? `
          <div class="course-card__dev-actions">
            <button type="button" class="course-card__dev-btn" data-edit-id="${course.id}">تعديل</button>
            <button type="button" class="course-card__dev-btn course-card__dev-btn--danger" data-delete-id="${course.id}">حذف</button>
          </div>` : ''}
        </div>
      </article>`;
    })
    .join('');

  // "Mark complete" toggle (manual override, independent of the typing game)
  browseGrid.querySelectorAll('.course-card__check-btn').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.stopPropagation();
      markStoryComplete(btn.dataset.storyId);
    });
  });

  // Developer-only: edit an existing story in the Studio, or delete it after confirmation
  browseGrid.querySelectorAll('[data-edit-id]').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.stopPropagation();
      editStory(btn.dataset.editId);
    });
  });
  browseGrid.querySelectorAll('[data-delete-id]').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.stopPropagation();
      deleteStory(btn.dataset.deleteId);
    });
  });

  // Clicking anywhere else on the card opens the interactive typing level
  browseGrid.querySelectorAll('.course-card').forEach((card) => {
    card.addEventListener('click', () => {
      const story = stories.find((s) => s.id === card.dataset.storyId);
      if (story) openGame(story);
    });
  });
}

/** Deletes a story from Firestore (after confirmation) and refreshes the Browse grid. */
async function deleteStory(storyId) {
  if (!window.confirm('هل أنت متأكد من حذف هذه القصة؟')) return;
  try {
    await deleteDoc(doc(db, 'stories', storyId));
    stories = stories.filter((s) => s.id !== storyId);
    renderCourseCards();
  } catch (error) {
    window.alert('تعذر حذف القصة. حاول مرة أخرى.');
  }
}

/** Opens the Studio pre-filled with an existing story's data so it can be updated. */
function editStory(storyId) {
  const story = stories.find((s) => s.id === storyId);
  if (!story) return;

  studioEditingId = storyId;
  studioTitleHeadingEl.textContent = 'تعديل القصة';
  studioTitleInput.value = story.title;
  studioCategorySelect.value = story.category;
  studioTierSelect.value = story.tier;
  studioMinutesInput.value = story.expectedMinutes;
  studioThumbnailInput.value = story.thumbnailUrl || '';
  studioScenes = story.scenes.map((scene) => ({
    en: scene.en,
    ar: scene.ar,
    image: scene.image || '',
    wordsText: Object.entries(scene.words || {}).map(([word, translation]) => `${word}:${translation}`).join('\n'),
  }));
  renderStudioScenes();
  clearStudioError();
  showView('studio');
}

// ------------------------- Master render -------------------------
function render() {
  renderNavbar();
  renderCourseCards();
}

// ------------------------- Firestore: categories & stories -------------------------
async function seedDatabase() {
  const batch = writeBatch(db);
  seedCategories.forEach(({ id, ...data }) => batch.set(doc(db, 'categories', id), data));
  seedStories.forEach(({ id, ...data }) => batch.set(doc(db, 'stories', id), data));
  await batch.commit();
}

async function loadCategoriesAndStories() {
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
    }

    categories = catSnap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.order || 0) - (b.order || 0));
    stories = storySnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    // Fallback initialization: Firestore unreachable or rules blocked the read/seed
    console.error('Using local seed data — Firestore categories/stories unavailable:', error);
    categories = seedCategories;
    stories = seedStories;
  }

  activeCategory = categories[0]?.id || null;
  renderSidebar();
  renderStudioCategoryOptions();
  renderCourseCards();
}

// ------------------------- Firestore: user profile (users/{uid}) -------------------------
function userDocRef(uid) {
  return doc(db, 'users', uid);
}

async function saveNickname(uid, nickname) {
  await setDoc(userDocRef(uid), { nickname, updatedAt: serverTimestamp() }, { merge: true });
}

// ------------------------- Firestore: story progress (users/{uid}/progress/{storyId}) -------------------------
function progressDocRef(uid, storyId) {
  return doc(db, 'users', uid, 'progress', storyId);
}

/** Marks a story as completed for the signed-in user and refreshes the Browse UI. */
async function markStoryComplete(storyId) {
  if (!userState.uid) return;
  await setDoc(
    progressDocRef(userState.uid, storyId),
    { isCompleted: true, completedAt: serverTimestamp() },
    { merge: true }
  );
  userProgress[storyId] = true;
  renderCourseCards();
}

/** Reads a single story's completion status directly from Firestore. */
async function checkStoryProgress(storyId) {
  if (!userState.uid) return false;
  const snap = await getDoc(progressDocRef(userState.uid, storyId));
  return snap.exists() && snap.data().isCompleted === true;
}

/** Loads every progress doc for the signed-in user into the local render cache. */
async function loadUserProgress(uid) {
  userProgress = {};
  const snapshot = await getDocs(collection(db, 'users', uid, 'progress'));
  snapshot.forEach((docSnap) => {
    if (docSnap.data().isCompleted) userProgress[docSnap.id] = true;
  });
}

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

/** Runs whenever Firebase reports a signed-in user; syncs their Firestore profile (incl. role) and loads it. */
async function ensureUserProfile(user) {
  userState.uid = user.uid;
  const ref = userDocRef(user.uid);

  // Keep `role` database-driven: derive it from the admin email and persist it on
  // every sign-in so Firestore rules (not just this client) can trust the field.
  const role = user.email === ADMIN_EMAIL ? 'admin' : 'user';
  await setDoc(ref, { role }, { merge: true });

  const snap = await getDoc(ref);
  const data = snap.data();
  userState.isDeveloper = data.role === 'admin';

  if (data.nickname) {
    userState.isLoggedIn = true;
    userState.name = data.nickname;
    await loadUserProgress(user.uid);
    render();
    // Returning users land on the Browse page once signed in from the Auth screen
    if (getCurrentViewName() === 'auth') showView('browse');
  } else {
    // First-time login via any provider: intercept routing with the nickname screen
    userProgress = {};
    openNicknameScreen({ mode: 'setup' });
  }
}

function handleSignedOut() {
  userState.isLoggedIn = false;
  userState.uid = null;
  userState.name = '';
  userState.isDeveloper = false;
  userState.devPreviewAsUser = false;
  userProgress = {};
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

// ------------------------- General navigation -------------------------
navAbout.addEventListener('click', () => showView('landing'));
navBrowse.addEventListener('click', () => showView('browse'));
heroCta.addEventListener('click', () => showView('browse'));
navAuthGuest.addEventListener('click', () => showView('auth'));
navStudio.addEventListener('click', () => showView('studio'));

navDevToggle.addEventListener('click', () => {
  userState.devPreviewAsUser = !userState.devPreviewAsUser;
  renderNavbar();
  if (userState.devPreviewAsUser && getCurrentViewName() === 'studio') showView('browse');
});

// Mock upgrade: moves the logged-in user from free to pro tier (kept local, not persisted)
navUpgrade.addEventListener('click', () => {
  userState.isPro = true;
  render();
});

// ------------------------- Developer Studio: category + scene builder -------------------------
function emptyScene() {
  return { en: '', ar: '', image: '', wordsText: '' };
}

let studioScenes = [emptyScene()];
let studioEditingId = null; // set by editStory(); null means the form creates a new story

function renderStudioCategoryOptions() {
  const options = categories.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
  studioCategorySelect.innerHTML = `${options}<option value="__new__">+ إضافة تصنيف جديد</option>`;
}

studioCategorySelect.addEventListener('change', async () => {
  if (studioCategorySelect.value !== '__new__') return;
  const name = window.prompt('اسم التصنيف الجديد:');
  if (!name || !name.trim()) {
    studioCategorySelect.value = categories[0]?.id || '';
    return;
  }
  const id = `cat-${Date.now()}`;
  try {
    await setDoc(doc(db, 'categories', id), { name: name.trim(), order: categories.length + 1 });
    categories.push({ id, name: name.trim(), order: categories.length + 1 });
    renderStudioCategoryOptions();
    renderSidebar();
    studioCategorySelect.value = id;
  } catch (error) {
    window.alert('تعذر إنشاء التصنيف الجديد.');
  }
});

function renderStudioScenes() {
  studioScenesEl.innerHTML = studioScenes
    .map(
      (scene, i) => `
      <div class="studio-scene">
        <div class="studio-scene__header">
          <span>مشهد ${i + 1}</span>
          ${studioScenes.length > 1 ? `<button type="button" class="studio-scene__remove" data-remove="${i}">حذف</button>` : ''}
        </div>
        <label class="field">
          <span class="field__label">النص الإنجليزي (3 أسطر كحد أقصى)</span>
          <textarea class="field__input" data-field="en" data-index="${i}" rows="3" maxlength="180">${escapeHtml(scene.en)}</textarea>
        </label>
        <label class="field">
          <span class="field__label">الترجمة العربية</span>
          <textarea class="field__input" data-field="ar" data-index="${i}">${escapeHtml(scene.ar)}</textarea>
        </label>
        <label class="field">
          <span class="field__label">رابط صورة المشهد</span>
          <input type="url" class="field__input" data-field="image" data-index="${i}" value="${escapeHtml(scene.image)}" placeholder="https://...">
        </label>
        <label class="field">
          <span class="field__label">ترجمة الكلمات (كل سطر بصيغة word:ترجمة)</span>
          <textarea class="field__input" data-field="wordsText" data-index="${i}" placeholder="cybersecurity:الأمن السيبراني">${escapeHtml(scene.wordsText)}</textarea>
        </label>
      </div>`
    )
    .join('');

  studioScenesEl.querySelectorAll('[data-field]').forEach((el) => {
    el.addEventListener('input', () => {
      studioScenes[Number(el.dataset.index)][el.dataset.field] = el.value;
    });
  });

  studioScenesEl.querySelectorAll('[data-remove]').forEach((btn) => {
    btn.addEventListener('click', () => {
      studioScenes.splice(Number(btn.dataset.remove), 1);
      renderStudioScenes();
    });
  });
}

studioAddSceneBtn.addEventListener('click', () => {
  studioScenes.push(emptyScene());
  renderStudioScenes();
});

function parseWordsText(text) {
  const map = {};
  text.split('\n').forEach((line) => {
    const idx = line.indexOf(':');
    if (idx === -1) return;
    const word = line.slice(0, idx).trim().toLowerCase();
    const translation = line.slice(idx + 1).trim();
    if (word && translation) map[word] = translation;
  });
  return map;
}

function showStudioError(message) {
  studioErrorEl.textContent = message;
  studioErrorEl.className = 'auth-error';
  studioErrorEl.hidden = false;
}

function showStudioSuccess(message) {
  studioErrorEl.textContent = message;
  studioErrorEl.className = 'studio-success';
  studioErrorEl.hidden = false;
}

function clearStudioError() {
  studioErrorEl.hidden = true;
}

studioForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearStudioError();

  const title = studioTitleInput.value.trim();
  const category = studioCategorySelect.value;
  if (!title || !category || category === '__new__') {
    showStudioError('يرجى إدخال عنوان القصة واختيار تصنيف صالح.');
    return;
  }

  const scenes = studioScenes
    .filter((scene) => scene.en.trim())
    .map((scene) => ({
      en: scene.en.trim(),
      ar: scene.ar.trim(),
      image: scene.image.trim(),
      words: parseWordsText(scene.wordsText),
    }));

  if (scenes.length === 0) {
    showStudioError('أضف مشهدًا واحدًا على الأقل قبل النشر.');
    return;
  }

  const story = {
    title,
    category,
    tier: studioTierSelect.value,
    expectedMinutes: Number(studioMinutesInput.value) || 10,
    thumbnailUrl: studioThumbnailInput.value.trim() || scenes[0].image || '',
    scenes,
    createdAt: serverTimestamp(),
  };

  try {
    if (studioEditingId) {
      await setDoc(doc(db, 'stories', studioEditingId), story);
      const index = stories.findIndex((s) => s.id === studioEditingId);
      if (index !== -1) stories[index] = { id: studioEditingId, ...story };
    } else {
      const ref = await addDoc(collection(db, 'stories'), story);
      stories.push({ id: ref.id, ...story });
    }
    renderCourseCards();
    studioForm.reset();
    studioScenes = [emptyScene()];
    studioEditingId = null;
    studioTitleHeadingEl.textContent = 'استوديو القصص';
    renderStudioScenes();
    renderStudioCategoryOptions();
    showStudioSuccess('تم حفظ القصة ونشرها بنجاح!');
  } catch (error) {
    showStudioError('تعذر حفظ القصة. حاول مرة أخرى.');
  }
});

renderStudioScenes();

// ------------------------- Interactive typing gameplay engine -------------------------
const gameState = { story: null, sceneIndex: 0, chars: [], typedIndex: 0, hasError: false, awaitingNext: false };

let audioCtx = null;
let keySoundBuffer = null;
let keySoundSlices = [];

/** Loads the mechanical-keyboard sound sprite once, lazily (requires a user gesture to unlock audio). */
async function ensureAudioReady() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  try {
    const [soundRes, configRes] = await Promise.all([
      fetch('./Assets/cherrymx-red-abs/sound.mp3'),
      fetch('./Assets/cherrymx-red-abs/config.json'),
    ]);
    const [arrayBuffer, config] = await Promise.all([soundRes.arrayBuffer(), configRes.json()]);
    keySoundBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    keySoundSlices = Object.values(config.defines || {});
  } catch (error) {
    console.error('Failed to load keystroke sound sprite', error);
  }
}

/** Plays a random slice from the keystroke sound sprite with zero-latency (fresh buffer source per call). */
function playKeySound() {
  if (!audioCtx || !keySoundBuffer || keySoundSlices.length === 0) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const [startMs, durationMs] = keySoundSlices[Math.floor(Math.random() * keySoundSlices.length)];
  const source = audioCtx.createBufferSource();
  source.buffer = keySoundBuffer;
  source.connect(audioCtx.destination);
  source.start(0, startMs / 1000, durationMs / 1000);
}

/** Finds the word (current or upcoming) at a given character index for the live dictionary hint. */
function getWordAt(text, index) {
  const regex = /[A-Za-z']+/g;
  let match;
  while ((match = regex.exec(text))) {
    if (index < match.index + match[0].length) return match[0];
  }
  return null;
}

function skipAutoNewlines() {
  while (gameState.typedIndex < gameState.chars.length && gameState.chars[gameState.typedIndex] === '\n') {
    gameState.typedIndex++;
  }
}

function renderPrompt() {
  gamePromptEl.innerHTML = gameState.chars
    .map((ch, i) => {
      if (ch === '\n') return '<br>';
      let cls = '';
      if (i < gameState.typedIndex) cls = 'char--correct';
      else if (i === gameState.typedIndex) cls = gameState.hasError ? 'char--error char--active' : 'char--active';
      const glyph = ch === ' ' ? '&nbsp;' : escapeHtml(ch);
      return `<span class="${cls}">${glyph}</span>`;
    })
    .join('');
}

function updateHint() {
  const scene = gameState.story.scenes[gameState.sceneIndex];
  const word = getWordAt(scene.en, gameState.typedIndex);
  const translation = word && scene.words && scene.words[word.toLowerCase()];
  if (word && translation) {
    gameHintEl.innerHTML = `<span class="game-hint__word">${escapeHtml(word)}</span>${escapeHtml(translation)}`;
    gameHintEl.hidden = false;
  } else {
    gameHintEl.hidden = true;
  }
}

function loadScene(index) {
  const scene = gameState.story.scenes[index];
  gameState.sceneIndex = index;
  gameState.chars = Array.from(scene.en);
  gameState.typedIndex = 0;
  gameState.hasError = false;
  gameState.awaitingNext = false;
  gameNextEl.hidden = true;
  skipAutoNewlines();

  gameImageEl.style.backgroundImage = `url('${scene.image || gameState.story.thumbnailUrl || ''}')`;
  gameTranslationEl.textContent = scene.ar || '';
  gameProgressEl.textContent = `المشهد ${index + 1} من ${gameState.story.scenes.length}`;
  renderPrompt();
  updateHint();
}

async function finishStory() {
  document.removeEventListener('keydown', handleTyping);
  gameHintEl.hidden = true;
  gameNextEl.hidden = true;
  if (userState.uid) {
    try {
      await markStoryComplete(gameState.story.id);
    } catch (error) {
      console.error('Failed to save story completion', error);
    }
  }
  completionModal.hidden = false;
}

// Scene is fully typed: show the Next control instead of auto-advancing
function onSceneComplete() {
  gameState.awaitingNext = true;
  gameHintEl.hidden = true;
  gameNextEl.hidden = false;
}

function advanceAfterScene() {
  if (!gameState.awaitingNext) return;
  gameNextEl.hidden = true;
  gameState.awaitingNext = false;
  if (gameState.sceneIndex < gameState.story.scenes.length - 1) {
    loadScene(gameState.sceneIndex + 1);
  } else {
    finishStory();
  }
}

gameNextBtn.addEventListener('click', advanceAfterScene);

function handleTyping(event) {
  // Scene finished: only Enter (to advance) does anything until the next scene loads
  if (gameState.awaitingNext) {
    if (event.key === 'Enter') {
      event.preventDefault();
      advanceAfterScene();
    }
    return;
  }

  if (event.ctrlKey || event.metaKey || event.altKey) return;

  if (event.key === 'Backspace') {
    event.preventDefault();
    playKeySound();
    if (gameState.hasError) {
      gameState.hasError = false;
    } else if (gameState.typedIndex > 0) {
      gameState.typedIndex--;
      while (gameState.typedIndex > 0 && gameState.chars[gameState.typedIndex] === '\n') gameState.typedIndex--;
    }
    renderPrompt();
    updateHint();
    return;
  }

  if (event.key.length !== 1) return; // ignore Shift/Tab/Enter/arrows/etc.
  event.preventDefault();
  playKeySound();

  const expected = gameState.chars[gameState.typedIndex];
  if (event.key === expected) {
    gameState.hasError = false;
    gameState.typedIndex++;
    skipAutoNewlines();
    renderPrompt();
    updateHint();
    if (gameState.typedIndex >= gameState.chars.length) onSceneComplete();
  } else {
    gameState.hasError = true;
    renderPrompt();
  }
}

function openGame(story) {
  if (story.tier === 'pro' && !userState.isPro) {
    window.alert('هذه القصة متاحة لمشتركي الخطة الاحترافية فقط.');
    return;
  }
  if (!userState.isLoggedIn) {
    showView('auth');
    return;
  }

  gameState.story = story;
  completionModal.hidden = true;
  showView('game');
  ensureAudioReady();
  loadScene(0);
  document.addEventListener('keydown', handleTyping);
}

function exitGame() {
  document.removeEventListener('keydown', handleTyping);
  showView('browse');
  renderCourseCards();
}

gameExitBtn.addEventListener('click', exitGame);
completionCloseBtn.addEventListener('click', () => {
  completionModal.hidden = true;
  exitGame();
});

// ------------------------- Initial paint -------------------------
render();
loadCategoriesAndStories();

// Expose state/utilities for quick manual testing from the browser console
window.userState = userState;
window.render = render;
window.markStoryComplete = markStoryComplete;
window.checkStoryProgress = checkStoryProgress;
window.qissahSignOut = () => signOut(auth);
