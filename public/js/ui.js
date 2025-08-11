const DOM = {
    loginContainer: document.getElementById('login-container'),
    loginForm: document.getElementById('login-form'),
    loginError: document.getElementById('login-error'),
    logoutBtn: document.getElementById('logout-btn'),
    mainTitle: document.getElementById('main-title'),
    groupsContainer: document.getElementById('groups-container'),
    loadingContainer: document.getElementById('loading'),
    errorMessage: document.getElementById('error-message'),
    expenseDetailsContainer: document.getElementById('expense-details'),
    
    // Новые элементы для модального окна
    addExpenseModal: document.getElementById('add-expense-modal'),
    addExpenseForm: document.getElementById('add-expense-form'),
    closeModalBtn: document.getElementById('close-modal-btn'),
    addExpenseBtn: document.getElementById('add-expense-btn'),
    cancelExpenseBtn: document.getElementById('cancel-expense-btn'),
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
            <strong>${expense.description}</strong>: ${expense.amount} hrn., paid by ${expense.payer.username}
        </li>
    `).join('');

    const transactionsHtml = transactions.map(t => `
        <li class="transaction-item">
            ${t.from.username} owes ${t.to.username} ${t.amount.toFixed(2)} hrn.
        </li>
    `).join('');
    
    // Updated HTML to wrap buttons in a flex container for correct positioning
    DOM.expenseDetailsContainer.innerHTML = `
        <div class="header-buttons">
            <button id="back-to-groups-btn" class="expense-action-button">← Back to groups</button>
            <button id="add-expense-btn" class="expense-action-button">Add Expense</button>
        </div>
        <h3>Expenses list</h3>
        <ul>${expensesHtml || '<li>No expenses yet.</li>'}</ul>
        <h3>Who owes who</h3>
        <ul>${transactionsHtml || '<li>All even.</li>'}</ul>
    `;
    
    document.getElementById('back-to-groups-btn').addEventListener('click', () => history.back());
    
    // Добавляем слушателя событий для кнопки "Add Expense"
    document.getElementById('add-expense-btn').addEventListener('click', () => {
        toggleModal(true);
    });
}

// Новая функция для отображения/скрытия модального окна
export function toggleModal(show) {
    if (show) {
        DOM.addExpenseModal.classList.remove('hidden');
    } else {
        DOM.addExpenseModal.classList.add('hidden');
        DOM.addExpenseForm.reset(); // Сбрасываем поля формы
    }
}

// Слушатели событий для кнопок внутри модального окна
// Эти слушатели нужно добавить, так как модальное окно теперь статично в HTML
DOM.closeModalBtn.addEventListener('click', () => toggleModal(false));
DOM.cancelExpenseBtn.addEventListener('click', () => toggleModal(false));


export { DOM };