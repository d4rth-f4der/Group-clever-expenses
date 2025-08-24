// Expenses controller: load group details and expose current group members
import { apiRequest } from '../api.js';
import { setState } from '../state/store.js';
import { renderGroupDetails, DOM, toggleModal, toggleExpenseViewModal, renderPayerSelect, renderParticipants } from '../ui.js';
import { showConfirm } from '../utils/confirm.js';
import { showInlineError, clearInlineError } from '../utils/notify.js';

let currentGroupMembers = [];
export function getCurrentGroupMembers() {
  return currentGroupMembers;
}

// Submit handler: Add Expense form
export async function handleAddExpense(e) {
  e.preventDefault();

  const { groupId, groupName } = history.state || {};
  const description = DOM.addExpenseForm.querySelector('#expense-description').value;
  const amount = parseFloat(DOM.addExpenseForm.querySelector('#expense-amount').value);
  const payer = DOM.addExpenseForm.querySelector('#expense-payer').value;

  const selectedParticipantsElements = DOM.participantsContainer.querySelectorAll('.participant-item.selected');
  const participants = Array.from(selectedParticipantsElements).map((el) => el.getAttribute('data-id'));

  if (!description || isNaN(amount) || amount <= 0) {
    showInlineError('add-expense-error', 'Please enter a valid description and amount.');
    return;
  }

  if (participants.length === 0) {
    showInlineError('add-expense-error', 'Please select at least one participant.');
    return;
  }

  const expenseData = { description, amount, payer, participants };

  // Optional date: prefer flatpickr instance stored on input, else parse typed value
  try {
    const dateInput = document.querySelector('#expense-date');
    const picker = dateInput && dateInput._flatpickr;
    const selectedDate = picker && picker.selectedDates && picker.selectedDates[0];
    const typedValue = dateInput && dateInput.value ? dateInput.value.trim() : '';
    if (selectedDate) {
      expenseData.date = selectedDate.toISOString();
    } else if (typedValue) {
      const iso = new Date(typedValue.replace(' ', 'T')).toISOString();
      if (iso) expenseData.date = iso;
    }
  } catch (_) {}

  try {
    setState({ loading: true });
    await apiRequest(`groups/${groupId}/expenses`, 'POST', expenseData);
    await showGroupExpenses(groupId, groupName);
    toggleModal(false);
    clearInlineError('add-expense-error');
  } catch (error) {
    console.error(error);
    showInlineError('add-expense-error', error.message || 'Failed to add expense');
  } finally {
    setState({ loading: false });
  }
}

// Click handler: Delete Expense button (inside Expense View modal)
export async function handleDeleteExpense() {
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
    if (error && error.status === 401) {
      return;
    }
    const msg = String(error.message || 'Failed to delete expense');
    if (inlineError) {
      inlineError.textContent = msg;
      inlineError.classList.remove('hidden');
    }
  } finally {
    btn.disabled = prevDisabled;
  }
}

// Click handler: Save (update) Expense in Expense View modal
export async function handleSaveExpense() {
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
  const participants = Array.from(selectedChips).map((el) => el.getAttribute('data-id'));

  const payload = {};
  if (typeof desc !== 'undefined') payload.description = desc;
  if (typeof amountVal !== 'undefined' && amountVal !== '') payload.amount = Number(amountVal);
  if (typeof payer !== 'undefined' && payer) payload.payer = payer;
  if (participants && Array.isArray(participants)) payload.participants = participants;

  try {
    const viewDateEl = document.getElementById('expense-view-date');
    const picker = viewDateEl && viewDateEl._flatpickr;
    const selectedDate = picker && picker.selectedDates && picker.selectedDates[0];
    if (selectedDate) {
      payload.date = selectedDate.toISOString();
    } else if (viewDateEl && viewDateEl.value) {
      const iso = new Date(viewDateEl.value.replace(' ', 'T')).toISOString();
      if (iso) payload.date = iso;
    }
  } catch (_) {}

  // Basic client checks mirroring backend
  if (!payload.description || !payload.description.trim()) {
    showInlineError('expense-delete-error', 'Description cannot be empty');
    return;
  }
  if (typeof payload.amount !== 'undefined' && (!isFinite(payload.amount) || payload.amount <= 0)) {
    showInlineError('expense-delete-error', 'Amount must be a positive number');
    return;
  }
  if (!payload.participants || payload.participants.length === 0) {
    showInlineError('expense-delete-error', 'Select at least one participant');
    return;
  }

  const prevDisabled = saveBtn.disabled;
  saveBtn.disabled = true;
  try {
    await apiRequest(`groups/${groupId}/expenses/${expenseId}`, 'PATCH', payload);
    toggleExpenseViewModal(false);
    await showGroupExpenses(groupId, groupName);
    clearInlineError('expense-delete-error');
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

// Helper to open Add Expense modal with participants filled
export function openAddExpenseModal() {
  const members = getCurrentGroupMembers();
  renderPayerSelect(members);
  renderParticipants(members);
  toggleModal(true, members);
  // Clear any previous date
  const dateInput = document.querySelector('#expense-date');
  if (dateInput && dateInput._flatpickr) {
    try { dateInput._flatpickr.clear(); } catch (_) {}
  } else if (dateInput) {
    dateInput.value = '';
  }
  // Clear previous inline errors
  try { clearInlineError('add-expense-error'); } catch (_) {}
}

export async function showGroupExpenses(groupId, groupName) {
  try {
    setState({ loading: true });
    const [expensesData, balancesData] = await Promise.all([
      apiRequest(`groups/${groupId}/expenses`),
      apiRequest(`groups/${groupId}/balances`),
    ]);
    // If a 401 happened during the above calls, the app state may already be logged out.
    // Avoid rendering details over the login form.
    try {
      const token = localStorage.getItem('userToken');
      // eslint-disable-next-line no-undef
      if (!token) {
        return;
      }
    } catch (_) {}

    const expenses = expensesData;
    const transactions = balancesData.debts;
    const groupMembers = balancesData.group.members;

    currentGroupMembers = groupMembers;

    // keep existing behavior: update history state
    history.replaceState(
      { screen: 'expenses', groupId, groupName, groupMembers },
      '',
      `/groups/${groupId}`
    );

    setState({ loading: false });
    renderGroupDetails(groupName, expenses, transactions, groupMembers);
  } catch (error) {
    // Defer UI error handling to caller or basic console
    console.error(error);
    renderGroupDetails(groupName, [], []);
    setState({ loading: false });
  }
}
