import { auth } from './auth.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";

// --- PAGE PROTECTION ---
// This automatically manages access to your dashboard pages.
// in /js/shared.js
const protectedPages = ['/dashboard/', '/upload/', '/products/', '/referrals/', '/profile/', '/settings/', '/admin/', '/calendar/'];
const publicOnlyPages = ['/login/', '/signup/'];

onAuthStateChanged(auth, (user) => {
    const currentPage = window.location.pathname;

    if (user) {
        // If a logged-in user tries to visit login/signup, send them to their dashboard.
        if (publicOnlyPages.some(page => currentPage.startsWith(page))) {
            window.location.replace('/dashboard/');
        }
    } else {
        // If a logged-out user tries to visit a protected page, send them to the login page.
        if (protectedPages.some(page => currentPage.startsWith(page))) {
            window.location.replace('/login/');
        }
    }
});


// --- SHARED UTILITY FUNCTIONS ---

export function showMessage(element, message, isError = true) {
    if (!element) return;
    element.innerHTML = message;
    element.className = isError ? 'error-message' : 'success-message';
    element.style.display = 'block';
    setTimeout(() => { element.style.display = 'none'; }, 5000);
}

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

export function normalizeWhatsAppNumber(phone) {
    let cleaned = ('' + phone).replace(/\D/g, '');
    if (cleaned.startsWith('0')) return '256' + cleaned.substring(1);
    if (cleaned.startsWith('256')) return cleaned;
    if (cleaned.length === 9) return '256' + cleaned;
    return cleaned;
}

export function getCloudinaryTransformedUrl(url, type) {
    if (!url || !url.includes('res.cloudinary.com')) {
        return url || 'https://placehold.co/400x400/e0e0e0/777?text=No+Image';
    }
    const transformations = {
        thumbnail: 'c_fill,g_auto,w_250,h_250,f_auto,q_auto',
        full: 'c_limit,w_800,h_800,f_auto,q_auto'
    };
    const transformString = transformations[type] || transformations.thumbnail;
    const urlParts = url.split('/upload/');
    if (urlParts.length !== 2) {
        return url;
    }
    return `${urlParts[0]}/upload/${transformString}/${urlParts[1]}`;
}


// --- PWA & LOGIN PROMPT LOGIC ---

let deferredInstallPrompt;

// Listen for the browser's native install prompt event
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
});

// Function to show the custom PWA install button
function showPwaInstallPrompt() {
  const isInstallable = !!deferredInstallPrompt;
  const isInstalled = window.matchMedia('(display-mode: standalone)').matches;

  if (isInstallable && !isInstalled) {
    const installButton = document.getElementById('install-button');
    if (installButton) {
      installButton.style.display = 'flex';
      installButton.addEventListener('click', async () => {
        installButton.style.display = 'none';
        deferredInstallPrompt.prompt();
        await deferredInstallPrompt.userChoice;
        deferredInstallPrompt = null;
      }, { once: true });
    }
  }
}

// Function to show the timed login prompt banner
function showLoginPrompt() {
  if (!auth.currentUser) {
    const loginPromptBanner = document.getElementById('login-prompt-banner');
    if (loginPromptBanner) {
        // --- THIS IS THE UPDATED LOGIC FOR THE ANIMATION ---
        loginPromptBanner.style.display = 'flex';
        setTimeout(() => {
            loginPromptBanner.classList.add('visible');
        }, 10); // Tiny delay to trigger the CSS transition
        
        const closePromptBtn = document.getElementById('close-prompt-btn');
        if (closePromptBtn) {
            closePromptBtn.addEventListener('click', () => {
                loginPromptBanner.classList.remove('visible');
                // Hide the element completely after the transition (400ms)
                setTimeout(() => {
                    loginPromptBanner.style.display = 'none';
                }, 400); 
            }, { once: true });
        }
    }
  }
}

// Set timers to run after the page has fully loaded
window.addEventListener('load', () => {
    // Show login prompt after 10 seconds
    setTimeout(showLoginPrompt, 10000);
    
    // Show PWA install prompt after 20 seconds
    setTimeout(showPwaInstallPrompt, 20000);
});