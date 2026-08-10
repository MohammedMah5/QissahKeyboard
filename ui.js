/* =====================================================================
   Qissah Keyboard — View routing + rendering (navbar, sidebar, course cards,
   stats bar). Owns all "general" navigation wiring that isn't specific to
   auth/game/studio.
   ===================================================================== */

import { userState, userProgress, categories, stories, appState } from './state.js';
import { escapeHtml, resolveImage } from './utils.js';
import { markStoryComplete } from './db.js';
import { openGame, stopTyping } from './game.js';
import { editStory, deleteStory } from './studio.js';
import { openUpgradeModal } from './license.js';

// ------------------------- Element references -------------------------
const views = {
  landing: document.getElementById('view-landing'),
  auth: document.getElementById('view-auth'),
  browse: document.getElementById('view-browse'),
  nickname: document.getElementById('view-nickname'),
  studio: document.getElementById('view-studio'),
  game: document.getElementById('view-game'),
  upgrade: document.getElementById('view-upgrade'),
};

const navAbout = document.getElementById('nav-about');
const navBrowse = document.getElementById('nav-browse');
const navUpgrade = document.getElementById('nav-upgrade');
const navStudio = document.getElementById('nav-studio');
const navDevToggle = document.getElementById('nav-dev-toggle');
const navAuthGuest = document.getElementById('nav-auth-guest');
const navbarUser = document.getElementById('navbar-user');
const navAuthUser = document.getElementById('nav-auth-user');

const heroCta = document.getElementById('hero-cta');

const statsBarEl = document.getElementById('stats-bar');
const browseSidebarEl = document.getElementById('browse-sidebar');
const browseGrid = document.getElementById('browse-grid');

// ------------------------- View routing -------------------------
export function showView(name) {
  // Bug fix: any navigation away from the typing level must drop its keydown listener,
  // otherwise keystrokes/audio keep firing in the background (e.g. while typing in the Studio).
  if (getCurrentViewName() === 'game' && name !== 'game') {
    stopTyping();
  }

  Object.entries(views).forEach(([key, section]) => {
    section.hidden = key !== name;
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function getCurrentViewName() {
  const entry = Object.entries(views).find(([, section]) => !section.hidden);
  return entry ? entry[0] : 'browse';
}

// ------------------------- Render: Navbar -------------------------
export function renderNavbar() {
  // The upgrade button is shown for ALL logged-in users:
  //   • Free tier → "افتح جميع القصص!" → opens the activation modal on click
  //   • Pro tier  → "❤️ 😊" badge     → click is a no-op (joyful confirmation)
  navUpgrade.hidden = !userState.isLoggedIn;

  if (userState.isPro) {
    navUpgrade.textContent = '❤️ 😊';
    navUpgrade.classList.add('is-pro-badge');
  } else {
    navUpgrade.textContent = 'افتح جميع القصص!';
    navUpgrade.classList.remove('is-pro-badge');
  }

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

// ------------------------- Render: User stats bar (Browse page) -------------------------
function renderStatsBar() {
  if (!userState.isLoggedIn) {
    statsBarEl.hidden = true;
    return;
  }
  statsBarEl.hidden = false;
  statsBarEl.innerHTML = `
    <div class="stats-bar__item">
      <span class="stats-bar__value">${escapeHtml(userState.name)}</span>
      <span class="stats-bar__label">المستخدم</span>
    </div>
    <div class="stats-bar__item">
      <span class="stats-bar__value">${userState.storiesFinished}</span>
      <span class="stats-bar__label">قصص مكتملة</span>
    </div>
    <div class="stats-bar__item">
      <span class="stats-bar__value">${userState.wordsTyped}</span>
      <span class="stats-bar__label">كلمات مكتوبة</span>
    </div>
    <div class="stats-bar__item">
      <span class="stats-bar__value">${userState.streak}</span>
      <span class="stats-bar__label">أيام متتالية</span>
    </div>
  `;
}

// ------------------------- Render: Browse sidebar (dynamic categories) -------------------------
export function renderSidebar() {
  browseSidebarEl.innerHTML = categories
    .map(
      (cat) => `<button class="category-btn ${cat.id === appState.activeCategory ? 'is-active' : ''}" data-category="${cat.id}">${escapeHtml(cat.name)}</button>`
    )
    .join('');

  browseSidebarEl.querySelectorAll('.category-btn').forEach((button) => {
    button.addEventListener('click', () => {
      appState.activeCategory = button.dataset.category;
      browseSidebarEl.querySelectorAll('.category-btn').forEach((btn) => btn.classList.toggle('is-active', btn === button));
      renderCourseCards();
    });
  });
}

// ------------------------- Render: Course cards -------------------------
export function renderCourseCards() {
  renderStatsBar();

  // Surface data-layer failures instead of silently rendering an empty/mocked grid
  if (appState.dataError) {
    browseGrid.innerHTML = `<div class="data-error">${escapeHtml(appState.dataError)}</div>`;
    return;
  }

  const courses = stories.filter((story) => story.category === appState.activeCategory);
  const devControlsOn = userState.isDeveloper && !userState.devPreviewAsUser;

  browseGrid.innerHTML = courses
    .map((course) => {
      const isCompleted = Boolean(userProgress[course.id]);
      const isPro = course.tier === 'pro';
      const resolvedImage = resolveImage(course.thumbnailUrl);
      const imageStyle = resolvedImage ? ` style="background-image: url('${resolvedImage}')"` : '';
      return `
      <article class="course-card ${isCompleted ? 'is-completed' : ''}" data-story-id="${course.id}">
        <div class="course-card__image"${imageStyle}>
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
      markStoryComplete(btn.dataset.storyId).then(renderCourseCards);
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

// ------------------------- Master render -------------------------
export function render() {
  renderNavbar();
  renderCourseCards();
}

// ------------------------- General navigation -------------------------
navAbout.addEventListener('click', () => showView('landing'));
navBrowse.addEventListener('click', () => showView('browse'));
heroCta.addEventListener('click', () => showView('browse'));
navAuthGuest.addEventListener('click', () => showView('auth'));
navStudio.addEventListener('click', () => showView('studio'));
// Upgrade button: Pro users see a joyful badge (no modal); free users open the activation modal
navUpgrade.addEventListener('click', () => {
  if (userState.isPro) return;
  openUpgradeModal();
});

navDevToggle.addEventListener('click', () => {
  userState.devPreviewAsUser = !userState.devPreviewAsUser;
  renderNavbar();
  if (userState.devPreviewAsUser && getCurrentViewName() === 'studio') showView('browse');
});

// When a lifetime license is successfully activated, refresh the navbar
// (this swaps the free-tier "افتح جميع القصص!" button for the "❤️ 😊" Pro badge).
document.addEventListener('license-activated', () => {
  renderNavbar();
});

