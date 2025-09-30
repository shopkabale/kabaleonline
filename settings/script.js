import { auth, db } from '../js/auth.js';
import { sendPasswordResetEmail, deleteUser } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { doc, getDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { showMessage } from '../js/shared.js';

// --- DOM ELEMENTS ---
const loader = document.getElementById('settings-loader');
const content = document.getElementById('settings-content');
const messageEl = document.getElementById('settings-message');

const newsletterToggle = document.getElementById('newsletter-toggle');
const messagesToggle = document.getElementById('messages-toggle');
const whatsappToggle = document.getElementById('whatsapp-toggle');

const changePasswordBtn = document.getElementById('change-password-btn');
const deactivateAccountBtn = document.getElementById('deactivate-account-btn');
const deleteAccountBtn = document.getElementById('delete-account-btn');

let currentUser = null;
let userDocRef = null;

auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        userDocRef = doc(db, 'users', user.uid);
        await loadUserSettings();
    }
});

async function loadUserSettings() {
    try {
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
            const settings = docSnap.data();
            // Set toggles based on saved preferences, with defaults
            newsletterToggle.checked = settings.notifications?.newsletter ?? true;
            messagesToggle.checked = settings.notifications?.messages ?? true;
            whatsappToggle.checked = settings.privacy?.showWhatsapp ?? true;
        }
    } catch (error) {
        console.error("Error loading settings:", error);
        showMessage(messageEl, 'Could not load your settings.', true);
    } finally {
        loader.style.display = 'none';
        content.style.display = 'block';
    }
}

async function updateUserSetting(key, value) {
    try {
        await updateDoc(userDocRef, { [key]: value });
        showMessage(messageEl, 'Setting saved!', false);
    } catch (error) {
        console.error(`Error updating setting ${key}:`, error);
        showMessage(messageEl, 'Could not save your setting.', true);
        // Revert UI on failure
        loadUserSettings();
    }
}

// --- EVENT LISTENERS ---
newsletterToggle.addEventListener('change', () => {
    updateUserSetting('notifications.newsletter', newsletterToggle.checked);
});

messagesToggle.addEventListener('change', () => {
    updateUserSetting('notifications.messages', messagesToggle.checked);
});

whatsappToggle.addEventListener('change', () => {
    updateUserSetting('privacy.showWhatsapp', whatsappToggle.checked);
});

changePasswordBtn.addEventListener('click', async () => {
    try {
        await sendPasswordResetEmail(auth, currentUser.email);
        showMessage(messageEl, 'Password reset email sent. Please check your inbox.', false);
    } catch (error) {
        showMessage(messageEl, 'Could not send reset email.', true);
    }
});

deactivateAccountBtn.addEventListener('click', async () => {
    if (confirm("Are you sure you want to deactivate your account? Your listings will be hidden, but your data will not be deleted.")) {
        await updateUserSetting('accountStatus', 'deactivated');
        alert("Your account has been deactivated.");
        auth.signOut(); // Log the user out
    }
});

deleteAccountBtn.addEventListener('click', async () => {
    const confirmation = prompt("This action cannot be undone. You will lose all your data, listings, and referral balance. To confirm, please type DELETE below:");
    if (confirmation === "DELETE") {
        try {
            // IMPORTANT: This is a basic deletion. A robust solution uses Cloud Functions.
            // Delete user document from Firestore
            await deleteDoc(userDocRef);
            // Delete user from Firebase Authentication
            await deleteUser(currentUser);
            alert("Your account has been permanently deleted.");
            window.location.href = "/"; // Redirect to homepage
        } catch (error) {
            console.error("Error deleting account:", error);
            alert("Could not delete account. You may need to sign in again for this operation. Error: " + error.message);
        }
    } else {
        alert("Deletion cancelled.");
    }
});