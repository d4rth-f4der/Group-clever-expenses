// Auth controller: login/logout flow
import { apiRequest } from '../api.js';
import { setState } from '../state/store.js';
import { navigateToGroups, replaceToRoot } from '../router/router.js';
import { DOM } from '../ui.js';
import { showInlineError, clearInlineError } from '../utils/notify.js';

export async function handleLogin(e) {
  e.preventDefault();
  const email = DOM.loginForm.querySelector('#email').value;
  const password = DOM.loginForm.querySelector('#password').value;

  try {
    clearInlineError(DOM.loginError);
    // Basic client validation instead of native popups (novalidate)
    if (!email || !password) {
      showInlineError(DOM.loginError, 'Email and password are required.');
      return;
    }
    const data = await apiRequest('auth/login', 'POST', { email, password });
    localStorage.setItem('userToken', data.token);
    localStorage.setItem('userId', data._id);
    setState({ isLoggedIn: true });
    await navigateToGroups();
  } catch (error) {
    console.error('Login error:', error);
    showInlineError(DOM.loginError, error.message || 'Login failed');
  }
}

export function handleLogout() {
  localStorage.removeItem('userToken');
  localStorage.removeItem('userId');
  setState({ isLoggedIn: false });
  // Let router handle route on next init or explicit navigation if needed
  try { replaceToRoot(); } catch (_) {}
}
