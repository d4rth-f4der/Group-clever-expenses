// Auth controller: login/logout flow
import { apiRequest, register as apiRegister, resendVerification } from '../api.js';
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

export async function handleRegister(e) {
  e.preventDefault();
  const username = document.getElementById('signup-username')?.value?.trim();
  const email = document.getElementById('signup-email')?.value?.trim();
  const password = document.getElementById('signup-password')?.value || '';
  const confirm = document.getElementById('signup-confirm')?.value || '';

  clearInlineError(DOM.signupError);

  // Basic client-side validation mirroring backend rules
  if (!username || !email || !password || !confirm) {
    showInlineError(DOM.signupError, 'All fields are required.');
    return;
  }
  if (password !== confirm) {
    showInlineError(DOM.signupError, 'Passwords do not match.');
    return;
  }
  if (username.length < 3 || username.length > 32 || !/^[a-z0-9_.-]+$/i.test(username)) {
    showInlineError(DOM.signupError, 'Username must be 3-32 chars: letters, numbers, _ . -');
    return;
  }
  if (password.length < 8) {
    showInlineError(DOM.signupError, 'Password must be at least 8 characters.');
    return;
  }

  try {
    const btn = DOM.signupForm.querySelector('button[type="submit"]');
    const prev = btn?.disabled;
    if (btn) btn.disabled = true;
    await apiRegister({ username, email, password });
    // Success: inform user to verify email
    showInlineError(DOM.signupError, 'Registration successful. Check your email to verify your account.');
    // Optionally offer resend after a short delay
    setTimeout(() => {
      try {
        DOM.signupError.innerHTML = 'Registration successful. Check your email to verify your account. <button id="resend-link" class="link-like" style="margin-left:8px;">Resend</button>';
        document.getElementById('resend-link')?.addEventListener('click', async () => {
          try { await resendVerification(email); showInlineError(DOM.signupError, 'Verification email sent. Please check your inbox.'); } catch (_) {}
        });
      } catch (_) {}
    }, 100);
  } catch (error) {
    console.error('Register error:', error);
    showInlineError(DOM.signupError, error.message || 'Registration failed');
  } finally {
    const btn = DOM.signupForm.querySelector('button[type="submit"]');
    if (btn) btn.disabled = false;
  }
}
