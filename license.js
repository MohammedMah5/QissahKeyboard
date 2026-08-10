/* =====================================================================
   Qissah Keyboard — Upgrade
   Direct upgrade flow: clicking "افتح جميع القصص!" opens a modal with
   a direct upgrade button (placeholder for payment integration).
   ===================================================================== */

import { userState, setProStatus } from './state.js';
import { ensureUserDefaults } from './db.js';
import { userDocRef } from './db.js';
import { setDoc } from './firebase-init.js';

/**
 * Directly upgrades the current user to Pro.
 * Writes the upgrade to Firestore and local state.
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function directUpgrade() {
  if (!userState.uid) {
    return { success: false, message: 'يرجى تسجيل الدخول أولاً.' };
  }

  try {
    await ensureUserDefaults(userState.uid, {});
    await setDoc(
      userDocRef(userState.uid),
      { isPro: true, activatedAt: new Date() },
      { merge: true }
    );
    setProStatus(true);
    document.dispatchEvent(new CustomEvent('license-activated'));
    return { success: true, message: 'تم الترقية بنجاح!' };
  } catch (error) {
    // Error handled silently in production
    return { success: false, message: 'فشلت الترقية. حاول مرة أخرى.' };
  }
}

/* ------------------------- Element references ------------------------- */

const upgradeModalEl = document.getElementById('upgrade-modal');
const upgradeModalUpgradeBtn = document.getElementById('upgrade-modal-upgrade-btn');
const closeModalBtn = document.getElementById('upgrade-modal-close');

/* ------------------------- Modal helpers ------------------------- */

export function openUpgradeModal() {
  upgradeModalEl.hidden = false;
}

export function closeUpgradeModal() {
  upgradeModalEl.hidden = true;
}

/* ------------------------- Event wiring ------------------------- */

// Close button + clicking the overlay backdrop closes the modal
closeModalBtn.addEventListener('click', closeUpgradeModal);
upgradeModalEl.addEventListener('click', (event) => {
  if (event.target === upgradeModalEl) closeUpgradeModal();
});

// "ترقية الآن" → direct upgrade button (placeholder for payment integration)
upgradeModalUpgradeBtn.addEventListener('click', async () => {
  const result = await directUpgrade();
  window.alert(result.message);
});