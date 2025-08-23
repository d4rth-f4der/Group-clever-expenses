import { DOM } from '../dom/domRefs.js';

export function toggleUI(isLoggedIn) {
    if (isLoggedIn) {
        DOM.loginContainer.classList.add('hidden');
        DOM.logoutBtn.classList.remove('hidden');
        DOM.groupsContainer.classList.remove('hidden');
        DOM.newGroupBtn.classList.remove('hidden');
    } else {
        DOM.loginContainer.classList.remove('hidden');
        DOM.logoutBtn.classList.add('hidden');
        DOM.groupsContainer.classList.add('hidden');
        DOM.expenseDetailsContainer.classList.add('hidden');
        DOM.newGroupBtn.classList.add('hidden');
        DOM.mainTitle.textContent = 'My Group Expenses';
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
