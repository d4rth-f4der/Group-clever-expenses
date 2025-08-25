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
        renderGroupParticipants([currentUser], currentUser.username);
    }
}

export function renderGroupParticipants(participants, activeUsername = null) {
    DOM.groupParticipants.innerHTML = '';
    participants.forEach(participant => {
        const participantTag = document.createElement('div');
        participantTag.className = 'participant-tag';
        participantTag.dataset.username = participant.username;

        // Text node for username
        const nameNode = document.createElement('span');
        nameNode.textContent = participant.username;
        participantTag.appendChild(nameNode);

        // Add removable control for non-active users
        const isActive = activeUsername && participant.username.toLowerCase() === activeUsername.toLowerCase();
        if (!isActive) {
            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'participant-remove';
            removeBtn.setAttribute('aria-label', `Remove ${participant.username}`);
            removeBtn.textContent = '×';
            participantTag.appendChild(removeBtn);
        }
        DOM.groupParticipants.appendChild(participantTag);
    });
}

if (DOM.closeNewGroupBtn) {
    DOM.closeNewGroupBtn.addEventListener('click', () => toggleNewGroupModal(false));
}
if (DOM.cancelNewGroupBtn) {
    DOM.cancelNewGroupBtn.addEventListener('click', () => toggleNewGroupModal(false));
}
