document.addEventListener('DOMContentLoaded', () => {
  const hamburger = document.querySelector('.hamburger-menu');
  const mobileNav = document.querySelector('.mobile-nav');
  const overlay = document.querySelector('.mobile-nav-overlay');
  const loginPrompt = document.getElementById('loginPrompt');
  const loginCancelBtn = document.getElementById('loginPromptCancel');
  const installAppPrompt = document.getElementById('install-app-prompt');
  const installAppBtn = document.getElementById('install-app-btn');
  const installAppCancel = document.getElementById('install-app-cancel');

  function isUserLoggedIn() {
    return !!localStorage.getItem("userLoggedIn");
  }

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

  function showLoginPrompt() {
    if (!loginPrompt) return;
    const alreadyDismissed = localStorage.getItem("loginDismissed");
    if (!isUserLoggedIn() && !alreadyDismissed) {
      loginPrompt.style.display = "flex";
    }
  }
  function hideLoginPrompt() {
    if (loginPrompt) {
      loginPrompt.style.display = "none";
    }
    localStorage.setItem("loginDismissed", "true");
  }
  loginCancelBtn?.addEventListener('click', hideLoginPrompt);

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

  setTimeout(showLoginPrompt, 10000);

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js")
        .then(() => console.log("Service Worker registered successfully."))
        .catch(err => console.log("Service Worker registration failed:", err));
    });
  }
});
