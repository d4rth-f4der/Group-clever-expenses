const DOM = {
    loginContainer: document.getElementById('login-container'),
    loginForm: document.getElementById('login-form'),
    loginError: document.getElementById('login-error'),
    logoutBtn: document.getElementById('logout-btn'),
    mainTitle: document.getElementById('main-title'),
    groupsContainer: document.getElementById('groups-container'),
    loadingContainer: document.getElementById('loading'),
    errorMessage: document.getElementById('error-message'),
    expenseDetailsContainer: document.getElementById('expense-details')
};

export function toggleUI(isLoggedIn) {
    if (isLoggedIn) {
        DOM.loginContainer.classList.add('hidden');
        DOM.logoutBtn.classList.remove('hidden');
        DOM.groupsContainer.classList.remove('hidden');
    } else {
        DOM.loginContainer.classList.remove('hidden');
        DOM.logoutBtn.classList.add('hidden');
        DOM.groupsContainer.classList.add('hidden');
        DOM.expenseDetailsContainer.classList.add('hidden');
        DOM.mainTitle.textContent = 'My Group Expenses';
    }
}

export function toggleLoading(isLoading) {
    if (isLoading) {
        DOM.loadingContainer.classList.remove('hidden');
        DOM.groupsContainer.classList.add('hidden');
        DOM.expenseDetailsContainer.classList.add('hidden');
    } else {
        DOM.loadingContainer.classList.add('hidden');
    }
}

export function displayError(message) {
    DOM.errorMessage.textContent = `Error: ${message}`;
    DOM.errorMessage.classList.remove('hidden');
    DOM.loadingContainer.classList.add('hidden');
    DOM.groupsContainer.classList.add('hidden');
    DOM.expenseDetailsContainer.classList.add('hidden');
}

export function renderGroups(groups) {
    DOM.mainTitle.textContent = 'My Group Expenses';
    DOM.groupsContainer.innerHTML = '';
    DOM.groupsContainer.classList.remove('hidden');
    DOM.expenseDetailsContainer.classList.add('hidden');

    if (groups.length === 0) {
        DOM.groupsContainer.innerHTML = '<p style="text-align: center; color: #6b7280; font-size: 1.125rem;">You don`t belong to any group yet.</p>';
        return;
    }

    groups.forEach(group => {
        const groupCard = document.createElement('div');
        groupCard.className = 'group-card';
        groupCard.innerHTML = `
            <h2>${group.name}</h2>
            <div class="group-id">Group ID: <span>${group._id}</span></div>
            <p>Members:</p>
            <ul>
                ${group.members.map(member => `<li>${member.username} (${member.email})</li>`).join('')}
            </ul>
        `;

        DOM.groupsContainer.appendChild(groupCard);
    });
}

export function renderGroupDetails(groupName, expenses, transactions) {
    DOM.mainTitle.textContent = `"${groupName}" Group Expenses`;
    DOM.groupsContainer.classList.add('hidden');
    DOM.expenseDetailsContainer.classList.remove('hidden');

    const expensesHtml = expenses.map(expense => `
        <li class="expense-item">
            <strong>${expense.description}</strong>: ${expense.amount} hrn., paid ${expense.payer.username}
        </li>
    `).join('');

    const transactionsHtml = transactions.map(t => `
        <li class="transaction-item">
            ${t.from.username} owes ${t.to.username} ${t.amount.toFixed(2)} hrn.
        </li>
    `).join('');
    
    DOM.expenseDetailsContainer.innerHTML = `
        <button id="back-to-groups-btn">← Back to groups</button>
        <h3>Expenses list</h3>
        <ul>${expensesHtml || '<li>No expenses yet.</li>'}</ul>
        <h3>Who owes who</h3>
        <ul>${transactionsHtml || '<li>All even.</li>'}</ul>
    `;
    
    document.getElementById('back-to-groups-btn').addEventListener('click', () => history.back());
}

export { DOM };
