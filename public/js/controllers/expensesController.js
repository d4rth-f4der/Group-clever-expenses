// Expenses controller: load group details and expose current group members
import { apiRequest } from '../api.js';
import { setState } from '../state/store.js';
import { renderGroupDetails } from '../ui.js';

let currentGroupMembers = [];
export function getCurrentGroupMembers() {
  return currentGroupMembers;
}

export async function showGroupExpenses(groupId, groupName) {
  try {
    setState({ loading: true });
    const [expensesData, balancesData] = await Promise.all([
      apiRequest(`groups/${groupId}/expenses`),
      apiRequest(`groups/${groupId}/balances`),
    ]);

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
