import { DOM } from '../../dom/domRefs.js';

export function toggleNewGroupModal(show, currentUser = null) {
    if (show) {
        DOM.newGroupModal.classList.remove('hidden');
        DOM.newGroupModal.style.display = 'flex';
    } else {
        DOM.newGroupModal.classList.add('hidden');
        DOM.newGroupModal.style.display = 'none';
    }
    if (show && currentUser) {
        const nameEl = document.getElementById('group-name');
        if (nameEl) nameEl.value = '';
        DOM.addParticipantInput.value = '';
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

if (DOM.closeNewGroupBtn) {
    DOM.closeNewGroupBtn.addEventListener('click', () => toggleNewGroupModal(false));
}
if (DOM.cancelNewGroupBtn) {
    DOM.cancelNewGroupBtn.addEventListener('click', () => toggleNewGroupModal(false));
}
