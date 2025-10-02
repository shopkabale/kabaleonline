import { auth, db } from '../js/auth.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// DOM elements
const newUserNotification = document.getElementById('new-user-notification');
const notificationOkBtn = document.getElementById('notification-ok-btn');
const content = document.getElementById('dashboard-content');
const loader = document.getElementById('dashboard-loader');
const userProfilePhoto = document.getElementById('user-profile-photo');
const userDisplayName = document.getElementById('user-display-name');
const logoutBtn = document.getElementById('logout-btn');

onAuthStateChanged(auth, async (user) => {
    if (user) {
        await loadDashboardData(user);
    } else {
        window.location.href = "/login/";
    }
});

// Load user dashboard data
async function loadDashboardData(user) {
    try {
        const userDocRef = doc(db, 'users', user.uid);
        let userDoc = await getDoc(userDocRef);
        let isNewUser = false;

        // Create a new user document if it doesn't exist
        if (!userDoc.exists()) {
            const newUserProfile = {
                email: user.email,
                name: 'New User',
                role: 'seller',
                createdAt: serverTimestamp(),
                referralCode: user.uid.substring(0, 6).toUpperCase(),
                referralCount: 0,
                badges: [],
                hasSeenWelcomeModal: false
            };
            await setDoc(userDocRef, newUserProfile);
            userDoc = await getDoc(userDocRef);
            isNewUser = true;
        } else {
            const userDataCheck = userDoc.data();
            if (!userDataCheck.name || userDataCheck.name === 'New User') {
                isNewUser = true;
            }
        }

        const userData = userDoc.data();
        userProfilePhoto.src = userData.profilePhotoUrl || 'https://placehold.co/100x100/e0e0e0/777?text=U';
        userDisplayName.textContent = userData.name || 'Valued Seller';

        // Show welcome modal if new user AND hasn't seen it yet
        if (isNewUser && !userData.hasSeenWelcomeModal) {
            newUserNotification.style.display = 'flex';
            content.style.pointerEvents = 'none'; // prevent clicks on dashboard while modal is open
        }

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
        console.error("Error loading dashboard data:", error);
        loader.innerHTML = "<p style='text-align:center;color:red;'>Failed to load dashboard. Please refresh.</p>";
    }
}

// Handle logout
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        auth.signOut();
    });
}