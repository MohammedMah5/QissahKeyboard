/* =====================================================================
   Qissah Keyboard — Interactive typing gameplay engine.
   ===================================================================== */

import { userState } from './state.js';
import { escapeHtml } from './utils.js';
import { markStoryComplete, recordWordsTyped } from './db.js';
import { showView, renderCourseCards } from './ui.js';

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

const gameState = { story: null, sceneIndex: 0, chars: [], typedIndex: 0, hasError: false, awaitingNext: false, wordsTypedThisStory: 0 };

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

// Matches words AND numbers/dates (e.g. "2024", "12/05/2024", "3.5", "don't", "well-known")
// as single tokens, so the character index used for the live hint always lines up
// with the word the user is actually typing instead of skipping ahead past digits.
const WORD_REGEX = /[A-Za-z0-9]+(?:['.\/-][A-Za-z0-9]+)*/g;

/** Finds the word (current or upcoming) at a given character index for the live dictionary hint. */
function getWordAt(text, index) {
  WORD_REGEX.lastIndex = 0;
  let match;
  while ((match = WORD_REGEX.exec(text))) {
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
      await recordWordsTyped(userState.uid, gameState.wordsTypedThisStory);
    } catch (error) {
      console.error('Failed to save story completion', error);
    }
  }
  completionModal.hidden = false;
}

// Scene is fully typed: show the Next control instead of auto-advancing
function onSceneComplete() {
  gameState.wordsTypedThisStory += 1; // final word of the scene (no trailing space to count it)
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
    if (event.key === ' ') gameState.wordsTypedThisStory += 1; // a space means the previous word was just finished
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

export function openGame(story) {
  if (story.tier === 'pro' && !userState.isPro) {
    window.alert('هذه القصة متاحة لمشتركي الخطة الاحترافية فقط.');
    return;
  }
  if (!userState.isLoggedIn) {
    showView('auth');
    return;
  }

  gameState.story = story;
  gameState.wordsTypedThisStory = 0;
  completionModal.hidden = true;
  showView('game');
  ensureAudioReady();
  loadScene(0);
  document.addEventListener('keydown', handleTyping);
}

/** Removes the typing keydown listener; exported so ui.js can call it from any navigation-away path. */
export function stopTyping() {
  document.removeEventListener('keydown', handleTyping);
}

function exitGame() {
  stopTyping();
  showView('browse');
  renderCourseCards();
}

gameExitBtn.addEventListener('click', exitGame);
completionCloseBtn.addEventListener('click', () => {
  completionModal.hidden = true;
  exitGame();
});
