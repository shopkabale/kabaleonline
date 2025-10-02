import { auth, db } from './auth.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { doc, getDoc, collection, query, where, getDocs, limit } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- THE "GATEKEEPER" ---
// This is a special promise that other scripts can wait for.
// It will only resolve when Firebase confirms a user is logged in AND their email is verified.
export const onVerifiedUser = new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
            await user.reload();
            if (user.emailVerified) {
                unsubscribe(); // Stop listening once we have a verified user
                resolve(user); // Send the "green light" with the user's info
            }
        }
    });
});


// --- PAGE PROTECTION ---
// This main listener handles all site-wide redirects.
onAuthStateChanged(auth, async (user) => {
    const protectedPages = ['/dashboard/', '/upload/', '/products/', '/referrals/', '/profile/', '/settings/', '/admin/', '/calendar/', '/qna/', '/referadmin/', '/verify-email/'];
    const publicOnlyPages = ['/login/'];
    const currentPage = window.location.pathname;

    if (user) {
        await user.reload();
        if (user.emailVerified) {
            // If a verified user is on the login or verify page, send them to the dashboard.
            if (publicOnlyPages.some(page => currentPage.startsWith(page)) || currentPage.startsWith('/verify-email/')) {
                window.location.replace('/dashboard/');
            }
            checkForAdminTasks(user);
        } else {
            // If a user is logged in but NOT verified, force them to the verification page.
            if (!currentPage.startsWith('/signup/') && !currentPage.startsWith('/verify-email/')) {
                window.location.replace('/verify-email/');
            }
        }
    } else {
        // If user is not logged in, block access to protected pages.
        if (protectedPages.some(page => currentPage.startsWith(page))) {
            window.location.replace('/login/');
        }
    }
});


async function checkForAdminTasks(user) {
    try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data().role === 'admin') {
            const q = query(collection(db, "referralValidationRequests"), where("status", "==", "pending"), limit(1));
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
                const banner = document.getElementById('admin-notification-banner');
                if (banner) banner.style.display = 'block';
            }
        }
    } catch (error) {
        console.error("Error checking for admin tasks:", error);
    }
}


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

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
});

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

function handleServiceRedirect() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('type') === 'service') {
        const modal = document.getElementById('service-notice');
        if (modal) modal.style.display = 'flex';
    }
    const serviceLinks = document.querySelectorAll('a[href="/?type=service"]');
    const modal = document.getElementById('service-notice');
    const continueBtn = document.getElementById('continue-btn');
    if (modal) {
        serviceLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                modal.style.display = 'flex';
            });
        });
        if (continueBtn) {
            continueBtn.addEventListener('click', function() {
                window.location.href = 'https://gigs.kabaleonline.com';
            });
        }
        modal.addEventListener('click', function(e) {
            if(e.target === modal) modal.style.display = 'none';
        });
    }
}


// --- INITIALIZE ALL LOGIC ---
document.addEventListener('DOMContentLoaded', () => {
    handleServiceRedirect();
    
    // This is a special, one-time check for the timed prompts
    const unsubscribe = onAuthStateChanged(auth, (user) => {
        setTimeout(() => showLoginPrompt(user), 10000);
        setTimeout(showPwaInstallPrompt, 20000);
        unsubscribe(); 
    });
});