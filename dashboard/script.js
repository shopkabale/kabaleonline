import { auth, db } from '../js/auth.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- DOM ELEMENTS ---
const userProfilePhoto = document.getElementById('user-profile-photo');
const userDisplayName = document.getElementById('user-display-name');
const logoutBtn = document.getElementById('logout-btn');
const loader = document.getElementById('dashboard-loader');
// Note: We get 'content' inside the function as it might not exist in your new HTML
// const content = document.getElementById('dashboard-content'); 

/**
 * Fetches the user's profile data from Firestore, creating it if it's missing.
 * @param {object} user The authenticated user object from Firebase.
 */
async function loadDashboardData(user) {
    const content = document.querySelector('.page-content'); // More generic selector
    try {
        const userDocRef = doc(db, 'users', user.uid);
        let userDoc = await getDoc(userDocRef);

        // --- THIS IS THE SELF-HEALING FIX ---
        if (!userDoc.exists()) {
            // The profile document is missing! Let's create a basic one.
            console.warn("User document missing for a verified user. Creating a new one...");
            const newUserProfile = {
                email: user.email,
                name: user.displayName || 'New User', // Get name from Google Auth if available
                role: 'seller',
                isVerified: false, // This is a flag for your own system, not Firebase Auth
                createdAt: serverTimestamp(),
                referralCode: user.uid.substring(0, 6).toUpperCase(),
                referralCount: 0,
                referralBalanceUGX: 0,
                badges: []
            };
            await setDoc(userDocRef, newUserProfile);
            // Now, fetch the document again to get the fresh data
            userDoc = await getDoc(userDocRef);
        }
        // --- END OF FIX ---

        const userData = userDoc.data();
        userProfilePhoto.src = userData.profilePhotoUrl || 'https://placehold.co/100x100/e0e0e0/777?text=U';
        userDisplayName.textContent = userData.name || 'Valued Seller'; // Will now show 'New User' or their Google name

    } catch (error) {
        console.error("Error loading dashboard data:", error);
        userDisplayName.textContent = 'Error Loading Profile';
    } finally {
        if (loader) loader.style.display = 'none';
        // Make sure all dashboard content is visible
        if (content) {
            Array.from(content.children).forEach(child => {
                if(child.id !== 'dashboard-loader') {
                    child.style.display = 'block';
                }
            });
        }
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
            if(loader) loader.innerHTML = '<p>Please verify your email to continue.</p>';
        }
    } else {
        if(loader) loader.innerHTML = '<p>Redirecting to login...</p>';
    }
});

// --- EVENT LISTENERS ---
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        signOut(auth);
    });
}