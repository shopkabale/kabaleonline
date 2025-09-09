// ui.js (Production Mode)

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
    if (pwaBanner) pwaBanner.style.bottom = '0';
}

function hidePWABanner() {
    if (pwaBanner) pwaBanner.style.bottom = '-120px';
}

pwaCancelBtn?.addEventListener('click', hidePWABanner);
pwaInstallBtn?.addEventListener('click', () => {
    // Trigger PWA install logic here if needed
    hidePWABanner();
});

// ----------------------
// LOGIN PROMPT FUNCTIONS
// ----------------------
function showLoginPrompt() {
    if (loginPrompt) loginPrompt.style.display = 'flex';
}

function hideLoginPrompt() {
    if (loginPrompt) loginPrompt.style.display = 'none';
}

loginCancelBtn?.addEventListener('click', hideLoginPrompt);

// ----------------------
// INDEPENDENT TIMERS
// ----------------------
// Login Prompt after 10s
setTimeout(showLoginPrompt, 10000);

// PWA Banner after 35s
setTimeout(showPWABanner, 35000);