// Imports from your *existing* firebase.js file
import { auth, db, app } from '../firebase.js'; // 'app' is needed for storage
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { doc, setDoc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
// NEW: Import Firebase Storage for file uploads
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-storage.js";

// --- Initialize Storage ---
const storage = getStorage(app);

// --- DOM Elements ---
const container = document.getElementById('store-create-container');
const loadingSpinner = document.getElementById('loading-spinner');
const loginTemplate = document.getElementById('login-placeholder');
const formTemplate = document.getElementById('form-template');

let currentUser = null;

// --- Auth Check (copied from your cart.js) ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        loadPage(user);
    } else {
        currentUser = null;
        const loginNode = loginTemplate.content.cloneNode(true);
        container.innerHTML = ''; // Clear spinner
        container.appendChild(loginNode);
    }
});

// --- Load the Form and User Data ---
async function loadPage(user) {
    const formNode = formTemplate.content.cloneNode(true);
    container.innerHTML = '';
    container.appendChild(formNode);

    // Now that the form is in the DOM, get its elements
    const storeForm = document.getElementById('storeForm');
    const profileImageInput = document.getElementById('storeProfileImageFile');
    const profileImagePreview = document.getElementById('profileImagePreview');
    const bannerImageInput = document.getElementById('storeBannerFile');
    const bannerImagePreview = document.getElementById('bannerImagePreview');
    
    // --- Tab Switching Logic ---
    const tabButtons = container.querySelectorAll('.tab-button');
    const tabContents = container.querySelectorAll('.tab-content');
    tabButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault(); // Stop form submission
            const tabName = button.dataset.tab;

            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            tabContents.forEach(content => {
                content.id === `tab-${tabName}` ? content.classList.add('active') : content.classList.remove('active');
            });
        });
    });

    // --- Image Preview Logic ---
    profileImageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                profileImagePreview.src = event.target.result;
                profileImagePreview.style.display = 'block';
            }
            reader.readAsDataURL(file);
        }
    });
    bannerImageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                bannerImagePreview.src = event.target.result;
                bannerImagePreview.style.display = 'block';
            }
            reader.readAsDataURL(file);
        }
    });


    // Add form submit listener
    storeForm.addEventListener('submit', handleFormSubmit);

    // --- Load existing data ---
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists() && userDoc.data().store) {
        const store = userDoc.data().store;
        const links = store.links || {};
        const design = store.design || {};
        const footer = store.footer || {};

        // Store existing URLs in dataset for comparison
        storeForm.dataset.existingProfileUrl = store.profileImageUrl || '';
        storeForm.dataset.existingBannerUrl = design.bannerUrl || '';

        // Tab 1: General
        storeForm.storeUsername.value = store.username || '';
        storeForm.storeName.value = store.storeName || '';
        storeForm.storeDescription.value = store.description || '';
        if (store.profileImageUrl) {
            profileImagePreview.src = store.profileImageUrl;
            profileImagePreview.style.display = 'block';
        }

        // Tab 2: Design
        if (design.bannerUrl) {
            bannerImagePreview.src = design.bannerUrl;
            bannerImagePreview.style.display = 'block';
        }
        storeForm.storeThemeColor.value = design.themeColor || '#007aff';
        storeForm.productLayout.value = design.productLayout || 'default';

        // Tab 3: Links
        storeForm.linkWhatsapp.value = links.whatsapp || '';
        storeForm.linkFacebook.value = links.facebook || '';
        storeForm.linkTiktok.value = links.tiktok || '';
        storeForm.linkGithub.value = links.github || '';
        
        // Tab 4: Footer
        storeForm.footerText.value = footer.text || '';
        storeForm.footerColor.value = footer.color || '#0A0A1F';
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
    showMessage('info', 'Validating store data...');

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

    try {
        // --- Handle File Uploads ---
        let profileImageUrl = storeForm.dataset.existingProfileUrl;
        let bannerUrl = storeForm.dataset.existingBannerUrl;
        
        const profileImageFile = storeForm.storeProfileImageFile.files[0];
        const bannerImageFile = storeForm.storeBannerFile.files[0];

        if (profileImageFile) {
            showMessage('info', 'Uploading profile picture...');
            const storageRef = ref(storage, `stores/${currentUser.uid}/profile.jpg`);
            await uploadBytes(storageRef, profileImageFile);
            profileImageUrl = await getDownloadURL(storageRef);
        }

        if (bannerImageFile) {
            showMessage('info', 'Uploading store banner...');
            const storageRef = ref(storage, `stores/${currentUser.uid}/banner.jpg`);
            await uploadBytes(storageRef, bannerImageFile);
            bannerUrl = await getDownloadURL(storageRef);
        }

        // --- Prepare Data into a structured object ---
        showMessage('info', 'Saving settings to database...');
        const storeData = {
            // General
            username: username,
            storeName: storeForm.storeName.value.trim(),
            description: storeForm.storeDescription.value.trim(),
            profileImageUrl: profileImageUrl, // The new or existing URL
            
            // Links
            links: {
                whatsapp: storeForm.linkWhatsapp.value.trim(),
                facebook: storeForm.linkFacebook.value.trim(),
                tiktok: storeForm.linkTiktok.value.trim(),
                github: storeForm.linkGithub.value.trim()
            },
            
            // Design
            design: {
                bannerUrl: bannerUrl, // The new or existing URL
                themeColor: storeForm.storeThemeColor.value,
                productLayout: storeForm.productLayout.value
            },

            // Footer
            footer: {
                text: storeForm.footerText.value.trim(),
                color: storeForm.footerColor.value
            },
            
            updatedAt: new Date()
        };

        // --- Save to Firestore ---
        await setDoc(userDocRef, {
            store: storeData,
            isSeller: true // Mark this user as a seller
        }, { merge: true });

        showMessage('success', 'Store updated successfully! Your public store link is now active.');
    } catch (error) {
        console.error("Error saving store:", error);
        showMessage('error', `Could not save store: ${error.message}`);
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = 'Save Changes';
    }
}

// --- Helper for showing messages ---
function showMessage(type, text) {
    const messageBox = document.getElementById('messageBox');
    if (!messageBox) return;
    
    messageBox.style.display = 'block';
    messageBox.className = `message ${type}`;
    messageBox.textContent = text;
}