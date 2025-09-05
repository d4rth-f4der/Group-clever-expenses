import { DOM } from '../dom/domRefs.js';

export function toggleUI(isLoggedIn) {
    if (isLoggedIn) {
        DOM.loginContainer.classList.add('hidden');
        DOM.logoutBtn.classList.remove('hidden');
        DOM.groupsContainer.classList.remove('hidden');
        try { DOM.mainTitle.classList.remove('hidden'); } catch (_) {}
        try { DOM.mainTitle.textContent = 'My Group Expenses'; } catch (_) {}
    } else {
        DOM.loginContainer.classList.remove('hidden');
        DOM.logoutBtn.classList.add('hidden');
        DOM.groupsContainer.classList.add('hidden');
        DOM.expenseDetailsContainer.classList.add('hidden');
        // Hide main title on auth screens to avoid visual leftovers
        try { DOM.mainTitle.classList.add('hidden'); } catch (_) {}
    }
}

export function toggleLoading(isLoading) {
    if (isLoading) {
        DOM.loadingContainer.classList.remove('hidden');
        DOM.groupsContainer.classList.add('hidden');
        DOM.expenseDetailsContainer.classList.add('hidden');
    } else {
        DOM.loadingContainer.classList.add('hidden');
    }
}

export function displayError(message) {
    DOM.errorMessage.textContent = `Error: ${message}`;
    DOM.errorMessage.classList.remove('hidden');
    DOM.loadingContainer.classList.add('hidden');
    DOM.groupsContainer.classList.add('hidden');
    DOM.expenseDetailsContainer.classList.add('hidden');
}
