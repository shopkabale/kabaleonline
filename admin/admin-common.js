// admin-common.js
import { auth, db } from '../firebase.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

/**
 * Checks if a user is logged in and is an admin.
 * If yes, it runs the onSuccess callback.
 * If no, it shows access denied and redirects.
 * @param {function} onSuccess - The function to run if auth is successful.
 */
export function checkAdminAuth(onSuccess) {
    onAuthStateChanged(auth, async (user) => {
        const loader = document.getElementById('loader');
        const adminContent = document.getElementById('admin-content');
        const accessDenied = document.getElementById('access-denied');

        if (user) {
            try {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists() && userDoc.data().role === 'admin') {
                    // User is an admin, run the success callback
                    onSuccess(userDoc.data()); 
                } else {
                    showAccessDenied();
                }
            } catch (error) {
                console.error("Error verifying admin role:", error);
                showAccessDenied();
            }
        } else {
            showAccessDenied(true); // Redirect to login
        }
    });
}

/**
 * Sets up the header with the admin's name and logout button.
 * @param {string} adminName - The name or email of the admin.
 */
export function setupHeader(adminName) {
    const adminNameEl = document.getElementById('admin-name');
    const logoutBtn = document.getElementById('logout-btn');

    if (adminNameEl) {
        adminNameEl.textContent = adminName || 'Admin';
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            signOut(auth).catch(error => console.error("Logout Error:", error));
        });
    }
}

/**
 * Displays the access denied message and optionally redirects.
 * @param {boolean} redirectToLogin - Whether to redirect to the login page.
 */
function showAccessDenied(redirectToLogin = false) {
    const loader = document.getElementById('loader');
    const adminContent = document.getElementById('admin-content');
    const accessDenied = document.getElementById('access-denied');

    if(adminContent) adminContent.style.display = 'none';
    if(loader) loader.style.display = 'none';
    if(accessDenied) accessDenied.style.display = 'block';
    
    if (redirectToLogin) {
        // Wait 2 seconds before redirecting so the user can see the message
        setTimeout(() => {
            window.location.href = '/login/'; 
        }, 2000);
    }
}