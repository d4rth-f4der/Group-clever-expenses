import { apiRequest, findUserByName } from './api.js';
import { toggleUI, toggleLoading, DOM, toggleModal, toggleExpenseViewModal, toggleNewGroupModal, renderGroupParticipants } from './ui.js';
import { setState, getState, subscribe } from './state/store.js';
import { initRouter, navigateToGroups, replaceToRoot } from './router/router.js';
import { handleLogin, handleLogout } from './controllers/authController.js';
import { fetchGroups } from './controllers/groupsController.js';
import { showGroupExpenses, handleAddExpense, handleDeleteExpense, handleSaveExpense, openAddExpenseModal } from './controllers/expensesController.js';
import { showConfirm } from './utils/confirm.js';

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
    });
    // Initialize login state from token
    try {
        const token = localStorage.getItem('userToken');
        setState({ isLoggedIn: !!token });
    } catch (_) { }

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
        try { setState({ loading: false, isLoggedIn: false }); } catch (_) { }
        try { toggleModal(false); } catch (_) { }
        try { toggleExpenseViewModal(false); } catch (_) { }
        try { toggleNewGroupModal(false); } catch (_) { }
        if (wasLoggedIn && DOM.loginError) {
            DOM.loginError.textContent = 'Your session has expired. Please log in again.';
        }
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