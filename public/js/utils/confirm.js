// Small helper to show custom confirm modal and return a Promise<boolean>
// Options: { overlayCancel?: boolean, escCancel?: boolean }
export function showConfirm(message = 'Are you sure?', options = {}) {
  const { overlayCancel = true, escCancel = true } = options;
  return new Promise((resolve) => {
    const modal = document.getElementById('confirm-modal');
    const msgEl = document.getElementById('confirm-message');
    const yesBtn = document.getElementById('confirm-yes-btn');
    const cancelBtn = document.getElementById('confirm-cancel-btn');
    const closeBtn = document.getElementById('close-confirm-btn');

    if (!modal || !msgEl || !yesBtn || !cancelBtn || !closeBtn) {
      // Fallback to native confirm if modal missing
      resolve(window.confirm(message));
      return;
    }

    msgEl.textContent = message;
    modal.classList.remove('hidden');

    const cleanup = () => {
      modal.classList.add('hidden');
      yesBtn.removeEventListener('click', onYes);
      cancelBtn.removeEventListener('click', onNo);
      closeBtn.removeEventListener('click', onNo);
      modal.removeEventListener('click', onOverlayClick);
      document.removeEventListener('keydown', onKeyDown, true);
    };

    const onYes = () => { cleanup(); resolve(true); };
    const onNo = () => { cleanup(); resolve(false); };
    const onOverlayClick = (e) => {
      if (!overlayCancel) return;
      if (e.target === modal) onNo();
    };
    const onKeyDown = (e) => {
      if (!escCancel) return;
      if (e.key === 'Escape') {
        e.stopPropagation();
        e.preventDefault();
        onNo();
      }
    };

    yesBtn.addEventListener('click', onYes);
    cancelBtn.addEventListener('click', onNo);
    closeBtn.addEventListener('click', onNo);
    modal.addEventListener('click', onOverlayClick);
    document.addEventListener('keydown', onKeyDown, true);
  });
}
