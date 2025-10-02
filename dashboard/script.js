// script.js
import { auth, db } from '../js/auth.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, onSnapshot } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// DOM elements
const newUserNotification = document.getElementById('new-user-notification');
const notificationOkBtn = document.getElementById('notification-ok-btn');
const content = document.getElementById('dashboard-content');
const loader = document.getElementById('dashboard-loader');
const userProfilePhoto = document.getElementById('user-profile-photo');
const userDisplayName = document.getElementById('user-display-name');
const logoutBtn = document.getElementById('logout-btn');

let userDocRef = null;

// Monitor auth state
onAuthStateChanged(auth, async (user) => {
    if (user) {
        userDocRef = doc(db, 'users', user.uid);
        await initializeDashboard(user);
    } else {
        window.location.href = "/login/";
    }
});

// Initialize dashboard
async function initializeDashboard(user) {
    try {
        // Check if user document exists
        let userDoc = await getDoc(userDocRef);
        let isNewUser = false;

        if (!userDoc.exists()) {
            // Create new user document
            const newUserProfile = {
                email: user.email,
                fullName: 'New User',
                role: 'seller',
                createdAt: serverTimestamp(),
                referralCode: user.uid.substring(0, 6).toUpperCase(),
                referralCount: 0,
                badges: [],
                hasSeenWelcomeModal: false,
                photoURL: null
            };
            await setDoc(userDocRef, newUserProfile);
            isNewUser = true;
        } else {
            const userDataCheck = userDoc.data();
            if (!userDataCheck.fullName || userDataCheck.fullName === 'New User') {
                isNewUser = true;
            }
        }

        // Listen to changes in user document in real-time
        onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                userProfilePhoto.src = data.photoURL || 'https://placehold.co/100x100/e0e0e0/777?text=U';
                userDisplayName.textContent = data.fullName || 'Valued Seller';

                // Show welcome modal if needed
                if (isNewUser && !data.hasSeenWelcomeModal) {
                    newUserNotification.style.display = 'flex';
                    content.style.pointerEvents = 'none';
                }
            }
        });

        // Hide loader and show dashboard content
        loader.style.display = 'none';
        content.style.display = 'block';

        // Handle Okay button click
        notificationOkBtn.addEventListener('click', async () => {
            newUserNotification.style.display = 'none';
            content.style.pointerEvents = 'auto';
            try {
                await updateDoc(userDocRef, { hasSeenWelcomeModal: true });
            } catch (err) {
                console.error("Failed to update modal status:", err);
            }
        });

    } catch (error) {
        console.error("Error initializing dashboard:", error);
        loader.innerHTML = "<p style='text-align:center;color:red;'>Failed to load dashboard. Please refresh.</p>";
    }
}

// Handle logout
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        auth.signOut();
    });
}