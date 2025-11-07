// =================================================================== //
//                                                                     //
//             KABALE ONLINE - STORE DASHBOARD SCRIPT                  //
//                                                                     //
// =================================================================== //

// Note the path: ../../firebase.js (it's two folders up)
import { auth, db } from '../../firebase.js'; 
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- DOM Elements ---
const loaderContainer = document.getElementById('dashboard-loader-container');
const contentContainer = document.getElementById('dashboard-content-container');
const loginTemplate = document.getElementById('login-placeholder');
const noStoreTemplate = document.getElementById('no-store-placeholder');

// --- Auth Check ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        loadDashboard(user);
    } else {
        // Not logged in
        const loginNode = loginTemplate.content.cloneNode(true);
        loaderContainer.innerHTML = '';
        loaderContainer.appendChild(loginNode);
    }
});

async function loadDashboard(user) {
    try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
            throw new Error("User document not found.");
        }

        const userData = userDoc.data();

        // Check if user is a seller and has a store
        if (!userData.isSeller || !userData.store) {
            // User is logged in, but not a seller
            const noStoreNode = noStoreTemplate.content.cloneNode(true);
            loaderContainer.innerHTML = '';
            loaderContainer.appendChild(noStoreNode);
            return;
        }

        // --- User is a seller, populate the dashboard ---
        const store = userData.store;
        
        document.getElementById('welcome-heading').textContent = `Welcome, ${userData.name || 'Seller'}!`;
        document.getElementById('info-store-name').textContent = store.storeName || 'Not Set';
        document.getElementById('info-store-username').textContent = `@${store.username}` || 'Not Set';
        
        const viewStoreLink = document.getElementById('view-store-link');
        if (store.username) {
            viewStoreLink.href = `/store/${store.username}`;
        }

        // Show the content
        loaderContainer.style.display = 'none';
        contentContainer.style.display = 'block';

    } catch (error) {
        console.error("Error loading dashboard:", error);
        loaderContainer.innerHTML = `<p>Error loading dashboard: ${error.message}</p>`;
    }
}