// Firebase Imports - Updated to include onAuthStateChanged for reliable auth checks
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getToken } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-messaging.js";
import { db, doc, setDoc, auth, messaging } from './firebase.js';

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

  // --- HAMBURGER MENU LOGIC (Unchanged) ---
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

  // --- START: REVISED AND FIXED LOGIN PROMPT LOGIC ---

  // Hides the prompt and sets a timestamp to prevent it from showing again too soon.
  function hideLoginPrompt() {
    if (loginPrompt) {
      loginPrompt.style.display = "none";
    }
    localStorage.setItem("loginDismissedAt", Date.now());
  }
  
  loginCancelBtn?.addEventListener('click', hideLoginPrompt);

  /**
   * Firebase authentication listener.
   * This is the reliable source of truth for the user's login state.
   * It runs automatically when the page loads and any time the user logs in or out.
   */
  onAuthStateChanged(auth, (user) => {
    if (user) {
      // --- USER IS LOGGED IN ---
      console.log("Auth state changed: User is logged in.", user.uid);
      // If the user is logged in, we should always hide the prompt.
      if (loginPrompt) {
        loginPrompt.style.display = "none";
      }
    } else {
      // --- USER IS LOGGED OUT ---
      console.log("Auth state changed: User is logged out.");
      
      // Check if they dismissed the prompt recently (e.g., within the last 30 days)
      const dismissedAt = localStorage.getItem('loginDismissedAt');
      const oneMonthInMs = 30 * 24 * 60 * 60 * 1000;

      if (dismissedAt && (Date.now() - dismissedAt < oneMonthInMs)) {
        console.log("Login prompt suppressed due to recent dismissal.");
        return; // Exit the function; don't show the prompt.
      }
      
      // If the user is logged out AND hasn't dismissed it recently,
      // show the prompt after a 10-second delay.
      setTimeout(() => {
        // Final check: only show the prompt if the user is STILL logged out after the delay.
        // This prevents the prompt from appearing if they log in during the 10-second wait.
        if (!auth.currentUser && loginPrompt) {
          loginPrompt.style.display = "flex";
        }
      }, 10000);
    }
  });

  // --- END: REVISED AND FIXED LOGIN PROMPT LOGIC ---


  // --- PWA INSTALL PROMPT LOGIC (Unchanged - Already Excellent) ---
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


  // --- NOTIFICATIONS LOGIC (Unchanged) ---
  async function requestNotificationPermission() {
    // This assumes you are using a service like OneSignal.
    // Replace with your own logic if necessary.
    OneSignal.Slidedown.promptPush();
  }

  notificationsBtn?.addEventListener('click', requestNotificationPermission);

  if (window.matchMedia('(display-mode: standalone)').matches) {
    const alreadyPrompted = localStorage.getItem('notificationPromptedAfterInstall');
    if (!alreadyPrompted) {
      setTimeout(() => {
        requestNotificationPermission();
      }, 2000);
      localStorage.setItem('notificationPromptedAfterInstall', 'true');
    }
  }


  // --- SERVICE WORKER REGISTRATION (Unchanged) ---
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js")
        .then(() => console.log("Service Worker registered successfully."))
        .catch(err => console.log("Service Worker registration failed:", err));
    });
  }
});
