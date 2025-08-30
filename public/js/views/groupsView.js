import { DOM } from '../dom/domRefs.js';

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
        // Build static structure without injecting untrusted HTML
        item.innerHTML = `
            <div class="expense-main">
                <div class="expense-description"></div>
            </div>
            <div class="expense-details" style="margin-top:6px;">
                <div class="label" style="margin-right:8px;">Members:</div>
                <div class="expense-participants group-members"></div>
            </div>
        `;
        // Safely set user-controlled text
        const nameEl = item.querySelector('.expense-description');
        if (nameEl) nameEl.textContent = group.name || '';

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
