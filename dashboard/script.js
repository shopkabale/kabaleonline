import { auth, db } from '../js/auth.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- DOM ELEMENTS ---
const userProfilePhoto = document.getElementById('user-profile-photo');
const userDisplayName = document.getElementById('user-display-name');
const logoutBtn = document.getElementById('logout-btn');
const loader = document.getElementById('dashboard-loader');
const content = document.getElementById('dashboard-content');

/**
 * Fetches the user's profile data from Firestore, creating it if it's missing.
 * @param {object} user The authenticated user object from Firebase.
 */
async function loadDashboardData(user) {
    try {
        const userDocRef = doc(db, 'users', user.uid);
        let userDoc = await getDoc(userDocRef);

        // Self-healing logic to create a profile if it's missing
        if (!userDoc.exists()) {
            console.warn("User document missing for a verified user. Creating a new one...");
            const newUserProfile = {
                email: user.email,
                name: user.displayName || 'New User',
                role: 'seller',
                createdAt: serverTimestamp(),
                referralCode: user.uid.substring(0, 6).toUpperCase(),
                referralCount: 0,
                badges: []
                // Add any other default fields your system requires
            };
            await setDoc(userDocRef, newUserProfile);
            userDoc = await getDoc(userDocRef); // Re-fetch the new document
        }

        const userData = userDoc.data();
        userProfilePhoto.src = userData.profilePhotoUrl || 'https://placehold.co/100x100/e0e0e0/777?text=U';
        userDisplayName.textContent = userData.name || 'Valued Seller';

    } catch (error) {
        console.error("Error loading dashboard data:", error);
        userDisplayName.textContent = 'Error Loading Profile';
    } finally {
        // This simple logic will not break your layout.
        if (loader) loader.style.display = 'none';
        if (content) content.style.display = 'block';
    }
}

// --- INITIALIZATION ---
onAuthStateChanged(auth, async (user) => {
    // The main page protection (redirects) is handled by shared.js.
    if (user) {
        await user.reload();
        if (user.emailVerified) {
            loadDashboardData(user);
        } else {
            // This is handled by shared.js, which redirects to /verify-email/
        }
    } else {
        // This is handled by shared.js, which redirects to /login/
    }
});

// --- EVENT LISTENERS ---
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        signOut(auth);
    });
}