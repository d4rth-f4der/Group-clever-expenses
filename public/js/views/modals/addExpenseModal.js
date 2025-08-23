import { DOM } from '../../dom/domRefs.js';

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

// Preserve previous immediate listeners for close/cancel
if (DOM.closeModalBtn) {
    DOM.closeModalBtn.addEventListener('click', () => toggleModal(false));
}
if (DOM.cancelExpenseBtn) {
    DOM.cancelExpenseBtn.addEventListener('click', () => toggleModal(false));
}
