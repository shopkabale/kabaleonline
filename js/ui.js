// Import only the specific functions needed from your central auth.js file
import { onAuthStateChanged, auth } from './auth.js';

// --- UNIVERSAL BUTTON LOADING FUNCTION ---
export function toggleLoading(button, isLoading, originalText) {
  if (!button) return;
  if (isLoading) {
    button.disabled = true;
    button.classList.add('loading');
    button.innerHTML = `<span class="loader"></span> ${originalText}`;
  } else {
    button.disabled = false;
    button.classList.remove('loading');
    button.innerHTML = originalText;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // --- ELEMENT SELECTORS ---
  const hamburger = document.querySelector('.hamburger-menu');
  const mobileNav = document.querySelector('.mobile-nav');
  const overlay = document.querySelector('.mobile-nav-overlay');
  const loginPrompt = document.getElementById('loginPrompt');
  const loginCancelBtn = document.getElementById('loginPromptCancel');
  const installAppPrompt = document.getElementById('install-app-prompt');
  const installAppBtn = document.getElementById('install-app-btn');
  const installAppCancel = document.getElementById('install-app-cancel');
  const notificationsBtn = document.getElementById('enable-notifications-btn');

  // --- HAMBURGER MENU LOGIC ---
  if (hamburger && mobileNav && overlay) {
    const openMenu = () => {
      mobileNav.classList.add('active');
      overlay.classList.add('active');
    };
    const closeMenu = () => {
      mobileNav.classList.remove('active');
      overlay.classList.remove('active');
    };
    hamburger.addEventListener('click', openMenu);
    overlay.addEventListener('click', closeMenu);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileNav.classList.contains('active')) {
        closeMenu();
      }
    });
  }

  // --- LOGIN PROMPT LOGIC ---
  function hideLoginPrompt() {
    if (loginPrompt) loginPrompt.style.display = "none";
    localStorage.setItem("loginDismissedAt", Date.now());
  }
  loginCancelBtn?.addEventListener('click', hideLoginPrompt);

  onAuthStateChanged(auth, (user) => {
    if (user) {
      if (loginPrompt) loginPrompt.style.display = "none";
    } else {
      const dismissedAt = localStorage.getItem('loginDismissedAt');
      const oneMonthInMs = 30 * 24 * 60 * 60 * 1000;
      if (dismissedAt && (Date.now() - dismissedAt < oneMonthInMs)) return;

      setTimeout(() => {
        if (!auth.currentUser && loginPrompt) loginPrompt.style.display = "flex";
      }, 10000);
    }
  });

  // --- PWA INSTALL PROMPT LOGIC ---
  let deferredPrompt = null;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallPromptIfNeeded();
  });

  function showInstallPromptIfNeeded() {
    if (!deferredPrompt || window.matchMedia('(display-mode: standalone)').matches) return;
    const lastDismissed = localStorage.getItem('installPromptDismissedAt');
    const oneWeekInMs = 7 * 24 * 60 * 60 * 1000;
    if (lastDismissed && (Date.now() - lastDismissed < oneWeekInMs)) return;
    if (installAppPrompt) installAppPrompt.style.display = "flex";
  }

  function hideInstallPrompt() {
    if (installAppPrompt) installAppPrompt.style.display = "none";
    localStorage.setItem('installPromptDismissedAt', Date.now());
  }

  installAppCancel?.addEventListener('click', hideInstallPrompt);
  installAppBtn?.addEventListener('click', async () => {
    if (deferredPrompt) {
      hideInstallPrompt();
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
    }
  });

  window.addEventListener("appinstalled", () => {
    if (installAppPrompt) installAppPrompt.style.display = "none";
    localStorage.removeItem('installPromptDismissedAt');
  });

  // --- NOTIFICATIONS & SERVICE WORKER LOGIC ---
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js")
        .then(() => console.log("Service Worker registered successfully."))
        .catch(err => console.log("Service Worker registration failed:", err));
    });
  }

  // --- UNIVERSAL BUTTON LOADING HANDLER ---
  // Automatically adds a loader to buttons with data-loading, .auth-button, or .cta-button
  document.addEventListener('click', async function(e) {
    const btn = e.target.closest('button[data-loading], button.auth-button, button.cta-button');
    if (!btn) return;
    if (btn.classList.contains('loading')) return; // Ignore already loading buttons

    if (!btn.dataset.originalText) btn.dataset.originalText = btn.innerHTML;
    toggleLoading(btn, true, btn.dataset.originalText);

    // Safety fallback: remove loader after 10s in case async code fails
    const timeoutId = setTimeout(() => toggleLoading(btn, false, btn.dataset.originalText), 10000);

    // If button is inside a form, wait for form submit handlers
    const form = btn.closest('form');
    if (form) {
      form.dispatchEvent(new Event('submit', { cancelable: true }));
      // Form handler should call toggleLoading(btn, false) after async completes
    } else {
      // Non-form buttons: remove loader automatically after 1s
      setTimeout(() => toggleLoading(btn, false, btn.dataset.originalText), 1000);
    }
  });
});