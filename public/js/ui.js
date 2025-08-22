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
    
    addExpenseModal: document.getElementById('add-expense-modal'),
    addExpenseForm: document.getElementById('add-expense-form'),
    closeModalBtn: document.getElementById('close-modal-btn'),
    addExpenseBtn: document.getElementById('add-expense-btn'),
    cancelExpenseBtn: document.getElementById('cancel-expense-btn'),

    payerSelect: document.getElementById('expense-payer'),
    participantsContainer: document.getElementById('expense-participants'),

    expenseViewModal: document.getElementById('expense-view-modal'),
    closeExpenseViewBtn: document.getElementById('close-expense-view-btn'),
    saveExpenseBtn: document.getElementById('save-expense-btn'),
    deleteExpenseBtn: document.getElementById('delete-expense-btn'),
    newGroupBtn: document.getElementById('new-group-btn'),
    
    // New Group Modal elements
    newGroupModal: document.getElementById('new-group-modal'),
    newGroupForm: document.getElementById('new-group-form'),
    closeNewGroupBtn: document.getElementById('close-new-group-btn'),
    cancelNewGroupBtn: document.getElementById('cancel-new-group-btn'),
    groupParticipants: document.getElementById('group-participants'),
    addParticipantInput: document.getElementById('add-participant-input'),
    addParticipantBtn: document.getElementById('add-participant-btn'),
};

