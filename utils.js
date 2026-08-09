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

/**
 * Returns a non-empty image path, or the bundled placeholder as a graceful fallback.
 * Local relative paths (e.g. "assets/cover.png" or "./assets/cover.png") are passed
 * through exactly as provided — no leading root slash is prepended — so they resolve
 * correctly on GitHub Pages. Absolute http(s) URLs are left untouched.
 */
export function resolveImage(path) {
  const raw = String(path || '').trim();
  if (!raw) return DEFAULT_PLACEHOLDER_IMAGE;

  // Strip any accidental leading "/" so relative paths stay relative (GitHub Pages-safe).
  // Absolute URLs (http/https, data:, etc.) are preserved as-is.
  if (!/^(https?:|data:|blob:)/i.test(raw)) {
    return raw.replace(/^\/+/, './');
  }
  return raw;
}
