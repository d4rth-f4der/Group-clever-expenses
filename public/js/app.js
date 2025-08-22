import { apiRequest, findUserByName } from './api.js';
import { toggleUI, toggleLoading, displayError, renderGroups, renderGroupDetails, DOM, toggleModal, toggleExpenseViewModal, renderPayerSelect, renderParticipants, toggleNewGroupModal, renderGroupParticipants } from './ui.js';

let currentGroupMembers = [];
let currentUser = null;
let expenseDatePicker = null;
let newGroupParticipants = [];

// Small helper to show custom confirm modal and return a Promise<boolean>
// Options: { overlayCancel?: boolean, escCancel?: boolean }
function showConfirm(message = 'Are you sure?', options = {}) {
    const { overlayCancel = true, escCancel = true } = options;
    return new Promise((resolve) => {
        const modal = document.getElementById('confirm-modal');
        const msgEl = document.getElementById('confirm-message');
        const yesBtn = document.getElementById('confirm-yes-btn');
        const cancelBtn = document.getElementById('confirm-cancel-btn');
        const closeBtn = document.getElementById('close-confirm-btn');

        if (!modal || !msgEl || !yesBtn || !cancelBtn || !closeBtn) {
            // Fallback to native confirm if modal missing
            resolve(window.confirm(message));
            return;
        }

        msgEl.textContent = message;
        modal.classList.remove('hidden');

        const cleanup = () => {
            modal.classList.add('hidden');
            yesBtn.removeEventListener('click', onYes);
            cancelBtn.removeEventListener('click', onNo);
            closeBtn.removeEventListener('click', onNo);
            modal.removeEventListener('click', onOverlayClick);
            document.removeEventListener('keydown', onKeyDown, true);
        };

        const onYes = () => { cleanup(); resolve(true); };
        const onNo = () => { cleanup(); resolve(false); };
        const onOverlayClick = (e) => {
            if (!overlayCancel) return;
            if (e.target === modal) onNo();
        };
        const onKeyDown = (e) => {
            if (!escCancel) return;
            if (e.key === 'Escape') {
                e.stopPropagation();
                e.preventDefault();
                onNo();
            }
        };

        yesBtn.addEventListener('click', onYes);
        cancelBtn.addEventListener('click', onNo);
        closeBtn.addEventListener('click', onNo);
        modal.addEventListener('click', onOverlayClick);
        document.addEventListener('keydown', onKeyDown, true);
    });
}

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

