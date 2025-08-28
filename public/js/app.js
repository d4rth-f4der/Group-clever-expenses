import { apiRequest, findUserByName } from './api.js';
import { toggleUI, toggleLoading, DOM, toggleModal, toggleExpenseViewModal, toggleNewGroupModal, renderGroupParticipants, displayError, openHistoryModal } from './ui.js';

import { setState, getState, subscribe } from './state/store.js';
import { initRouter, navigateToGroups, replaceToRoot } from './router/router.js';
import { handleLogin, handleLogout } from './controllers/authController.js';
import { fetchGroups } from './controllers/groupsController.js';
import { showGroupExpenses, handleAddExpense, handleDeleteExpense, handleSaveExpense, openAddExpenseModal } from './controllers/expensesController.js';
import { showConfirm } from './utils/confirm.js';
import { showInlineError, clearInlineError } from './utils/notify.js';

// Flatpickr instances (declared to avoid ReferenceError in module scope)
let expenseDatePicker = null;
let expenseViewDatePicker = null;

let currentUser = null;
let newGroupParticipants = [];

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

    subscribe((s) => {
        try { toggleUI(!!s.isLoggedIn); } catch (_) { }
        try { toggleLoading(!!s.loading); } catch (_) { }
        try {
            if (!s.isLoggedIn) {
                currentUser = null;
                newGroupParticipants = [];
            }
            if (DOM.historyBtn) {
                const onGroups = (window.location.pathname || '/') === '/';
                if (s.isLoggedIn && onGroups) DOM.historyBtn.classList.remove('hidden');
                else DOM.historyBtn.classList.add('hidden');
            }
            // Unified control for New Group button to avoid flashes during loading/modals
            if (DOM.newGroupBtn) {
                const onGroups = (window.location.pathname || '/') === '/';
                const modalOpen = [DOM.addExpenseModal, DOM.expenseViewModal, DOM.newGroupModal]
                  .some(m => m && !m.classList.contains('hidden'));
                if (s.isLoggedIn && onGroups && !s.loading && !modalOpen) {
                    DOM.newGroupBtn.classList.remove('hidden');
                } else {
                    DOM.newGroupBtn.classList.add('hidden');
                }
            }
        } catch (_) { }
    });

    // Initialize login state from token
    try {
        const token = localStorage.getItem('userToken');
        setState({ isLoggedIn: !!token });
    } catch (_) { }

    DOM.loginForm.addEventListener('submit', handleLogin);
    DOM.logoutBtn.addEventListener('click', handleLogout);

    if (DOM.historyBtn) {
        DOM.historyBtn.addEventListener('click', () => {
            openHistoryModal();
        });
    }

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
            try {
                if (DOM.historyBtn) DOM.historyBtn.classList.remove('hidden');
            } catch (_) { }
        },
        onGroup: async (groupId, groupName) => {
            const token = localStorage.getItem('userToken');
            if (!token) {
                setState({ isLoggedIn: false });
                return;
            }
            setState({ isLoggedIn: true });
            await showGroupExpenses(groupId, groupName);
            try {
                if (DOM.historyBtn) DOM.historyBtn.classList.add('hidden');
            } catch (_) { }
        }
    });

    // Global unauthorized handler: if any API call returns 401, force login view
    window.addEventListener('api:unauthorized', () => {
        const wasLoggedIn = !!getState().isLoggedIn;
        try { setState({ loading: false, isLoggedIn: false }); } catch (_) { }
        try { toggleModal(false); } catch (_) { }
        try { toggleExpenseViewModal(false); } catch (_) { }
        try { toggleNewGroupModal(false); } catch (_) { }
        if (wasLoggedIn && DOM.loginError) {
            showInlineError(DOM.loginError, 'Your session has expired. Please log in again.');
        }
        // Ensure no leftover UI parts remain visible
        try { DOM.groupsContainer.classList.add('hidden'); } catch (_) {}
        try { DOM.expenseDetailsContainer.classList.add('hidden'); } catch (_) {}
        try { DOM.errorMessage.classList.add('hidden'); DOM.errorMessage.textContent = ''; } catch (_) {}
        // Reset route to root without reloading
        replaceToRoot();
    });

    DOM.expenseDetailsContainer.addEventListener('click', async (e) => {
        if (e.target.id === 'add-expense-btn') {
            openAddExpenseModal();
        } else if (e.target.id === 'delete-group-btn') {
            const { groupId } = history.state || {};
            if (!groupId) return;

            const confirmed = await showConfirm('Are you sure you want to delete this group? This action cannot be undone.');
            if (!confirmed) return;

            clearInlineError('group-delete-error');

            const btn = e.target;
            const prevDisabled = btn.disabled;
            btn.disabled = true;

            (async () => {
                try {
                    // Do not toggle global loading here to keep current view visible
                    await apiRequest(`groups/${groupId}`, 'DELETE');
                    await navigateToGroups();
                } catch (error) {
                    console.error('Failed to delete group:', error);
                    showInlineError('group-delete-error', error.message || 'Failed to delete group');
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
            showInlineError('new-group-error', 'Please enter a group name.');
            return;
        }

        // Ensure at least one member (current user already included)
        if (!newGroupParticipants || newGroupParticipants.length === 0) {
            showInlineError('new-group-error', 'Please add at least one participant.');
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
            showInlineError('new-group-error', error.message || 'Failed to create group');
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
                displayError('Failed to load user information. Please refresh the page.');
                return;
            }
        }

        if (currentUser) {
            toggleNewGroupModal(true, currentUser);
            // Initialize participants with current user
            newGroupParticipants = [currentUser];
            renderGroupParticipants(newGroupParticipants, currentUser?.username);
            clearInlineError('new-group-error');
        } else {
            displayError('Please log in first.');
        }
    });

    // Add participant in New Group modal
    DOM.addParticipantBtn.addEventListener('click', async () => {
        const input = DOM.addParticipantInput.value.trim();
        if (!input) {
            showInlineError('new-group-error', 'Enter a username to add.');
            return;
        }

        // Prevent adding duplicates by username
        if (newGroupParticipants.some(p => p.username.toLowerCase() === input.toLowerCase())) {
            showInlineError('new-group-error', 'This participant is already added.');
            return;
        }

        try {
            const user = await findUserByName(input);
            if (!user) {
                showInlineError('new-group-error', 'Username not found');
                return;
            }

            newGroupParticipants.push(user);
            renderGroupParticipants(newGroupParticipants, currentUser?.username);
            DOM.addParticipantInput.value = '';
            clearInlineError('new-group-error');
        } catch (e) {
            console.error(e);
            showInlineError('new-group-error', 'Failed to validate username. Please try again.');
        }
    });

    // Make Enter in the add-participant input behave like clicking Add (and not submit the form)
    DOM.addParticipantInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            // Delegate to the same handler as the Add button
            DOM.addParticipantBtn.click();
        }
    });

    // Remove participant on click of small × in the tag (except active user)
    DOM.groupParticipants.addEventListener('click', (e) => {
        const btn = e.target.closest('button.participant-remove');
        if (!btn) return;
        const tag = btn.closest('.participant-tag');
        const username = tag?.dataset?.username;
        if (!username) return;
        if (currentUser && username.toLowerCase() === currentUser.username.toLowerCase()) {
            // Safety: do not remove active user
            return;
        }
        newGroupParticipants = newGroupParticipants.filter(p => p.username.toLowerCase() !== username.toLowerCase());
        renderGroupParticipants(newGroupParticipants, currentUser?.username);
        clearInlineError('new-group-error');
    });

    DOM.deleteExpenseBtn.addEventListener('click', handleDeleteExpense);

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
}

document.addEventListener('DOMContentLoaded', initializeApp);