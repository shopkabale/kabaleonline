import { auth } from './auth.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";

// --- PAGE PROTECTION ---
// List of pages that require a user to be logged in.
const protectedPages = ['/dashboard/', '/upload/', '/products/', '/referrals/', '/profile/'];
// List of pages that should NOT be accessible if the user is already logged in.
const publicOnlyPages = ['/login/', '/signup/'];

onAuthStateChanged(auth, (user) => {
    const currentPage = window.location.pathname;

    if (user) {
        // User is logged in
        if (publicOnlyPages.some(page => currentPage.startsWith(page))) {
            // If they are on a login/signup page, redirect to the dashboard.
            console.log("User is logged in. Redirecting from public page to dashboard.");
            window.location.replace('/dashboard/');
        }
    } else {
        // User is not logged in
        if (protectedPages.some(page => currentPage.startsWith(page))) {
            // If they are on a protected page, redirect to the login page.
            console.log("User is not logged in. Redirecting from protected page to login.");
            window.location.replace('/login/');
        }
    }
});


// --- SHARED UTILITY FUNCTIONS ---

/**
 * Displays a message in a specified element.
 * @param {HTMLElement} element The element to display the message in.
 * @param {string} message The message to display.
 * @param {boolean} [isError=true] Whether the message is an error.
 */
export function showMessage(element, message, isError = true) {
    if (!element) return;
    element.innerHTML = message; // Use innerHTML for emojis
    element.className = isError ? 'error-message' : 'success-message';
    element.style.display = 'block';
    setTimeout(() => { element.style.display = 'none'; }, 5000);
}

/**
 * Toggles the loading state of a button.
 * @param {HTMLButtonElement} button The button element.
 * @param {boolean} isLoading Whether to show the loading state.
 * @param {string} originalText The original text of the button.
 */
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

/**
 * Normalizes a Ugandan WhatsApp number to the 256 format.
 * @param {string} phone The phone number string.
 * @returns {string} The normalized phone number.
 */
export function normalizeWhatsAppNumber(phone) {
    let cleaned = ('' + phone).replace(/\D/g, '');
    if (cleaned.startsWith('0')) return '256' + cleaned.substring(1);
    if (cleaned.startsWith('256')) return cleaned;
    if (cleaned.length === 9) return '256' + cleaned;
    return cleaned; // Fallback
}

/**
 * Creates an optimized and transformed Cloudinary URL.
 * @param {string} url The original Cloudinary URL.
 * @param {'thumbnail'|'full'} type The desired transformation type.
 * @returns {string} The new, transformed URL.
 */
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