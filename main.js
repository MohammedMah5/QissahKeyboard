/* =====================================================================
   Qissah Keyboard — Application entry point.
   Importing these modules runs their self-registering event listeners;
   this file only performs the initial paint and Firestore data load.
   ===================================================================== */

import './auth.js';
import './game.js';
import './license.js';
import { render, renderSidebar, renderCourseCards } from './ui.js';
import { renderStudioCategoryOptions } from './studio.js';
import { loadCategoriesAndStories, markStoryComplete, checkStoryProgress } from './db.js';
import { userState, categories, appState } from './state.js';
import { auth, signOut } from './firebase-init.js';

render();

// ------------------------- Landing typing demo animation -------------------------
// Lightweight JS-driven typing simulation for the PAS marketing terminal.
// Cycles through 3 story snippets, typing each character by character. The
// translation tooltip stays visible the whole time, and updates to show the
// Arabic translation of EVERY word the moment the cursor enters that word.
// After the sentence ends, pause 2s, then advance to the next variation.
(function initTypingDemo() {
  const typedEl = document.getElementById('pas-demo-typed');
  const cursorEl = document.getElementById('pas-demo-cursor');
  const tooltipEl = document.getElementById('pas-demo-tooltip');
  const tooltipWordEl = document.getElementById('pas-demo-tooltip-word');
  const tooltipTranslationEl = document.getElementById('pas-demo-tooltip-translation');
  if (!typedEl || !cursorEl || !tooltipEl || !tooltipWordEl || !tooltipTranslationEl) return;

  const TYPE_DELAY = 140; // ms per character
  const PAUSE_DELAY = 2000; // ms pause between sentences

  const DEMO_SENTENCES = [
    {
      text: 'The boy walked',
      words: { 'the': 'ال', 'boy': 'الولد', 'walked': 'مشى' },
    },
    {
      text: 'The house is expensive',
      words: { 'the': 'ال', 'house': 'منزل', 'is': 'هو', 'expensive': 'باهظ' },
    },
    {
      text: 'The plate is big',
      words: { 'the': 'ال', 'plate': 'طبق', 'is': 'هو', 'big': 'كبير' },
    },
  ];

  // Compute [start, end) character ranges for each word in a sentence.
  function computeWordRanges(text) {
    const ranges = [];
    const regex = /[A-Za-z0-9]+(?:['.\/-][A-Za-z0-9]+)*/g;
    let match;
    while ((match = regex.exec(text))) {
      ranges.push({ word: match[0], start: match.index, end: match.index + match[0].length });
    }
    return ranges;
  }

  const demos = DEMO_SENTENCES.map((s) => ({
    text: s.text,
    words: s.words,
    ranges: computeWordRanges(s.text),
  }));

  // Approximate per-character width of the monospace 1.3rem demo font (LTR).
  const CHAR_PX = 12.5;
  const BODY_PADDING = 24;

  let demoIndex = 0;
  let charIndex = 0;
  let timeoutId = null;

  // Remember the last word whose translation is shown so the tooltip stays
  // continuously visible (even on spaces between words) while typing.
  let lastRange = null;

  function findWordAt(index) {
    const demo = demos[demoIndex];
    return demo.ranges.find((r) => index >= r.start && index < r.end) || null;
  }

  function updateTooltip() {
    const demo = demos[demoIndex];
    // Use the latest typed character index (charIndex was already incremented).
    const range = findWordAt(Math.max(charIndex - 1, 0));
    // If we're between words (on a space), keep showing the previous word.
    const activeRange = range || lastRange;

    if (activeRange) {
      const translation = demo.words[activeRange.word.toLowerCase()];
      if (translation) {
        tooltipWordEl.textContent = activeRange.word;
        tooltipTranslationEl.textContent = translation;
        // Position the tooltip above the word currently being typed.
        tooltipEl.style.left = `${BODY_PADDING + activeRange.start * CHAR_PX}px`;
        tooltipEl.hidden = false;
        tooltipEl.classList.add('is-visible');
        lastRange = activeRange;
        return;
      }
    }
    tooltipEl.classList.remove('is-visible');
    tooltipEl.hidden = true;
    lastRange = null;
  }

  function reset() {
    typedEl.textContent = '';
    tooltipEl.classList.remove('is-visible');
    tooltipEl.hidden = true;
    charIndex = 0;
    lastRange = null;
  }

  function tick() {
    const demo = demos[demoIndex];
    typedEl.textContent = demo.text.slice(0, charIndex + 1);
    charIndex++;
    updateTooltip();

    if (charIndex < demo.text.length) {
      timeoutId = setTimeout(tick, TYPE_DELAY);
    } else {
      // Sentence finished — keep the last tooltip visible briefly, then move on.
      timeoutId = setTimeout(() => {
        tooltipEl.classList.remove('is-visible');
        tooltipEl.hidden = true;
        timeoutId = setTimeout(() => {
          demoIndex = (demoIndex + 1) % demos.length;
          reset();
          timeoutId = setTimeout(tick, TYPE_DELAY);
        }, PAUSE_DELAY);
      }, 1200);
    }
  }

  // Start the loop (staggered so it doesn't fire before first paint impact).
  timeoutId = setTimeout(tick, TYPE_DELAY);
})();

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
