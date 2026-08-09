/* =====================================================================
   Qissah Keyboard — Developer Studio: story/category creation & editing,
   with a "Normal" scene-by-scene builder and a "Template" free-text mode.
   ===================================================================== */

import { categories, stories } from './state.js';
import { escapeHtml } from './utils.js';
import { createCategory, saveStory, deleteStoryDoc } from './db.js';
import { showView, renderSidebar, renderCourseCards } from './ui.js';

const studioForm = document.getElementById('studio-form');
const studioTitleInput = document.getElementById('studio-title');
const studioCategorySelect = document.getElementById('studio-category');
const studioTierSelect = document.getElementById('studio-tier');
const studioMinutesInput = document.getElementById('studio-minutes');
const studioThumbnailInput = document.getElementById('studio-thumbnail');
const studioAudioUrlInput = document.getElementById('studio-audio-url');
const studioErrorEl = document.getElementById('studio-error');
const studioScenesEl = document.getElementById('studio-scenes');
const studioAddSceneBtn = document.getElementById('studio-add-scene');
const studioTitleHeadingEl = document.getElementById('studio-title-heading');

const studioModeNormalBtn = document.getElementById('studio-mode-normal');
const studioModeTemplateBtn = document.getElementById('studio-mode-template');
const studioNormalModeEl = document.getElementById('studio-normal-mode');
const studioTemplateModeEl = document.getElementById('studio-template-mode');
const studioTemplateTextarea = document.getElementById('studio-template-textarea');

let studioInputMode = 'normal'; // 'normal' | 'template'

function emptyScene() {
  return { en: '', ar: '', image: '', wordsText: '', audioStartText: '', audioEndText: '' };
}

let studioScenes = [emptyScene()];
let studioEditingId = null; // set by editStory(); null means the form creates a new story

// ------------------------- Mode toggle -------------------------
function setStudioMode(mode) {
  studioInputMode = mode;
  studioModeNormalBtn.classList.toggle('is-active', mode === 'normal');
  studioModeTemplateBtn.classList.toggle('is-active', mode === 'template');
  studioNormalModeEl.hidden = mode !== 'normal';
  studioTemplateModeEl.hidden = mode !== 'template';
}

studioModeNormalBtn.addEventListener('click', () => setStudioMode('normal'));
studioModeTemplateBtn.addEventListener('click', () => setStudioMode('template'));

// ------------------------- Template mode parser -------------------------
// Expected format (repeated per scene), case-insensitive labels:
//   Scene 1:
//   -English: ...
//   -Arabic: ...
//   -Image: ...          ← OPTIONAL — may be omitted or blank
//   -Words: word1:trans1, word2:trans2
//   ---
//   0:00 -> 0:10
function parseTimeToSeconds(timeStr) {
  const match = String(timeStr || '').trim().match(/^(\d+):(\d{1,2})$/);
  if (!match) return null;
  const minutes = parseInt(match[1], 10);
  const seconds = parseInt(match[2], 10);
  if (seconds >= 60) return null;
  return minutes * 60 + seconds;
}

function parseTemplateText(text) {
  const blocks = text.split(/Scene\s*\d+\s*:/i).map((block) => block.trim()).filter(Boolean);

  return blocks
    .map((block) => {
      const en = (block.match(/-English:\s*([\s\S]*?)(?=\n-|$)/i) || [])[1] || '';
      const ar = (block.match(/-Arabic:\s*([\s\S]*?)(?=\n-|$)/i) || [])[1] || '';
      // Image is OPTIONAL: if the -Image line is omitted or blank, save an empty string.
      const imageMatch = block.match(/-Image:\s*([^\n]*)/i);
      const image = imageMatch ? imageMatch[1].trim() : '';
      const wordsLine = (block.match(/-Words:\s*([\s\S]*?)(?=\n-|$)/i) || [])[1] || '';

      // Extract the timestamp line after the --- delimiter
      const timeMatch = block.match(/---\s*\n\s*(\d+:\d{1,2})\s*->\s*(\d+:\d{1,2})/i);
      const audioStart = timeMatch ? parseTimeToSeconds(timeMatch[1]) : null;
      const audioEnd = timeMatch ? parseTimeToSeconds(timeMatch[2]) : null;

      const words = {};
      wordsLine.split(',').forEach((pair) => {
        const idx = pair.indexOf(':');
        if (idx === -1) return;
        const word = pair.slice(0, idx).trim().toLowerCase();
        const translation = pair.slice(idx + 1).trim();
        if (word && translation) words[word] = translation;
      });

      return { en: en.trim(), ar: ar.trim(), image, words, audioStart, audioEnd };
    })
    .filter((scene) => scene.en);
}

// ------------------------- Category creation -------------------------
export function renderStudioCategoryOptions() {
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
  try {
    const category = await createCategory(name.trim());
    categories.push(category);
    renderStudioCategoryOptions();
    renderSidebar();
    studioCategorySelect.value = category.id;
  } catch (error) {
    window.alert('تعذر إنشاء التصنيف الجديد.');
  }
});

