// ui.js (Final Production Mode)

// ----------------------
// ELEMENT SELECTORS
// ----------------------
const hamburger = document.querySelector('.hamburger-menu');
const mobileNav = document.querySelector('.mobile-nav');
const overlay = document.querySelector('.mobile-nav-overlay');

const pwaBanner = document.getElementById('pwa-banner');
const pwaInstallBtn = document.getElementById('pwa-install-btn');
const pwaCancelBtn = document.getElementById('pwa-cancel-btn');

const loginPrompt = document.getElementById('loginPrompt');
const loginCancelBtn = document.getElementById('loginPromptCancel');

// ----------------------
// HELPER: Check login
// ----------------------
// Replace with Firebase or session check if you have one
function isUserLoggedIn() {
  return !!localStorage.getItem("userLoggedIn");
}

// ----------------------
// MOBILE NAVIGATION
// ----------------------
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
}

// ----------------------
// LOGIN PROMPT
// ----------------------
function showLoginPrompt() {
  const alreadyDismissed = localStorage.getItem("loginDismissed");
  if (!isUserLoggedIn() && !alreadyDismissed) {
    loginPrompt.style.display = "flex";
  }
}

function hideLoginPrompt() {
  if (loginPrompt) loginPrompt.style.display = "none";
  localStorage.setItem("loginDismissed", "true"); // ✅ never show again
}

loginCancelBtn?.addEventListener('click', hideLoginPrompt);

// ----------------------
// PWA BANNER
// ----------------------
let deferredPrompt = null;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
});

function showPWABanner() {
  const alreadyDismissed = localStorage.getItem("pwaDismissed");
  if (!alreadyDismissed && deferredPrompt) {
    pwaBanner.style.display = "block";
    setTimeout(() => {
      pwaBanner.style.bottom = "0"; // slide up
    }, 50);
  }
}

function hidePWABanner() {
  if (pwaBanner) {
    pwaBanner.style.bottom = "-120px";
    setTimeout(() => {
      pwaBanner.style.display = "none";
    }, 500);
  }
  localStorage.setItem("pwaDismissed", "true"); // ✅ never show again
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

// ----------------------
// TIMERS
// ----------------------
// Login prompt → after 10s
setTimeout(() => {
  if (!isUserLoggedIn() && !localStorage.getItem("loginDismissed")) {
    showLoginPrompt();
  }
}, 10000);

// PWA banner → after 35s
setTimeout(() => {
  if (!localStorage.getItem("pwaDismissed")) {
    showPWABanner();
  }
}, 35000);