// Unified inline notification helpers
// Usage: showInlineError('element-id', 'Message') or showInlineError(element, 'Message')

function resolveEl(target) {
  if (!target) return null;
  if (typeof target === 'string') return document.getElementById(target);
  return target;
}

export function showInlineError(target, message) {
  const el = resolveEl(target);
  if (!el) return;
  el.textContent = message || '';
  el.classList.remove('hidden');
  if (!el.classList.contains('inline-error')) {
    el.classList.add('inline-error');
  }
  el.setAttribute('role', 'alert');
}

export function clearInlineError(target) {
  const el = resolveEl(target);
  if (!el) return;
  el.textContent = '';
  if (!el.classList.contains('hidden')) el.classList.add('hidden');
}
