/* =====================================================================
   Qissah Keyboard — Application entry point.
   Importing these modules runs their self-registering event listeners;
   this file only performs the initial paint and Firestore data load.
   ===================================================================== */

import './auth.js';
import './game.js';
import { render, renderSidebar, renderCourseCards } from './ui.js';
import { renderStudioCategoryOptions } from './studio.js';
import { loadCategoriesAndStories, markStoryComplete, checkStoryProgress } from './db.js';
import { userState, categories, appState } from './state.js';
import { auth, signOut } from './firebase-init.js';

render();

loadCategoriesAndStories().then(() => {
  appState.activeCategory = categories[0]?.id || null;
  renderSidebar();
  renderStudioCategoryOptions();
  renderCourseCards();
});

// Expose state/utilities for quick manual testing from the browser console
window.userState = userState;
window.render = render;
window.markStoryComplete = markStoryComplete;
window.checkStoryProgress = checkStoryProgress;
window.qissahSignOut = () => signOut(auth);
