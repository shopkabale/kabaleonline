import { auth } from './auth.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";

// --- PAGE PROTECTION ---
// This is the most important new feature. It automatically manages access to your pages.

// An array of all pages that require a user to be logged in.
const protectedPages = ['/dashboard/', '/upload/', '/products/', '/referrals/', '/profile/', '/settings/'];
// An array of pages that a logged-in user should NOT see (they get redirected away).
const publicOnlyPages = ['/login/', '/signup/'];

onAuthStateChanged(auth, (user) => {
    // Get the user's current URL path (e.g., "/dashboard/").
    const currentPage = window.location.pathname;

    if (user) {
        // --- CASE 1: The user IS logged in. ---
        if (publicOnlyPages.some(page => currentPage.startsWith(page))) {
            // If they try to visit the login or signup page, automatically send them to their dashboard.
            console.log("User is logged in. Redirecting from public page to dashboard.");
            window.location.replace('/dashboard/');
        }
    } else {
        // --- CASE 2: The user is NOT logged in. ---
        if (protectedPages.some(page => currentPage.startsWith(page))) {
            // If they try to visit any protected page, automatically send them to the login page.
            console.log("User is not logged in. Redirecting from protected page to login.");
            window.location.replace('/login/');
        }
    }
});


// --- SHARED UTILITY FUNCTIONS ---
// These are helper functions used by multiple scripts to avoid repeating code.

/**
 * Displays a message in a specified element (like an error or success box).
 * @param {HTMLElement} element The HTML element to show the message in.
 * @param {string} message The message content. Supports emojis.
 * @param {boolean} [isError=true] Toggles between error (red) and success (green) styling.
 */
export function showMessage(element, message, isError = true) {
    if (!element) return;
    element.innerHTML = message; // Use innerHTML to render emojis correctly
    element.className = isError ? 'error-message' : 'success-message';
    element.style.display = 'block';
    setTimeout(() => { element.style.display = 'none'; }, 5000);
}

/**
 * Toggles the loading state of a button, showing a spinner.
 * @param {HTMLButtonElement} button The button to toggle.
 * @param {boolean} isLoading True to show the loader, false to return to normal.
 * @param {string} originalText The button's original text to restore.
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
 * Normalizes a Ugandan WhatsApp number to the required 256xxxxxxxxx format.
 * @param {string} phone The phone number string from an input.
 * @returns {string} The correctly formatted phone number.
 */
export function normalizeWhatsAppNumber(phone) {
    let cleaned = ('' + phone).replace(/\D/g, '');
    if (cleaned.startsWith('0')) return '256' + cleaned.substring(1);
    if (cleaned.startsWith('256')) return cleaned;
    if (cleaned.length === 9) return '256' + cleaned;
    return cleaned; // Fallback
}

/**
 * Creates an optimized and transformed Cloudinary URL for images.
 * @param {string} url The original Cloudinary image URL.
 * @param {'thumbnail'|'full'} type The desired size ('thumbnail' or 'full').
 * @returns {string} The new, transformed image URL.
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