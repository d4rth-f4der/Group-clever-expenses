// Simple client-side router centralizing history and route handling
// Consumers provide handlers: { onGroups: () => Promise<void>, onGroup: (groupId, groupName) => Promise<void> }

let handlers = {
  onGroups: async () => {},
  onGroup: async () => {},
};

function getPath() {
  return window.location.pathname || '/';
}

async function handleRoute() {
  const path = getPath();
  if (path.startsWith('/groups/')) {
    const groupId = path.split('/')[2];
    const groupName = history.state?.groupName || 'Group Details';
    await handlers.onGroup(groupId, groupName);
  } else {
    await handlers.onGroups();
  }
}

export function initRouter(providedHandlers) {
  handlers = { ...handlers, ...(providedHandlers || {}) };
  window.addEventListener('popstate', handleRoute);
  // Handle the initial route on init
  return handleRoute();
}

export async function navigateToGroups({ replace = false } = {}) {
  const method = replace ? 'replaceState' : 'pushState';
  history[method]({ screen: 'groups' }, '', '/');
  await handlers.onGroups();
}

export async function navigateToGroup(groupId, groupName, { replace = false } = {}) {
  const method = replace ? 'replaceState' : 'pushState';
  history[method]({ screen: 'expenses', groupId, groupName }, '', `/groups/${groupId}`);
  await handlers.onGroup(groupId, groupName || 'Group Details');
}

export function replaceToRoot() {
  try { history.replaceState({}, '', '/'); } catch (_) {}
}
