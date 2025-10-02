import { auth, db } from '../js/auth.js';
import { signOut } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- DOM ELEMENTS ---
const userProfilePhoto = document.getElementById('user-profile-photo');
const userDisplayName = document.getElementById('user-display-name');
const logoutBtn = document.getElementById('logout-btn');
const loader = document.getElementById('dashboard-loader');
const content = document.getElementById('dashboard-content');

// This function will only run after shared.js confirms we have a verified user
// and will be passed the user object.
async function loadDashboardData(user) {
    try {
        // Fetch the user's data from Firestore
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            const userData = userDoc.data();
            userProfilePhoto.src = userData.profilePhotoUrl || 'https://placehold.co/100x100/e0e0e0/777?text=U';
            userDisplayName.textContent = userData.name || 'Valued Seller';
        } else {
            // This can happen if the user's profile wasn't created properly
            userDisplayName.textContent = 'Profile Not Found';
            console.error("User is authenticated, but their Firestore document is missing.");
        }
    } catch (error) {
        console.error("Error loading dashboard data:", error);
        userDisplayName.textContent = 'Error Loading Profile';
    } finally {
        // This will always run, ensuring the page never gets stuck on loading
        loader.style.display = 'none';
        content.style.display = 'block';
    }
}

// --- INITIALIZATION ---
// Wait for the auth state to be confirmed by Firebase before doing anything.
// This is the most reliable way to handle page loads for authenticated users.
const unsubscribe = onAuthStateChanged(auth, async (user) => {
    if (user) {
        // We have a logged-in user, now check if they are verified.
        // We reload to get the freshest verification status.
        await user.reload();
        if (user.emailVerified) {
            // User is logged in and verified, so we can load the dashboard data.
            unsubscribe(); // Stop listening for auth changes on this page.
            loadDashboardData(user);
        } else {
            // This case should be handled by shared.js redirecting to /verify-email/
            // As a fallback, we'll show a message.
            if(loader) loader.innerHTML = '<p>Please check your email to verify your account.</p>';
        }
    } else {
        // This case should be handled by shared.js redirecting to /login/
        // As a fallback, we'll show a message.
        if(loader) loader.innerHTML = '<p>Please log in to view your dashboard.</p>';
    }
});

// --- EVENT LISTENERS ---
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        signOut(auth); // shared.js will handle the redirect after sign out
    });
}