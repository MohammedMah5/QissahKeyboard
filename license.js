/* =====================================================================
   Qissah Keyboard — License Key Activation
   Supports a local TEST MODE for development and production Lemon
   Squeezy license validation for a ONE-TIME LIFETIME purchase.
   ===================================================================== */

import { userState } from './state.js';

// Development / Testing Flag. Set to false in production.
const IS_TEST_MODE = true;

// Placeholder Lemon Squeezy checkout link — replace with your real link.
const LEMON_SQUEEZY_CHECKOUT_URL = 'YOUR_LEMON_SQUEEZY_CHECKOUT_LINK';

/**
 * Validate a user-supplied license key.
 * @param {string} userInputKey - The key the user entered in the activation form.
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function verifyLicenseKey(userInputKey) {
  const trimmedKey = userInputKey.trim();
  if (!trimmedKey) return { success: false, message: 'Please enter a key.' };

  // 1. TEST MODE
  if (IS_TEST_MODE && trimmedKey === 'TEST-KEY-123') {
    return { success: true, message: 'Test key activated successfully!' };
  }

  // 2. PRODUCTION LEMON SQUEEZY API
  try {
    const response = await fetch('https://api.lemonsqueezy.com/v1/licenses/validate', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ license_key: trimmedKey }),
    });

    const data = await response.json();

    if (data.valid === true) {
      return { success: true, message: 'Lifetime license activated successfully!' };
    }
    return { success: false, message: data.error || 'Invalid key.' };
  } catch (error) {
    console.error('License validation error:', error);
    return { success: false, message: 'Network error. Please try again.' };
  }
}

/* ------------------------- Element references ------------------------- */

const upgradeModalEl = document.getElementById('upgrade-modal');
const upgradeModalPricing = document.getElementById('upgrade-modal-pricing');
const upgradeModalActivation = document.getElementById('upgrade-modal-activation');
const activationKeyInput = document.getElementById('activation-key-input');
const submitLicenseBtn = document.getElementById('submit-license-btn');
const licenseStatusEl = document.getElementById('license-status');
const checkoutBtn = document.getElementById('checkout-btn');
const hasKeyLink = document.getElementById('has-key-link');
const backToPricingLink = document.getElementById('back-to-pricing-link');
const closeModalBtn = document.getElementById('upgrade-modal-close');

/* ------------------------- Modal helpers ------------------------- */

export function openUpgradeModal() {
  upgradeModalEl.hidden = false;
  showPricingView();
}

export function closeUpgradeModal() {
  upgradeModalEl.hidden = true;
  licenseStatusEl.hidden = true;
  activationKeyInput.value = '';
}

function showPricingView() {
  upgradeModalPricing.hidden = false;
  upgradeModalActivation.hidden = true;
  licenseStatusEl.hidden = true;
  activationKeyInput.value = '';
}

function showActivationView() {
  upgradeModalPricing.hidden = true;
  upgradeModalActivation.hidden = false;
  licenseStatusEl.hidden = true;
  activationKeyInput.focus();
}

/* ------------------------- Event wiring ------------------------- */

// Close button + clicking the overlay backdrop closes the modal
closeModalBtn.addEventListener('click', closeUpgradeModal);
upgradeModalEl.addEventListener('click', (event) => {
  if (event.target === upgradeModalEl) closeUpgradeModal();
});

// "لديك كود تفعيل؟" → switch to the activation form
hasKeyLink.addEventListener('click', (event) => {
  event.preventDefault();
  showActivationView();
});

// "العودة إلى الأسعار" → back to pricing
backToPricingLink.addEventListener('click', (event) => {
  event.preventDefault();
  showPricingView();
});

// Primary CTA → redirect to Lemon Squeezy checkout
checkoutBtn.addEventListener('click', () => {
  window.open(LEMON_SQUEEZY_CHECKOUT_URL, '_blank');
});

// Activate button → validate the license key
submitLicenseBtn.addEventListener('click', async (event) => {
  event.preventDefault();
  const key = activationKeyInput.value;
  licenseStatusEl.hidden = true;

  const result = await verifyLicenseKey(key);

  licenseStatusEl.textContent = result.message;
  licenseStatusEl.classList.toggle('is-error', !result.success);
  licenseStatusEl.classList.toggle('is-success', result.success);
  licenseStatusEl.hidden = false;

  if (result.success) {
    // Mark the user as Pro (lifetime) and notify the app so the navbar refreshes
    // (hides the upgrade button). A custom event avoids a circular import with ui.js.
    userState.isPro = true;
    document.dispatchEvent(new CustomEvent('license-activated'));
  }
});

// Allow pressing Enter inside the input to trigger activation
activationKeyInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    submitLicenseBtn.click();
  }
});