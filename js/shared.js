import { auth, db } from './auth.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { doc, getDoc, collection, query, where, getDocs, limit } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- PAGE PROTECTION ---
const protectedPages = ['/dashboard/', '/upload/', '/products/', '/referrals/', '/profile/', '/settings/', '/admin/', '/calendar/', '/qna/', '/referadmin/'];
// IMPORTANT: '/signup/' is removed from this list to fix the registration flow.
const publicOnlyPages = ['/login/']; 

onAuthStateChanged(auth, (user) => {
    const currentPage = window.location.pathname;

    // --- THIS IS THE FIX ---
    // The signup page handles its own logic and is no longer part of the automatic redirect.
    if (currentPage.startsWith('/signup/')) {
        return; 
    }
    // --- END OF FIX ---

    if (user) {
        if (publicOnlyPages.some(page => currentPage.startsWith(page))) {
            window.location.replace('/dashboard/');
        }
        checkForAdminTasks(user);
    } else {
        if (protectedPages.some(page => currentPage.startsWith(page))) {
            window.location.replace('/login/');
        }
    }
});

// --- "SMART NOTIFICATION" FUNCTION FOR ADMIN ---
async function checkForAdminTasks(user) {
    try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data().role === 'admin') {
            
            // Check for pending referral approvals from the correct collection
            const q = query(collection(db, "referralValidationRequests"), where("status", "==", "pending"), limit(1));
            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                const banner = document.getElementById('admin-notification-banner');
                if (banner) {
                    banner.style.display = 'block';
                }
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


// --- PWA & LOGIN PROMPT LOGIC ---

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

// Set timers after the page has fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // This is the most reliable way to get the auth state on page load.
    // We wait for Firebase to confirm the user's status before starting the timers.
    const unsubscribe = onAuthStateChanged(auth, (user) => {
        setTimeout(() => showLoginPrompt(user), 10000);
        setTimeout(showPwaInstallPrompt, 20000);
        // Unsubscribe after the first check so this doesn't run again on login/logout
        unsubscribe(); 
    });
});