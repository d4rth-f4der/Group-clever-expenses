import { apiRequest } from './api.js';
import { toggleUI, toggleLoading, displayError, renderGroups, renderGroupDetails, DOM, toggleModal, toggleExpenseViewModal, renderPayerSelect, renderParticipants } from './ui.js';

let currentGroupMembers = [];
let expenseDatePicker = null;

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
        
        currentGroupMembers = groupMembers;

        history.replaceState({ screen: 'expenses', groupId, groupName, groupMembers }, '', `/groups/${groupId}`);

        toggleLoading(false);
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
    
    const { groupId, groupName } = history.state;
    const description = DOM.addExpenseForm.querySelector('#expense-description').value;
    const amount = parseFloat(DOM.addExpenseForm.querySelector('#expense-amount').value);
    const payer = DOM.addExpenseForm.querySelector('#expense-payer').value; 
    
    const selectedParticipantsElements = DOM.participantsContainer.querySelectorAll('.participant-item.selected');
    const participants = Array.from(selectedParticipantsElements).map(el => el.getAttribute('data-id'));
    
    if (!description || isNaN(amount) || amount <= 0) {
        alert('Please enter a valid description and amount.');
        return;
    }
    
    if (participants.length === 0) {
        alert('Please select at least one participant.');
        return;
    }

    const expenseData = {
        description,
        amount,
        payer,
        participants,
    };
    // Optional date
    try {
        const typedValue = document.querySelector('#expense-date')?.value.trim();
        const selectedDate = expenseDatePicker && expenseDatePicker.selectedDates && expenseDatePicker.selectedDates[0];
        if (selectedDate) {
            expenseData.date = selectedDate.toISOString();
        } else if (typedValue) {
            const iso = new Date(typedValue.replace(' ', 'T')).toISOString();
            if (iso) expenseData.date = iso;
        }
    } catch (_) {
        // If invalid, let backend validation handle it
    }
    
    try {
        toggleLoading(true);
        await apiRequest(`groups/${groupId}/expenses`, 'POST', expenseData);
        await showGroupExpenses(groupId, groupName);
        toggleModal(false);
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

    DOM.expenseDetailsContainer.addEventListener('click', (e) => {
        if (e.target.id === 'add-expense-btn') {
            renderPayerSelect(currentGroupMembers);
            renderParticipants(currentGroupMembers);
            toggleModal(true, currentGroupMembers);
            if (expenseDatePicker) {
                expenseDatePicker.clear();
            }
        }
    });

    DOM.addExpenseForm.addEventListener('submit', handleAddExpense);

    DOM.participantsContainer.addEventListener('click', (e) => {
        const participantItem = e.target.closest('.participant-item');
        if (participantItem) {
            participantItem.classList.toggle('selected');
        }
    });

    DOM.addExpenseModal.querySelector('.close-btn').addEventListener('click', () => {
        toggleModal(false);
    });

    DOM.addExpenseModal.querySelector('#cancel-expense-btn').addEventListener('click', () => {
        toggleModal(false);
    });

    DOM.closeExpenseViewBtn.addEventListener('click', () => {
        toggleExpenseViewModal(false);
    });

    async function handleDeleteExpense() {
        const { expenseId, groupId } = DOM.deleteExpenseBtn.dataset;
        const groupName = history.state?.groupName || 'Group Details';

        if (!expenseId || !groupId) {
            console.error('Missing expense or group ID for deletion');
            return;
        }

        if (!confirm('Are you sure you want to delete this expense?')) {
            return;
        }

        try {
            toggleLoading(true);
            await apiRequest(`groups/${groupId}/expenses/${expenseId}`, 'DELETE');
            toggleExpenseViewModal(false);
            await showGroupExpenses(groupId, groupName);
        } catch (error) {
            displayError(error.message);
        } finally {
            toggleLoading(false);
        }
    }

    DOM.deleteExpenseBtn.addEventListener('click', handleDeleteExpense);
    
    // Initialize Flatpickr for optional date/time
    if (window.flatpickr) {
        expenseDatePicker = window.flatpickr('#expense-date', {
            enableTime: true,
            time_24hr: true,
            dateFormat: 'Y-m-d H:i',
            allowInput: true,
        });
    }

    handleRoute();
}

document.addEventListener('DOMContentLoaded', initializeApp);