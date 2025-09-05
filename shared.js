import { auth } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";

// This is the new function for dynamic headers
const setupDynamicHeader = () => {
    const headerActionButton = document.getElementById('header-action-btn');
    if (!headerActionButton) return; // Do nothing if the button isn't on the page

    onAuthStateChanged(auth, (user) => {
        if (user) {
            // User is signed in
            headerActionButton.textContent = 'Your Dashboard';
            headerActionButton.href = '/sell/';
        } else {
            // User is signed out
            headerActionButton.textContent = 'Login / Sell';
            headerActionButton.href = '/sell/';
        }
    });
};

// Run the function when the page loads
document.addEventListener('DOMContentLoaded', setupDynamicHeader);
