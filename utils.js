/* =====================================================================
   Qissah Keyboard — Small shared helpers with no dependencies.
   ===================================================================== */

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => (
    { '&': '\x26amp;', '<': '\x26lt;', '>': '\x26gt;', '"': '\x26quot;', "'": '\x26#39;' }[ch]
  ));
}

// Bundled placeholder shown when a story/scene has no image (or an invalid path).
// Relative so it resolves correctly on GitHub Pages.
export const DEFAULT_PLACEHOLDER_IMAGE = './Assets/Sample.png';

/** Returns a non-empty image path, or the bundled placeholder as a graceful fallback. */
export function resolveImage(path) {
  return String(path || '').trim() || DEFAULT_PLACEHOLDER_IMAGE;
}
