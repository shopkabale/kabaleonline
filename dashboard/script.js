import { auth, db } from '../js/auth.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const userProfilePhoto = document.getElementById('user-profile-photo');
const userDisplayName = document.getElementById('user-display-name');
const logoutBtn = document.getElementById('logout-btn');
const loader = document.getElementById('dashboard-loader');
const content = document.getElementById('dashboard-content');

const newUserNotification = document.getElementById('new-user-notification');
const notificationOkBtn = document.getElementById('notification-ok-btn');

async function loadDashboardData(user) {
    try {
        const userDocRef = doc(db, 'users', user.uid);
        let userDoc = await getDoc(userDocRef);

        let isNewUser = false;

        if (!userDoc.exists()) {
            console.warn("User document missing. Creating a new one...");
            const newUserProfile = {
                email: user.email,
                name: user.displayName || 'New User',
                role: 'seller',
                createdAt: serverTimestamp(),
                referralCode: user.uid.substring(0, 6).toUpperCase(),
                referralCount: 0,
                badges: []
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

        // Show modal notification if new user or default name
        if (isNewUser && newUserNotification) {
            newUserNotification.style.display = 'flex';
            if (content) content.style.pointerEvents = 'none';
            if (loader) loader.style.pointerEvents = 'none';
        }

    } catch (error) {
        console.error("Error loading dashboard data:", error);
        userDisplayName.textContent = 'Error Loading Profile';
    } finally {
        if (loader) loader.style.display = 'none';
        if (content) content.style.display = 'block';
    }
}

// Close modal and re-enable dashboard
if (notificationOkBtn) {
    notificationOkBtn.addEventListener('click', () => {
        if (newUserNotification) newUserNotification.style.display = 'none';
        if (content) content.style.pointerEvents = 'auto';
        if (loader) loader.style.pointerEvents = 'auto';
    });
}

// Monitor auth state
onAuthStateChanged(auth, async (user) => {
    if (user) {
        await user.reload();
        if (user.emailVerified) {
            loadDashboardData(user);
        }
    }
});

// Logout
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        signOut(auth);
    });
}