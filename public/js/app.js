import { apiRequest, findUserByName } from './api.js';
import { toggleUI, toggleLoading, displayError, renderGroups, renderGroupDetails, DOM, toggleModal, toggleExpenseViewModal, renderPayerSelect, renderParticipants, toggleNewGroupModal, renderGroupParticipants } from './ui.js';
import { setState, getState, subscribe } from './state/store.js';
import { initRouter, navigateToGroup, navigateToGroups, replaceToRoot } from './router/router.js';
import { handleLogin, handleLogout } from './controllers/authController.js';
import { fetchGroups } from './controllers/groupsController.js';
import { showGroupExpenses, getCurrentGroupMembers } from './controllers/expensesController.js';

let currentUser = null;
let expenseDatePicker = null; // for Add Expense modal
let expenseViewDatePicker = null; // for Expense Details modal
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

// moved to controllers/groupsController.js and controllers/expensesController.js

// moved to controllers/authController.js

// moved to controllers/groupsController.js

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
        setState({ loading: true });
        await apiRequest(`groups/${groupId}/expenses`, 'POST', expenseData);
        await showGroupExpenses(groupId, groupName);
        toggleModal(false);
    } catch (error) {
        displayError(error.message);
    } finally {
        setState({ loading: false });
    }
}

// Router handlers are provided at init time

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

    // Reflect store -> UI
    subscribe((s) => {
        try { toggleUI(!!s.isLoggedIn); } catch (_) {}
        try { toggleLoading(!!s.loading); } catch (_) {}
    });
    // Initialize login state from token
    try {
        const token = localStorage.getItem('userToken');
        setState({ isLoggedIn: !!token });
    } catch (_) {}

    DOM.loginForm.addEventListener('submit', handleLogin);
    DOM.logoutBtn.addEventListener('click', handleLogout);
    
    // Initialize router with handlers
    await initRouter({
        onGroups: async () => {
            const token = localStorage.getItem('userToken');
            if (!token) {
                setState({ isLoggedIn: false });
                return;
            }
            setState({ isLoggedIn: true });
            await fetchGroups();
        },
        onGroup: async (groupId, groupName) => {
            const token = localStorage.getItem('userToken');
            if (!token) {
                setState({ isLoggedIn: false });
                return;
            }
            setState({ isLoggedIn: true });
            await showGroupExpenses(groupId, groupName);
        }
    });

    // Global unauthorized handler: if any API call returns 401, force login view
    window.addEventListener('api:unauthorized', () => {
        const wasLoggedIn = !!getState().isLoggedIn;
        try { setState({ loading: false, isLoggedIn: false }); } catch (_) {}
        try { toggleModal(false); } catch (_) {}
        try { toggleExpenseViewModal(false); } catch (_) {}
        try { toggleNewGroupModal(false); } catch (_) {}
        if (wasLoggedIn && DOM.loginError) {
            DOM.loginError.textContent = 'Your session has expired. Please log in again.';
        }
        // Reset route to root without reloading
        replaceToRoot();
    });

    DOM.expenseDetailsContainer.addEventListener('click', async (e) => {
        if (e.target.id === 'add-expense-btn') {
            const members = getCurrentGroupMembers();
            renderPayerSelect(members);
            renderParticipants(members);
            toggleModal(true, members);
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
            await navigateToGroups();
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
            setState({ loading: true });
            await apiRequest('groups', 'POST', { name, members });
            toggleNewGroupModal(false);
            // Refresh groups list and view
            await navigateToGroups();
        } catch (error) {
            console.error('Failed to create group:', error);
            alert(error.message || 'Failed to create group');
        } finally {
            setState({ loading: false });
        }
    });

    DOM.addExpenseForm.addEventListener('submit', handleAddExpense);

    DOM.participantsContainer.addEventListener('click', (e) => {
        const participantItem = e.target.closest('.participant-item');
        if (participantItem) {
            participantItem.classList.toggle('selected');
        }
    });

    // Close/cancel handlers for Add Expense and Expense View modals are attached in their respective modules

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

    // Close/cancel handlers for New Group modal are attached in its module

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
    
    async function handleSaveExpense() {
        const saveBtn = DOM.saveExpenseBtn;
        const { expenseId, groupId } = saveBtn?.dataset || {};
        const groupName = history.state?.groupName || 'Group Details';
        if (!expenseId || !groupId) return;

        const inlineError = document.getElementById('expense-delete-error');
        if (inlineError) {
            inlineError.textContent = '';
            inlineError.classList.add('hidden');
        }

        // Collect edited values
        const desc = document.getElementById('expense-view-description')?.value?.trim();
        const amountVal = document.getElementById('expense-view-amount')?.value;
        const payer = document.getElementById('expense-view-payer')?.value;
        const selectedChips = document.querySelectorAll('#expense-view-participants .participant-item.selected');
        const participants = Array.from(selectedChips).map(el => el.getAttribute('data-id'));

        const payload = {};
        if (typeof desc !== 'undefined') payload.description = desc;
        if (typeof amountVal !== 'undefined' && amountVal !== '') payload.amount = Number(amountVal);
        if (typeof payer !== 'undefined' && payer) payload.payer = payer;
        if (participants && Array.isArray(participants)) payload.participants = participants;

        try {
            const viewDateEl = document.getElementById('expense-view-date');
            const selectedDate = expenseViewDatePicker && expenseViewDatePicker.selectedDates && expenseViewDatePicker.selectedDates[0];
            if (selectedDate) {
                payload.date = selectedDate.toISOString();
            } else if (viewDateEl && viewDateEl.value) {
                const iso = new Date(viewDateEl.value.replace(' ', 'T')).toISOString();
                if (iso) payload.date = iso;
            }
        } catch (_) {}

        // Basic client checks mirroring backend
        if (!payload.description || !payload.description.trim()) {
            alert('Description cannot be empty');
            return;
        }
        if (typeof payload.amount !== 'undefined' && (!isFinite(payload.amount) || payload.amount <= 0)) {
            alert('Amount must be a positive number');
            return;
        }
        if (!payload.participants || payload.participants.length === 0) {
            alert('Select at least one participant');
            return;
        }

        const prevDisabled = saveBtn.disabled;
        saveBtn.disabled = true;
        try {
            await apiRequest(`groups/${groupId}/expenses/${expenseId}`, 'PATCH', payload);
            toggleExpenseViewModal(false);
            await showGroupExpenses(groupId, groupName);
        } catch (error) {
            const msg = String(error.message || 'Failed to update expense');
            if (inlineError) {
                inlineError.textContent = msg;
                inlineError.classList.remove('hidden');
            }
        } finally {
            saveBtn.disabled = prevDisabled;
        }
    }

    if (DOM.saveExpenseBtn) {
        DOM.saveExpenseBtn.addEventListener('click', handleSaveExpense);
    }
    
    // Initialize Flatpickr for optional date/time (Add Expense modal)
    if (window.flatpickr) {
        expenseDatePicker = window.flatpickr('#expense-date', {
            enableTime: true,
            time_24hr: true,
            dateFormat: 'Y-m-d H:i',
            allowInput: true,
        });
        // Initialize Flatpickr for Expense Details modal date input
        const viewDateEl = document.querySelector('#expense-view-date');
        if (viewDateEl) {
            expenseViewDatePicker = window.flatpickr(viewDateEl, {
                enableTime: true,
                time_24hr: true,
                dateFormat: 'Y-m-d H:i',
                allowInput: true,
            });
        }
    }

    // First route was handled by initRouter
}

document.addEventListener('DOMContentLoaded', initializeApp);