// Groups controller: list and navigation
import { apiRequest } from '../api.js';
import { setState } from '../state/store.js';
import { renderGroups } from '../ui.js';
import { navigateToGroup } from '../router/router.js';

function attachGroupCardListeners() {
  const allGroupCards = document.querySelectorAll('.group-item');
  allGroupCards.forEach((card) =>
    card.addEventListener('click', () => {
      const groupId = card.dataset.groupId;
      const nameEl = card.querySelector('.expense-description');
      const groupName = nameEl ? nameEl.textContent : '';
      handleGroupClick(groupId, groupName);
    })
  );
}

export async function fetchGroups() {
  try {
    setState({ loading: true });
    const groups = await apiRequest('groups');
    setState({ loading: false });
    renderGroups(groups);
    attachGroupCardListeners();
  } catch (error) {
    // displayError is UI-level; keep error visible via alert/console to avoid circular deps
    console.error(error);
    alert(error.message || 'Failed to load groups');
    setState({ loading: false });
  }
}

export function handleGroupClick(groupId, groupName) {
  navigateToGroup(groupId, groupName);
}
