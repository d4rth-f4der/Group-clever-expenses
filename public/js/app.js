import { apiRequest } from './api.js';
import { toggleUI, toggleLoading, displayError, renderGroups, renderGroupDetails, DOM } from './ui.js';

function attachGroupCardListeners() {
    const allGroupCards = document.querySelectorAll('.group-card');
    allGroupCards.forEach(card => card.addEventListener('click', () => {
        const groupId = card.querySelector('.group-id span').textContent;
        const groupName = card.querySelector('h2').textContent;
        handleGroupClick(groupId, groupName);
    }));
}

async function fetchGroups() {
    try {
        toggleLoading(true);
        const groups = await apiRequest('groups');
        toggleLoading(false);
        renderGroups(groups);
        attachGroupCardListeners();
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
        const groupMembers = balancesData.group.members; 
        
        // Исправлено: сохраняем groupMembers в history.state для использования в handleAddExpense
        history.replaceState({ screen: 'expenses', groupId, groupName, groupMembers }, '', `/groups/${groupId}`);

        toggleLoading(false);
        // Исправлено: вызываем renderGroupDetails с правильными параметрами
        renderGroupDetails(groupName, expenses, transactions);
        
    } catch (error) {
        displayError(error.message);
        renderGroupDetails(groupName, [], []);
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
        localStorage.setItem('userId', data._id);
        history.pushState({ screen: 'groups' }, '', '/');
        handleRoute();
    } catch (error) {
        console.error('Login error:', error);
        DOM.loginError.textContent = error.message;
    }
}

function handleLogout() {
    toggleUI(false);
    localStorage.removeItem('userToken');
    localStorage.removeItem('userId');
    history.pushState({ screen: 'login' }, '', '/');
}

function handleGroupClick(groupId, groupName) {
    history.pushState({ screen: 'expenses', groupId, groupName }, '', `/groups/${groupId}`);
    showGroupExpenses(groupId, groupName);
}

async function handleAddExpense(e) {
    e.preventDefault();
    
    // Теперь history.state содержит groupMembers
    const { groupId, groupName, groupMembers } = history.state;
    const description = DOM.addExpenseForm.querySelector('#expense-description').value;
    const amount = parseFloat(DOM.addExpenseForm.querySelector('#expense-amount').value);
    const payer = localStorage.getItem('userId');
    const participants = groupMembers.map(member => member._id);
    
    if (!description || isNaN(amount) || amount <= 0) {
        alert('Please enter a valid description and amount.');
        return;
    }

    const expenseData = {
        description,
        amount,
        payer,
        participants,
    };
    
    try {
        toggleLoading(true);
        await apiRequest(`groups/${groupId}/expenses`, 'POST', expenseData);
        // После успешного добавления обновляем список расходов
        await showGroupExpenses(groupId, groupName);
        DOM.addExpenseModal.classList.add('hidden'); // Скрываем модальное окно
    } catch (error) {
        displayError(error.message);
    }
}


async function handleRoute() {
    const token = localStorage.getItem('userToken');
    if (!token) {
        toggleUI(false);
        return;
    }
    toggleUI(true);

    const path = window.location.pathname;
    if (path.startsWith('/groups/')) {
        const groupId = path.split('/')[2];
        const groupName = history.state?.groupName || 'Group Details';
        await showGroupExpenses(groupId, groupName);
    } else {
        await fetchGroups();
    }
}

function initializeApp() {
    DOM.loginForm.addEventListener('submit', handleLogin);
    DOM.logoutBtn.addEventListener('click', handleLogout);
    
    window.addEventListener('popstate', handleRoute);

    // Добавляем обработчики событий для нового функционала
    DOM.expenseDetailsContainer.addEventListener('click', (e) => {
        if (e.target.id === 'add-expense-btn') {
            DOM.addExpenseModal.classList.remove('hidden');
        }
    });

    DOM.addExpenseForm.addEventListener('submit', handleAddExpense);

    DOM.addExpenseModal.querySelector('.close-btn').addEventListener('click', () => {
        DOM.addExpenseModal.classList.add('hidden');
    });
    
    handleRoute();
}

document.addEventListener('DOMContentLoaded', initializeApp);