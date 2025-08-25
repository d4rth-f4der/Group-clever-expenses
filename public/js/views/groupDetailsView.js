import { DOM } from '../dom/domRefs.js';
import { toggleExpenseViewModal } from './modals/expenseViewModal.js';

export function renderGroupDetails(groupName, expenses, transactions, groupMembers = [], adminId) {
    DOM.mainTitle.textContent = `"${groupName}" Group Expenses`;
    DOM.groupsContainer.classList.add('hidden');
    DOM.expenseDetailsContainer.classList.remove('hidden');
    DOM.newGroupBtn.classList.add('hidden');

    const expensesHtml = expenses.map((expense, index) => {
        const date = new Date(expense.date);
        const formattedDate = date.toLocaleDateString('uk-UA', { year: 'numeric', month: '2-digit', day: '2-digit' });
        const formattedTime = date.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
        const payerInShared = Array.isArray(expense.participants) && expense.participants.some(p => String(p.user._id) === String(expense.payer._id));
        return `
            <li class="expense-item" data-expense-index="${index}" style="cursor: pointer;">
                <div class="expense-main">
                    <span class="expense-description">${expense.description}</span>
                    <div class="expense-right">
                        <span class="expense-date">${formattedDate} ${formattedTime}</span>
                        <span class="expense-amount">${expense.amount} hrn.</span>
                    </div>
                </div>
                <div class="expense-details">
                    <span class="expense-participants">
                        <span class="label">shared</span> 
                        ${expense.participants.map(p => {
                            const isPayer = String(p.user._id) === String(expense.payer._id);
                            return `
                                <span class="participant-wrapper">
                                    <span class="username participant-username${isPayer ? ' payer-username' : ''}">${p.user.username}</span>
                                    ${isPayer ? '<span class="paid-caption" aria-label="paid by">paid</span>' : ''}
                                </span>
                            `;
                        }).join('')}
                    </span>
                    ${payerInShared ? '' : `<span class="expense-payer"><span class="label">paid by</span> <span class="username participant-username payer-username-standalone">${expense.payer.username}</span></span>`}
                </div>
            </li>
        `;
    }).join('');

    const transactionsHtml = transactions.map(t => `
        <li class="transaction-item">
            <span class="username participant-username">${t.from.username}</span> owes <span class="username participant-username">${t.to.username}</span> ${t.amount.toFixed(2)} hrn.
        </li>
    `).join('');

    DOM.expenseDetailsContainer.innerHTML = `
        <div class="header-buttons">
            <button id="back-to-groups-btn" class="expense-action-button" title="Back to groups">←</button>
            <div class="expense-participants" aria-label="Group participants">
                <span class="label">participants</span> 
                ${(Array.isArray(groupMembers) ? groupMembers : []).map(m => {
                    const isAdmin = String(m._id) === String(adminId);
                    return `
                        <span class="participant-wrapper">
                            <span class="username participant-username${isAdmin ? ' admin-username' : ''}">${m.username}</span>
                            ${isAdmin ? '<span class="admin-caption" aria-label="admin">admin</span>' : ''}
                        </span>
                    `;
                }).join('')}
            </div>
            <button id="add-expense-btn" class="expense-action-button" title="Add expense">+</button>
        </div>
        <h3>Who owes who</h3>
        <ul>${transactionsHtml || '<li>All even.</li>'}</ul>
        <h3>Expenses list</h3>
        <ul>${expensesHtml || '<li>No expenses yet.</li>'}</ul>
        <div id="group-delete-error" class="inline-error hidden" role="alert"></div>
        <div class="footer-actions">
            <button id="delete-group-btn" class="delete-btn" title="Delete this group">Delete Group</button>
        </div>
    `;

    document.getElementById('back-to-groups-btn').addEventListener('click', () => history.back());

    const expenseItems = DOM.expenseDetailsContainer.querySelectorAll('.expense-item');
    expenseItems.forEach((item, index) => {
        item.addEventListener('click', () => {
            toggleExpenseViewModal(true, expenses[index], groupMembers);
        });
    });
}
