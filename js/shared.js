import { auth } from './auth.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";

// --- PAGE PROTECTION ---
const protectedPages = ['/dashboard/', '/upload/', '/products/', '/referrals/', '/profile/', '/settings/', '/admin/', '/calendar/', '/qna/', '/referadmin/'];
const publicOnlyPages = ['/login/', '/signup/'];

onAuthStateChanged(auth, (user) => {
    const currentPage = window.location.pathname;

    if (user) {
        if (publicOnlyPages.some(page => currentPage.startsWith(page))) {
            window.location.replace('/dashboard/');
        }
    } else {
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


// --- PWA, LOGIN & SERVICE PROMPT LOGIC ---

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
function showLoginPrompt(user) {
  if (!user) {
    const loginPromptBanner = document.getElementById('login-prompt-banner');
    if (loginPromptBanner) {
        loginPromptBanner.style.display = 'flex';
        setTimeout(() => {
            loginPromptBanner.classList.add('visible');
        }, 10);
        
        const closePromptBtn = document.getElementById('close-prompt-btn');
        if (closePromptBtn) {
            closePromptBtn.addEventListener('click', () => {
                loginPromptBanner.classList.remove('visible');
                setTimeout(() => {
                    loginPromptBanner.style.display = 'none';
                }, 400); 
            }, { once: true });
        }
    }
  }
}

// Function to handle the redirect for "Services" links
function handleServiceRedirect() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('type') === 'service') {
        const modal = document.getElementById('service-notice');
        const continueBtn = document.getElementById('continue-btn');

        if (modal && continueBtn) {
            modal.style.display = 'flex';
            continueBtn.addEventListener('click', () => {
                window.location.href = 'https://gigs.kabaleonline.com';
            });
            modal.addEventListener('click', (e) => {
                if(e.target === modal) modal.style.display = 'none';
            });
        }
    }

    // This handles the links in your navigation that go to /?type=service
    const serviceLinks = document.querySelectorAll('a[href="/?type=service"]');
    serviceLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const modal = document.getElementById('service-notice');
            if (modal) modal.style.display = 'flex';
        });
    });
}


// --- INITIALIZE ALL LOGIC ---
// This runs once the basic page structure is ready.
document.addEventListener('DOMContentLoaded', () => {
    // Handle the service redirect immediately
    handleServiceRedirect();

    // Wait for Firebase to confirm the user's login status before starting timers
    const unsubscribe = onAuthStateChanged(auth, (user) => {
        // Now that we know the user's status, we can set the timers.
        setTimeout(() => showLoginPrompt(user), 10000);
        setTimeout(showPwaInstallPrompt, 20000);

        // Unsubscribe after the first check so this doesn't run again on every login/logout
        unsubscribe(); 
    });
});