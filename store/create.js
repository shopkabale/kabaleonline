// Imports from your existing firebase.js
import { auth, db } from '../firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { doc, setDoc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- DOM Elements ---
const container = document.getElementById('store-create-container');
const loadingSpinner = document.getElementById('loading-spinner');
const loginTemplate = document.getElementById('login-placeholder');
const formTemplate = document.getElementById('form-template');

let currentUser = null;

// --- Auth Check ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        loadPage(user);
    } else {
        currentUser = null;
        const loginNode = loginTemplate.content.cloneNode(true);
        container.innerHTML = '';
        container.appendChild(loginNode);
    }
});

// --- Load the Form and User Data ---
async function loadPage(user) {
    const formNode = formTemplate.content.cloneNode(true);
    container.innerHTML = '';
    container.appendChild(formNode);

    const storeForm = document.getElementById('storeForm');
    const saveButton = document.getElementById('saveButton');
    const messageBox = document.getElementById('messageBox');
    const userIdDisplay = document.getElementById('userIdDisplay');

    userIdDisplay.textContent = `Seller ID: ${user.uid}`;

    // Add form submit listener
    storeForm.addEventListener('submit', handleFormSubmit);

    // Load existing store data
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists() && userDoc.data().store) {
        const storeData = userDoc.data().store;
        storeForm.storeUsername.value = storeData.username || '';
        storeForm.storeName.value = storeData.storeName || '';
        storeForm.storeDescription.value = storeData.description || '';
        storeForm.storeWhatsapp.value = storeData.whatsapp || '';
    }
}

// --- Handle Form Submit ---
async function handleFormSubmit(e) {
    e.preventDefault();
    if (!currentUser) return;

    const saveButton = document.getElementById('saveButton');
    const messageBox = document.getElementById('messageBox');
    const storeForm = document.getElementById('storeForm');

    saveButton.disabled = true;
    saveButton.textContent = 'Saving...';
    showMessage('info', 'Saving your store...');

    const username = storeForm.storeUsername.value.trim().toLowerCase();

    // --- Validate Username ---
    if (!/^[a-z0-9-]+$/.test(username)) {
        showMessage('error', 'Username can only contain lowercase letters, numbers, and hyphens (-).');
        saveButton.disabled = false;
        saveButton.textContent = 'Save Changes';
        return;
    }

    // --- Check if Username is Unique (if changed) ---
    const userDocRef = doc(db, 'users', currentUser.uid);
    const userDoc = await getDoc(userDocRef);
    const existingUsername = userDoc.exists() ? userDoc.data().store?.username : null;

    if (username !== existingUsername) {
        const q = query(collection(db, 'users'), where('store.username', '==', username));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            showMessage('error', 'This store username is already taken. Please choose another.');
            saveButton.disabled = false;
            saveButton.textContent = 'Save Changes';
            return;
        }
    }

    // --- Prepare Store Data ---
    const storeData = {
        username: username,
        storeName: storeForm.storeName.value.trim(),
        description: storeForm.storeDescription.value.trim(),
        whatsapp: storeForm.storeWhatsapp.value.trim(),
        updatedAt: new Date()
    };

    try {
        await setDoc(userDocRef, {
            store: storeData,
            isSeller: true
        }, { merge: true });

        // --- Subdomain URL ---
        const subdomainUrl = `https://${username}.kabaleonline.com`;

        // --- Display success message with link and copy button ---
        messageBox.innerHTML = `
            <p class="success">Store saved successfully! Your public store link is:</p>
            <div class="subdomain-link">
                <a href="${subdomainUrl}" target="_blank">${subdomainUrl}</a>
                <button id="copyLinkBtn">Copy Link</button>
            </div>
        `;

        const copyBtn = document.getElementById('copyLinkBtn');
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(subdomainUrl).then(() => {
                showMessage('success', 'Subdomain link copied to clipboard!');
            }).catch(() => {
                showMessage('error', 'Failed to copy. Please copy manually.');
            });
        });

        saveButton.disabled = false;
        saveButton.textContent = 'Save Changes';

    } catch (error) {
        console.error("Error saving store:", error);
        showMessage('error', 'Could not save store. Please try again.');
        saveButton.disabled = false;
        saveButton.textContent = 'Save Changes';
    }
}

// --- Helper: Show messages ---
function showMessage(type, text) {
    const messageBox = document.getElementById('messageBox');
    if (!messageBox) return;

    messageBox.style.display = 'block';
    messageBox.className = `message ${type}`;
    messageBox.textContent = text;
}