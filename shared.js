import { auth } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";

const setupDynamicHeader = () => {
    // Select all the new buttons
    const loginBtn = document.getElementById('login-btn');
    const postBtn = document.getElementById('post-btn');
    const dashboardBtn = document.getElementById('dashboard-btn');

    // --- Login/Logout Button Logic ---
    if (loginBtn && postBtn && dashboardBtn) {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                // User is signed in
                loginBtn.style.display = 'none';
                postBtn.style.display = 'none';
                dashboardBtn.style.display = 'flex';
            } else {
                // User is signed out
                loginBtn.style.display = 'flex';
                postBtn.style.display = 'flex';
                dashboardBtn.style.display = 'none';
            }
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
        document.getElementById('tips-btn')?.classList.add('active');
    }
};

document.addEventListener('DOMContentLoaded', setupDynamicHeader);
