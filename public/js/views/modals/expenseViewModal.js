import { DOM } from '../../dom/domRefs.js';

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
            let members = Array.isArray(groupMembers) && groupMembers.length > 0 ? groupMembers : [];
            const payerId = typeof expense.payer === 'object' ? expense.payer._id : String(expense.payer);
            const payerObj = typeof expense.payer === 'object' ? expense.payer : null;
            if (!members.length) {
                const fromParticipants = expense.participants?.map(p => p.user).filter(Boolean) || [];
                members = [...fromParticipants];
                if (payerObj && !members.find(m => String(m._id) === String(payerId))) {
                    members.push(payerObj);
                }
            }
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
        // Render participants chips
        const viewParticipants = document.getElementById('expense-view-participants');
        if (viewParticipants) {
            viewParticipants.innerHTML = '';
            const participantIds = new Set(expense.participants.map(p => p.user._id));
            const toRender = Array.isArray(groupMembers) && groupMembers.length > 0 ? groupMembers : expense.participants.map(p => p.user);
            toRender.forEach(member => {
                const chip = document.createElement('div');
                const isSelected = participantIds.has(member._id);
                chip.className = 'participant-item' + (isSelected ? ' selected' : '');
                chip.textContent = member.username;
                chip.setAttribute('data-id', member._id);
                chip.addEventListener('click', (e) => {
                    e.stopPropagation();
                    chip.classList.toggle('selected');
                });
                viewParticipants.appendChild(chip);
            });
        }
        // Date handling
        const date = new Date(expense.date);
        const formattedDate = date.toLocaleDateString('uk-UA', { year: 'numeric', month: '2-digit', day: '2-digit' });
        const formattedTime = date.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
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
                const init = window.flatpickr(dateInput, { enableTime: true, time_24hr: true, dateFormat: 'Y-m-d H:i', allowInput: true });
                init.setDate(date, true);
                if (!dateInput.dataset.fpBound) {
                    dateInput.addEventListener('focus', () => init.open());
                    dateInput.addEventListener('click', () => init.open());
                    dateInput.dataset.fpBound = '1';
                }
            } else {
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

if (DOM.closeExpenseViewBtn) {
    DOM.closeExpenseViewBtn.addEventListener('click', () => toggleExpenseViewModal(false));
}
