import { auth, db } from '/js/auth.js';
import { signOut } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// Note: Page protection is handled in shared.js

const userProfilePhoto = document.getElementById('user-profile-photo');
const userDisplayName = document.getElementById('user-display-name');
const logoutBtn = document.getElementById('logout-btn');
const loader = document.getElementById('dashboard-loader');
const content = document.getElementById('dashboard-content');

auth.onAuthStateChanged(async (user) => {
    if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            const userData = userDoc.data();
            userProfilePhoto.src = userData.profilePhotoUrl || 'https://placehold.co/100x100/e0e0e0/777?text=U';
            userDisplayName.textContent = userData.name || 'Valued Seller';
        }
        loader.style.display = 'none';
        content.style.display = 'block';
    }
});

logoutBtn.addEventListener('click', () => {
    signOut(auth); // shared.js will handle the redirect
});