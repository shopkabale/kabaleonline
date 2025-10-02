import { auth, db } from '../js/auth.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- DOM ELEMENTS ---
const userProfilePhoto = document.getElementById('user-profile-photo');
const userDisplayName = document.getElementById('user-display-name');
const logoutBtn = document.getElementById('logout-btn');
const loader = document.getElementById('dashboard-loader');
// Note: We don't need 'dashboard-content' as the elements are now always visible.

/**
 * Fetches the user's profile data from Firestore and updates the UI.
 * @param {object} user The authenticated user object from Firebase.
 */
async function loadDashboardData(user) {
    try {
        // Fetch the user's data from the 'users' collection
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            const userData = userDoc.data();
            // Update the profile picture and display name
            userProfilePhoto.src = userData.profilePhotoUrl || 'https://placehold.co/100x100/e0e0e0/777?text=U';
            userDisplayName.textContent = userData.name || 'Valued Seller';
        } else {
            // This handles the rare case where a user is authenticated but has no profile document
            userDisplayName.textContent = 'Profile Not Found';
            console.error("User is authenticated, but their Firestore document is missing.");
        }
    } catch (error) {
        console.error("Error loading dashboard data:", error);
        userDisplayName.textContent = 'Error Loading Profile';
    } finally {
        // This will always run, ensuring the loader is hidden.
        if (loader) loader.style.display = 'none';
    }
}

// --- INITIALIZATION ---
// This listener is the entry point for the page. It waits for Firebase to confirm the login status.
onAuthStateChanged(auth, async (user) => {
    // The main page protection (redirects) is handled by shared.js.
    // This script's only job is to load data if a user is present and verified.
    if (user) {
        // We have a logged-in user, now check if their email is verified.
        // We reload to get the freshest verification status from Firebase servers.
        await user.reload();
        
        if (user.emailVerified) {
            // User is logged in AND verified, so load the dashboard content.
            loadDashboardData(user);
        } else {
            // This case should be handled by shared.js redirecting to /verify-email/
            // As a fallback, we'll just hide the loader and the user will see "Loading..." in the name.
            if(loader) loader.style.display = 'none';
        }
    } else {
        // This case is handled by shared.js, which redirects unauthenticated users to the /login/ page.
        // The loader will just continue to spin until the redirect happens.
    }
});

// --- EVENT LISTENERS ---
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        signOut(auth); // The page protection in shared.js will automatically handle the redirect to /login/
    });
}