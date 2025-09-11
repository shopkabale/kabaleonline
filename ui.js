// ui.js
document.addEventListener('DOMContentLoaded', () => {
  const hamburger = document.querySelector('.hamburger-menu');
  const mobileNav = document.querySelector('.mobile-nav');
  const overlay = document.querySelector('.mobile-nav-overlay');

  const pwaBanner = document.getElementById('pwa-banner');
  const pwaInstallBtn = document.getElementById('pwa-install-btn');
  const pwaCancelBtn = document.getElementById('pwa-cancel-btn');

  const loginPrompt = document.getElementById('loginPrompt');
  const loginCancelBtn = document.getElementById('loginPromptCancel');

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
      if (e.key === 'Escape' && mobileNav.classList.contains('active')) closeMenu();
    });
  }

  function showLoginPrompt() {
    if (!loginPrompt) return;
    const alreadyDismissed = localStorage.getItem("loginDismissed");
    if (!isUserLoggedIn() && !alreadyDismissed) loginPrompt.style.display = "flex";
  }
  function hideLoginPrompt() {
    if (loginPrompt) loginPrompt.style.display = "none";
    localStorage.setItem("loginDismissed", "true");
  }
  loginCancelBtn?.addEventListener('click', hideLoginPrompt);

  let deferredPrompt = null;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (!localStorage.getItem("pwaDismissed") && pwaBanner) {
      pwaBanner.style.display = "block";
      setTimeout(()=> pwaBanner.style.bottom = "0", 60);
    }
  });

  function hidePWABanner() {
    if (!pwaBanner) return;
    pwaBanner.style.bottom = "-120px";
    setTimeout(()=> pwaBanner.style.display = "none", 500);
    localStorage.setItem("pwaDismissed", "true");
  }
  pwaCancelBtn?.addEventListener("click", hidePWABanner);
  pwaInstallBtn?.addEventListener("click", async () => {
    hidePWABanner();
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
    }
  });
  window.addEventListener("appinstalled", () => { hidePWABanner(); console.log("PWA installed"); });

  // timers
  setTimeout(() => { if (!isUserLoggedIn() && !localStorage.getItem("loginDismissed")) showLoginPrompt(); }, 10000);
  setTimeout(() => { if (!localStorage.getItem("pwaDismissed") && deferredPrompt) { pwaBanner?.style.display = "block"; } }, 35000);

  // service worker
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").then(()=> console.log("Service Worker registered"))
      .catch(err => console.log("Service Worker failed:", err));
    });
  }
});