// ------------------------- Normal mode: scene builder -------------------------
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
          <span class="field__label">رابط صورة المشهد (اختياري)</span>
          <input type="text" class="field__input" data-field="image" data-index="${i}" value="${escapeHtml(scene.image)}" placeholder="assets/image.png (اختياري)">
        </label>
        <label class="field">
          <span class="field__label">ترجمة الكلمات (كل سطر بصيغة word:ترجمة)</span>
          <textarea class="field__input" data-field="wordsText" data-index="${i}" placeholder="story:قصة">${escapeHtml(scene.wordsText)}</textarea>
        </label>
        <div class="studio-scene__audio-fields">
          <label class="field">
            <span class="field__label">بداية الصوت (mm:ss)</span>
            <input type="text" class="field__input" data-field="audioStartText" data-index="${i}" value="${escapeHtml(scene.audioStartText || '')}" placeholder="0:00">
          </label>
          <label class="field">
            <span class="field__label">نهاية الصوت (mm:ss)</span>
            <input type="text" class="field__input" data-field="audioEndText" data-index="${i}" value="${escapeHtml(scene.audioEndText || '')}" placeholder="0:10">
          </label>
        </div>
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

// ------------------------- Error/success messaging -------------------------
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

function resetStudioForm() {
  studioForm.reset();
  studioScenes = [emptyScene()];
  studioEditingId = null;
  studioTitleHeadingEl.textContent = 'استوديو القصص';
  setStudioMode('normal');
  studioTemplateTextarea.value = '';
  renderStudioScenes();
  renderStudioCategoryOptions();
}

// ------------------------- Create / update -------------------------
studioForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearStudioError();

  const title = studioTitleInput.value.trim();
  const category = studioCategorySelect.value;
  if (!title || !category || category === '__new__') {
    showStudioError('يرجى إدخال عنوان القصة واختيار تصنيف صالح.');
    return;
  }

  const scenes = studioInputMode === 'template'
    ? parseTemplateText(studioTemplateTextarea.value)
    : studioScenes
      .filter((scene) => scene.en.trim())
      .map((scene) => ({
        en: scene.en.trim(),
        ar: scene.ar.trim(),
        image: scene.image.trim(),
        words: parseWordsText(scene.wordsText),
        audioStart: parseTimeToSeconds(scene.audioStartText),
        audioEnd: parseTimeToSeconds(scene.audioEndText),
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
    audioUrl: studioAudioUrlInput.value.trim() || '',
    scenes,
  };

  try {
    const saved = await saveStory(story, studioEditingId);
    if (studioEditingId) {
      const index = stories.findIndex((s) => s.id === studioEditingId);
      if (index !== -1) stories[index] = saved;
    } else {
      stories.push(saved);
    }
    renderCourseCards();
    resetStudioForm();
    showStudioSuccess('تم حفظ القصة ونشرها بنجاح!');
  } catch (error) {
    showStudioError('تعذر حفظ القصة. حاول مرة أخرى.');
  }
});

// ------------------------- Edit / delete (called from course card dev buttons) -------------------------
export function editStory(storyId) {
  const story = stories.find((s) => s.id === storyId);
  if (!story) return;

  studioEditingId = storyId;
  studioTitleHeadingEl.textContent = 'تعديل القصة';
  studioTitleInput.value = story.title;
  studioCategorySelect.value = story.category;
  studioTierSelect.value = story.tier;
  studioMinutesInput.value = story.expectedMinutes;
  studioThumbnailInput.value = story.thumbnailUrl || '';
  studioAudioUrlInput.value = story.audioUrl || '';
  studioScenes = story.scenes.map((scene) => ({
    en: scene.en,
    ar: scene.ar,
    image: scene.image || '',
    wordsText: Object.entries(scene.words || {}).map(([word, translation]) => `${word}:${translation}`).join('\n'),
    audioStartText: scene.audioStart != null ? `${Math.floor(scene.audioStart / 60)}:${String(scene.audioStart % 60).padStart(2, '0')}` : '',
    audioEndText: scene.audioEnd != null ? `${Math.floor(scene.audioEnd / 60)}:${String(scene.audioEnd % 60).padStart(2, '0')}` : '',
  }));
  setStudioMode('normal');
  renderStudioScenes();
  clearStudioError();
  showView('studio');
}

export async function deleteStory(storyId) {
  if (!window.confirm('هل أنت متأكد من حذف هذه القصة؟')) return;
  try {
    await deleteStoryDoc(storyId);
    const index = stories.findIndex((s) => s.id === storyId);
    if (index !== -1) stories.splice(index, 1);
    renderCourseCards();
  } catch (error) {
    window.alert('تعذر حذف القصة. حاول مرة أخرى.');
  }
}

renderStudioScenes();
