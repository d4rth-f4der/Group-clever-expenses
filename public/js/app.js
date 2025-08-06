import { apiRequest } from './api.js';
import { toggleUI, toggleLoading, displayError, renderGroups, renderGroupDetails, DOM } from './ui.js';

async function fetchGroups() {
    const token = localStorage.getItem('userToken');
    if (!token) {
        toggleUI(false);
        return;
    }

    try {
        toggleLoading(true);
        const groups = await apiRequest('groups');
        toggleLoading(false);
        renderGroups(groups, showGroupExpenses);
    } catch (error) {
        displayError(error.message);
    }
}

async function showGroupExpenses(groupId, groupName) {
    try {
        toggleLoading(true);
        const [expensesData, balancesData] = await Promise.all([
            apiRequest(`groups/${groupId}/expenses`),
            apiRequest(`groups/${groupId}/balances`)
        ]);
        
        const expenses = expensesData;
        const transactions = balancesData.debts;

        toggleLoading(false);
        renderGroupDetails(groupName, expenses, transactions, fetchGroups);

    } catch (error) {
        displayError(error.message);
        renderGroupDetails(groupName, [], [], fetchGroups);
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const email = DOM.loginForm.querySelector('#email').value;
    const password = DOM.loginForm.querySelector('#password').value;
    
    try {
        DOM.loginError.textContent = '';
        const data = await apiRequest('auth/login', 'POST', { email, password });
        localStorage.setItem('userToken', data.token);
        toggleUI(true);
        fetchGroups();
    } catch (error) {
        console.error('Login error:', error);
        DOM.loginError.textContent = error.message;
    }
}

function handleLogout() {
    toggleUI(false);
    localStorage.removeItem('userToken');
}

function initializeApp() {
    DOM.loginForm.addEventListener('submit', handleLogin);
    DOM.logoutBtn.addEventListener('click', handleLogout);
    
    const token = localStorage.getItem('userToken');
    if (token) {
        toggleUI(true);
        fetchGroups();
    } else {
        toggleUI(false);
    }
}

document.addEventListener('DOMContentLoaded', initializeApp);