export function toggleUI(isLoggedIn) {
    if (isLoggedIn) {
        DOM.loginContainer.classList.add('hidden');
        DOM.logoutBtn.classList.remove('hidden');
        DOM.groupsContainer.classList.remove('hidden');
        DOM.newGroupBtn.classList.remove('hidden');
    } else {
        DOM.loginContainer.classList.remove('hidden');
        DOM.logoutBtn.classList.add('hidden');
        DOM.groupsContainer.classList.add('hidden');
        DOM.expenseDetailsContainer.classList.add('hidden');
        DOM.newGroupBtn.classList.add('hidden');
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
    DOM.newGroupBtn.classList.remove('hidden');

    if (groups.length === 0) {
        DOM.groupsContainer.innerHTML = '<p style="text-align: center; color: #6b7280; font-size: 1.125rem;">You don`t belong to any group yet.</p>';
        return;
    }

    groups.forEach(group => {
        const item = document.createElement('div');
        item.className = 'expense-item group-item';
        item.dataset.groupId = group._id;
        item.innerHTML = `
            <div class="expense-main">
                <div class="expense-description">${group.name}</div>
            </div>
            <div class="expense-details" style="margin-top:6px;">
                <div class="label" style="margin-right:8px;">Members:</div>
                <div class="expense-participants group-members"></div>
            </div>
        `;

        const membersWrap = item.querySelector('.group-members');
        (group.members || []).forEach(m => {
            const chip = document.createElement('span');
            chip.className = 'participant-username';
            chip.textContent = `${m.username} (${m.email})`;
            membersWrap.appendChild(chip);
        });

        DOM.groupsContainer.appendChild(item);
    });
}

export function renderGroupDetails(groupName, expenses, transactions, groupMembers = []) {
    DOM.mainTitle.textContent = `"${groupName}" Group Expenses`;
    DOM.groupsContainer.classList.add('hidden');
    DOM.expenseDetailsContainer.classList.remove('hidden');
    DOM.newGroupBtn.classList.add('hidden');

    const expensesHtml = expenses.map((expense, index) => {
        const participants = expense.participants.map(p => p.user.username).join(', ');
        const date = new Date(expense.date);
        const formattedDate = date.toLocaleDateString('uk-UA', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit' 
        });
        const formattedTime = date.toLocaleTimeString('uk-UA', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
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
                        ${expense.participants.map(p => `<span class="username participant-username">${p.user.username}</span>`).join('')}
                    </span>
                    <span class="expense-payer"><span class="label">paid</span> <span class="username payer-username">${expense.payer.username}</span></span>
                </div>
            </li>
        `;
    }).join('');

    const transactionsHtml = transactions.map(t => `
        <li class="transaction-item">
            ${t.from.username} owes ${t.to.username} ${t.amount.toFixed(2)} hrn.
        </li>
    `).join('');
    
    DOM.expenseDetailsContainer.innerHTML = `
        <div class="header-buttons">
            <button id="back-to-groups-btn" class="expense-action-button">← Back to groups</button>
            <button id="add-expense-btn" class="expense-action-button">Add Expense</button>
        </div>
        <h3>Expenses list</h3>
        <ul>${expensesHtml || '<li>No expenses yet.</li>'}</ul>
        <h3>Who owes who</h3>
        <ul>${transactionsHtml || '<li>All even.</li>'}</ul>
        <div id="group-delete-error" class="inline-error hidden" role="alert"></div>
        <div class="footer-actions">
            <button id="delete-group-btn" class="delete-btn" title="Delete this group">Delete Group</button>
        </div>
    `;
    
    document.getElementById('back-to-groups-btn').addEventListener('click', () => history.back());
    
    document.getElementById('add-expense-btn').addEventListener('click', () => {
    });

    const expenseItems = DOM.expenseDetailsContainer.querySelectorAll('.expense-item');
    expenseItems.forEach((item, index) => {
        item.addEventListener('click', () => {
            toggleExpenseViewModal(true, expenses[index], groupMembers);
        });
    });
}

export function toggleModal(show, groupMembers = []) {
    if (show) {
        DOM.addExpenseModal.classList.remove('hidden');
        if (groupMembers.length > 0) {
             renderParticipants(groupMembers);
        }
    } else {
        DOM.addExpenseModal.classList.add('hidden');
        DOM.addExpenseForm.reset();
    }
}

export function toggleExpenseViewModal(show, expense = null, groupMembers = []) {
    if (show && expense) {
        const descInput = document.getElementById('expense-view-description');
        if (descInput) descInput.value = expense.description || '';
        const amountInput = document.getElementById('expense-view-amount');
        if (amountInput) amountInput.value = typeof expense.amount === 'number' ? expense.amount : '';
        // Populate "Paid by" select with group members
        const payerSelectEl = document.getElementById('expense-view-payer');
        if (payerSelectEl) {
            payerSelectEl.innerHTML = '';
            let members = Array.isArray(groupMembers) && groupMembers.length > 0
                ? groupMembers
                : [];
            // Fallback: ensure current payer present even if groupMembers missing
            const payerId = typeof expense.payer === 'object' ? expense.payer._id : String(expense.payer);
            const payerObj = typeof expense.payer === 'object' ? expense.payer : null;
            if (!members.length) {
                const fromParticipants = expense.participants?.map(p => p.user).filter(Boolean) || [];
                members = [...fromParticipants];
                if (payerObj && !members.find(m => String(m._id) === String(payerId))) {
                    members.push(payerObj);
                }
            }
            // Deduplicate by _id
            const seen = new Set();
            members.forEach(m => {
                const id = String(m._id);
                if (seen.has(id)) return;
                seen.add(id);
                const opt = document.createElement('option');
                opt.value = id;
                opt.textContent = m.username;
                payerSelectEl.appendChild(opt);
            });
            payerSelectEl.value = String(payerId);
        }
        // Render all group members as chips; highlight those who participate in expense
        const viewParticipants = document.getElementById('expense-view-participants');
        if (viewParticipants) {
            viewParticipants.innerHTML = '';
            const participantIds = new Set(expense.participants.map(p => p.user._id));
            const toRender = Array.isArray(groupMembers) && groupMembers.length > 0
                ? groupMembers
                : expense.participants.map(p => p.user); // fallback
            toRender.forEach(member => {
                const chip = document.createElement('div');
                const isSelected = participantIds.has(member._id);
                chip.className = 'participant-item' + (isSelected ? ' selected' : '');
                chip.textContent = member.username;
                chip.setAttribute('data-id', member._id);
                // Visual toggle only (no persistence yet)
                chip.addEventListener('click', (e) => {
                    e.stopPropagation();
                    chip.classList.toggle('selected');
                });
                viewParticipants.appendChild(chip);
            });
        }
        
        const date = new Date(expense.date);
        const formattedDate = date.toLocaleDateString('uk-UA', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit' 
        });
        const formattedTime = date.toLocaleTimeString('uk-UA', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        const dateInput = document.getElementById('expense-view-date');
        if (dateInput) {
            const fp = dateInput._flatpickr;
            if (fp) {
                fp.setDate(date, true);
                if (!dateInput.dataset.fpBound) {
                    dateInput.addEventListener('focus', () => fp.open());
                    dateInput.addEventListener('click', () => fp.open());
                    dateInput.dataset.fpBound = '1';
                }
            } else if (window.flatpickr) {
                // Initialize if not yet initialized (e.g., if modal injected after init)
                const init = window.flatpickr(dateInput, {
                    enableTime: true,
                    time_24hr: true,
                    dateFormat: 'Y-m-d H:i',
                    allowInput: true,
                });
                init.setDate(date, true);
                if (!dateInput.dataset.fpBound) {
                    dateInput.addEventListener('focus', () => init.open());
                    dateInput.addEventListener('click', () => init.open());
                    dateInput.dataset.fpBound = '1';
                }
            } else {
                // Fallback: just set string
                dateInput.value = `${formattedDate} ${formattedTime}`;
            }
        }
        
        if (DOM.deleteExpenseBtn) {
            DOM.deleteExpenseBtn.dataset.expenseId = expense._id;
            DOM.deleteExpenseBtn.dataset.groupId = expense.group;
        }
        if (DOM.saveExpenseBtn) {
            DOM.saveExpenseBtn.dataset.expenseId = expense._id;
            DOM.saveExpenseBtn.dataset.groupId = expense.group;
        }
        DOM.expenseViewModal.classList.remove('hidden');
    } else {
        DOM.expenseViewModal.classList.add('hidden');
    }
}

export function renderPayerSelect(members) {
    const payerSelect = DOM.payerSelect;
    if (!payerSelect) return;
    
    payerSelect.innerHTML = '';
    
    members.forEach(member => {
        const option = document.createElement('option');
        option.value = member._id;
        option.textContent = member.username;
        payerSelect.appendChild(option);
    });
}

export function renderParticipants(members) {
    const participantsContainer = DOM.participantsContainer;
    if (!participantsContainer) return;
    
    participantsContainer.innerHTML = '';
    
    members.forEach(member => {
        const participantDiv = document.createElement('div');
        participantDiv.className = 'participant-item selected';
        participantDiv.setAttribute('data-id', member._id);
        participantDiv.textContent = member.username;
        
        participantsContainer.appendChild(participantDiv);
    });
}

export function toggleNewGroupModal(show, currentUser = null) {
    if (show) {
        DOM.newGroupModal.classList.remove('hidden');
        DOM.newGroupModal.style.display = 'flex';
    } else {
        DOM.newGroupModal.classList.add('hidden');
        DOM.newGroupModal.style.display = 'none';
    }
    
    if (show && currentUser) {
        // Reset form
        document.getElementById('group-name').value = '';
        DOM.addParticipantInput.value = '';
        
        // Show current user as first participant
        renderGroupParticipants([currentUser]);
    }
}

export function renderGroupParticipants(participants) {
    DOM.groupParticipants.innerHTML = '';
    
    participants.forEach(participant => {
        const participantTag = document.createElement('div');
        participantTag.className = 'participant-tag';
        participantTag.style.cssText = 'display: inline-block; background-color: #3b82f6; color: white; padding: 8px 16px; border-radius: 20px; font-size: 1rem; font-weight: 500; margin: 4px 8px 4px 0;';
        participantTag.textContent = participant.username;
        DOM.groupParticipants.appendChild(participantTag);
    });
}

DOM.closeModalBtn.addEventListener('click', () => toggleModal(false));
DOM.cancelExpenseBtn.addEventListener('click', () => toggleModal(false));

export { DOM };