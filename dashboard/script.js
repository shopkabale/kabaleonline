import { auth, db } from '../js/auth.js';
import { signOut } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// Page protection to ensure only logged-in users can see this is handled in shared.js

// Get the HTML elements we need to control
const userProfilePhoto = document.getElementById('user-profile-photo');
const userDisplayName = document.getElementById('user-display-name');
const logoutBtn = document.getElementById('logout-btn');
const loader = document.getElementById('dashboard-loader');
const content = document.getElementById('dashboard-content');

// This function runs when the page loads and Firebase checks the user's login state
auth.onAuthStateChanged(async (user) => {
    // This 'if' block only runs if the user is successfully logged in
    if (user) {
        // Fetch user data from Firestore
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        // If the user's document exists, update the name and photo
        if (userDoc.exists()) {
            const userData = userDoc.data();
            userProfilePhoto.src = userData.profilePhotoUrl || 'https://placehold.co/100x100/e0e0e0/777?text=U';
            userDisplayName.textContent = userData.name || 'Valued Seller';
        }
        
        // --- THIS IS THE KEY PART ---
        // After all data is fetched and ready, we make the loader disappear.
        
        // 1. Hide the pulsing circle loader
        loader.style.display = 'none';

        // 2. Show the main dashboard content
        content.style.display = 'block';
    }
});

// Add functionality to the logout button
logoutBtn.addEventListener('click', () => {
    signOut(auth); // After signing out, shared.js will automatically redirect to the login page
});