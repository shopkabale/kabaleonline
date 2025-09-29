// Import only the specific functions needed from your central auth.js file
import { onAuthStateChanged, auth } from './auth.js';

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
    if (loginPrompt) {
      loginPrompt.style.display = "none";
    }
    // Set a timestamp to prevent the prompt from showing again for a while
    localStorage.setItem("loginDismissedAt", Date.now());
  }

  loginCancelBtn?.addEventListener('click', hideLoginPrompt);

  // This listener reliably checks the user's login state on every page load
  onAuthStateChanged(auth, (user) => {
    if (user) {
      // If the user is logged in, always hide the "please log in" prompt.
      if (loginPrompt) {
        loginPrompt.style.display = "none";
      }
    } else {
      // If the user is logged out, check if they dismissed the prompt recently.
      const dismissedAt = localStorage.getItem('loginDismissedAt');
      const oneMonthInMs = 30 * 24 * 60 * 60 * 1000;

      if (dismissedAt && (Date.now() - dismissedAt < oneMonthInMs)) {
        console.log("Login prompt suppressed due to recent dismissal.");
        return; // Exit and don't show the prompt.
      }

      // If they haven't dismissed it, show it after a 10-second delay.
      setTimeout(() => {
        // Final check to ensure the user didn't log in during the 10-second wait.
        if (!auth.currentUser && loginPrompt) {
          loginPrompt.style.display = "flex";
        }
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
    if (!deferredPrompt || window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }
    const lastDismissed = localStorage.getItem('installPromptDismissedAt');
    const oneWeekInMs = 7 * 24 * 60 * 60 * 1000;
    if (lastDismissed && (Date.now() - lastDismissed < oneWeekInMs)) {
      return;
    }
    if (installAppPrompt) {
      installAppPrompt.style.display = "flex";
    }
  }

  function hideInstallPrompt() {
    if (installAppPrompt) {
      installAppPrompt.style.display = "none";
    }
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
  // (Your existing code for this section is fine and can remain here)
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js")
        .then(() => console.log("Service Worker registered successfully."))
        .catch(err => console.log("Service Worker registration failed:", err));
    });
  }
});