async function initializeApp() {
    // Get current user info
    try {
        const token = localStorage.getItem('userToken');
        if (token) {
            currentUser = await apiRequest('users/me');
        }
    } catch (error) {
        console.error('Failed to get current user:', error);
    }

    DOM.loginForm.addEventListener('submit', handleLogin);
    DOM.logoutBtn.addEventListener('click', handleLogout);
    
    window.addEventListener('popstate', handleRoute);

    // Global unauthorized handler: if any API call returns 401, force login view
    window.addEventListener('api:unauthorized', () => {
        try { toggleLoading(false); } catch (_) {}
        try { toggleModal(false); } catch (_) {}
        try { toggleExpenseViewModal(false); } catch (_) {}
        try { toggleNewGroupModal(false); } catch (_) {}
        if (DOM.loginError) {
            DOM.loginError.textContent = 'Your session has expired. Please log in again.';
        }
        toggleUI(false);
        // Reset route to root without reloading
        try { history.replaceState({}, '', '/'); } catch (_) {}
    });

    DOM.expenseDetailsContainer.addEventListener('click', async (e) => {
        if (e.target.id === 'add-expense-btn') {
            renderPayerSelect(currentGroupMembers);
            renderParticipants(currentGroupMembers);
            toggleModal(true, currentGroupMembers);
            if (expenseDatePicker) {
                expenseDatePicker.clear();
            }
        } else if (e.target.id === 'delete-group-btn') {
            const { groupId } = history.state || {};
            if (!groupId) return;

            const confirmed = await showConfirm('Are you sure you want to delete this group? This action cannot be undone.');
            if (!confirmed) return;

            const inlineError = document.getElementById('group-delete-error');
            if (inlineError) {
                inlineError.textContent = '';
                inlineError.classList.add('hidden');
            }

            const btn = e.target;
            const prevDisabled = btn.disabled;
            btn.disabled = true;

            (async () => {
                try {
                    await apiRequest(`groups/${groupId}`, 'DELETE');
                    // Success: go back to groups list and refresh
                    history.pushState({ screen: 'groups' }, '', '/');
                    await fetchGroups();
                } catch (error) {
                    // Keep user on the same page; show inline error
                    const msg = String(error.message || 'Failed to delete group');
                    if (inlineError) {
                        inlineError.textContent = msg.includes('Only group admin') ? 'cannot delete - no admin rights' : msg;
                        inlineError.classList.remove('hidden');
                    }
                } finally {
                    btn.disabled = prevDisabled;
                }
            })();
        }
    });

    // Create New Group submit
    DOM.newGroupForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nameInput = document.getElementById('group-name');
        const name = nameInput?.value.trim();
        if (!name) {
            alert('Please enter a group name.');
            return;
        }

        // Ensure at least one member (current user already included)
        if (!newGroupParticipants || newGroupParticipants.length === 0) {
            alert('Please add at least one participant.');
            return;
        }

        const members = newGroupParticipants.map(u => u._id);

        try {
            toggleLoading(true);
            await apiRequest('groups', 'POST', { name, members });
            toggleNewGroupModal(false);
            // Refresh groups list and view
            history.pushState({ screen: 'groups' }, '', '/');
            await fetchGroups();
        } catch (error) {
            console.error('Failed to create group:', error);
            alert(error.message || 'Failed to create group');
        } finally {
            toggleLoading(false);
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

    // New Group Modal Events
    DOM.newGroupBtn.addEventListener('click', async () => {
        // If currentUser is not loaded, try to get it
        if (!currentUser) {
            try {
                const token = localStorage.getItem('userToken');
                if (token) {
                    currentUser = await apiRequest('users/me');
                }
            } catch (error) {
                console.error('Failed to get current user:', error);
                alert('Failed to load user information. Please refresh the page.');
                return;
            }
        }
        
        if (currentUser) {
            toggleNewGroupModal(true, currentUser);
            // Initialize participants with current user
            newGroupParticipants = [currentUser];
            renderGroupParticipants(newGroupParticipants);
        } else {
            alert('Please log in first.');
        }
    });

    DOM.closeNewGroupBtn.addEventListener('click', () => {
        toggleNewGroupModal(false);
    });

    DOM.cancelNewGroupBtn.addEventListener('click', () => {
        toggleNewGroupModal(false);
    });

    // Add participant in New Group modal
    DOM.addParticipantBtn.addEventListener('click', async () => {
        const input = DOM.addParticipantInput.value.trim();
        if (!input) return;

        // Prevent adding duplicates by username
        if (newGroupParticipants.some(p => p.username.toLowerCase() === input.toLowerCase())) {
            alert('This participant is already added.');
            return;
        }

        try {
            const user = await findUserByName(input);
            if (!user) {
                alert('username not found');
                return;
            }

            newGroupParticipants.push(user);
            renderGroupParticipants(newGroupParticipants);
            DOM.addParticipantInput.value = '';
        } catch (e) {
            console.error(e);
            alert('Failed to validate username. Please try again.');
        }
    });

    async function handleDeleteExpense() {
        const { expenseId, groupId } = DOM.deleteExpenseBtn.dataset;
        const groupName = history.state?.groupName || 'Group Details';

        if (!expenseId || !groupId) {
            console.error('Missing expense or group ID for deletion');
            return;
        }

        const confirmed = await showConfirm('Are you sure you want to delete this expense?');
        if (!confirmed) return;

        const inlineError = document.getElementById('expense-delete-error');
        if (inlineError) {
            inlineError.textContent = '';
            inlineError.classList.add('hidden');
        }

        const btn = DOM.deleteExpenseBtn;
        const prevDisabled = btn.disabled;
        btn.disabled = true;

        try {
            await apiRequest(`groups/${groupId}/expenses/${expenseId}`, 'DELETE');
            toggleExpenseViewModal(false);
            await showGroupExpenses(groupId, groupName);
        } catch (error) {
            const msg = String(error.message || 'Failed to delete expense');
            if (inlineError) {
                inlineError.textContent = msg;
                inlineError.classList.remove('hidden');
            }
        } finally {
            btn.disabled = prevDisabled;
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