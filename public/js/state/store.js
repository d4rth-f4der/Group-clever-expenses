// Minimal observable store for UI state
// State shape kept intentionally small for incremental adoption
const listeners = new Set();

const state = {
  isLoggedIn: false,
  loading: false,
};

export function getState() {
  return { ...state };
}

export function setState(partial) {
  let changed = false;
  for (const [k, v] of Object.entries(partial || {})) {
    if (state[k] !== v) {
      state[k] = v;
      changed = true;
    }
  }
  if (changed) {
    listeners.forEach((fn) => {
      try { fn(getState()); } catch (_) {}
    });
  }
}

export function subscribe(fn) {
  if (typeof fn !== 'function') return () => {};
  listeners.add(fn);
  // return unsubscribe
  return () => listeners.delete(fn);
}
