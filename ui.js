// ui.js (Production Mode - Fixed)

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
// HELPER: User login check
// ----------------------
// ⚠️ Replace this with your real login detection (e.g. Firebase auth, session, etc.)
function isUserLoggedIn() {
    // Example: check if token exists in localStorage
    return !!localStorage.getItem("userLoggedIn");
}

// ----------------------
// MOBILE NAV TOGGLE
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
// PWA BANNER FUNCTIONS
// ----------------------
function showPWABanner() {
    if (!localStorage.getItem("pwaDismissed")) {
        pwaBanner.style.display = "block";
        setTimeout(() => { pwaBanner.style.bottom = "0"; }, 50); // smooth slide
    }
}

function hidePWABanner() {
    pwaBanner.style.bottom = "-120px";
    localStorage.setItem("pwaDismissed", "true");
}

pwaCancelBtn?.addEventListener('click', hidePWABanner);
pwaInstallBtn?.addEventListener('click', () => {
    // Trigger install prompt if supported
    hidePWABanner();
});

// ----------------------
// LOGIN PROMPT FUNCTIONS
// ----------------------
function showLoginPrompt() {
    if (!isUserLoggedIn() && !localStorage.getItem("loginDismissed")) {
        loginPrompt.style.display = "flex";
    }
}

function hideLoginPrompt() {
    loginPrompt.style.display = "none";
    localStorage.setItem("loginDismissed", "true");
}

loginCancelBtn?.addEventListener('click', hideLoginPrompt);

// ----------------------
// TIMERS (One-Time Only)
// ----------------------
// Login Prompt after 10s (only if not logged in & not dismissed)
setTimeout(showLoginPrompt, 10000);

// PWA Banner after 35s (only if not dismissed)
setTimeout(showPWABanner, 35000);