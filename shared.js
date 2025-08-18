// shared.js
import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const headerActionBtn = document.getElementById('header-action-btn');

// This code runs on every page to check the user's login status and update the header button.
onAuthStateChanged(auth, async (user) => {
    // Make sure the button exists before trying to change it
    if (!headerActionBtn) return;

    if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists() && userDoc.data().role === 'admin') {
            headerActionBtn.textContent = 'Admin Panel';
            headerActionBtn.href = '/admin/';
        } else {
            headerActionBtn.textContent = 'My Dashboard';
            headerActionBtn.href = '/sell/';
        }
    } else {
        headerActionBtn.textContent = 'Sell an Item';
        headerActionBtn.href = '/sell/';
    }
});
