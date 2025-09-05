import { auth } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";

const setupDynamicHeader = () => {
    const headerActionButton = document.getElementById('header-action-btn');

    // --- Login/Logout Button Logic ---
    if (headerActionButton) {
        onAuthStateChanged(auth, (user) => {
            headerActionButton.textContent = user ? 'Your Dashboard' : 'Post Something';
            headerActionButton.href = '/sell/';
        });
    }

    // --- Active Page Button Logic ---
    const urlParams = new URLSearchParams(window.location.search);
    const listingType = urlParams.get('type');
    const path = window.location.pathname;

    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => link.classList.remove('active'));

    if (path === '/' || path === '/index.html') {
        if (listingType === 'service') {
            document.getElementById('services-btn')?.classList.add('active');
        } else {
            document.getElementById('items-btn')?.classList.add('active');
        }
    } else if (path.startsWith('/requests')) {
        document.getElementById('request-btn')?.classList.add('active');
    } else if (path.startsWith('/blog')) {
        document.getElementById('stories-btn')?.classList.add('active'); // MODIFIED ID
    }
};

document.addEventListener('DOMContentLoaded', setupDynamicHeader);
