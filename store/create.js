// =================================================================== //
//                                                                     //
//             KABALE ONLINE - FULLY CUSTOMIZABLE STORE                //
//      STORE EDITOR SCRIPT (create.js) - *FINAL VERSION* //
//                                                                     //
// =================================================================== //

// Imports from your *existing* firebase.js file
import { auth, db } from '../firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { doc, setDoc, getDoc, deleteDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

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
    
    // --- Scroll Navigation Logic ---
    const navButtons = container.querySelectorAll('.nav-button');
    const formSections = container.querySelectorAll('.form-section');
    navButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = button.getAttribute('href'); 
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
    const observerOptions = {
        root: null, rootMargin: '-50% 0px -50% 0px', threshold: 0
    };
    const observerCallback = (entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const activeSectionId = entry.target.id;
                navButtons.forEach(btn => {
                    btn.classList.toggle('active', btn.getAttribute('href') === `#${activeSectionId}`);
                });
            }
        });
    };
    const observer = new IntersectionObserver(observerCallback, observerOptions);
    formSections.forEach(section => observer.observe(section));

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

        storeForm.dataset.existingProfileUrl = store.profileImageUrl || '';
        storeForm.dataset.existingBannerUrl = design.bannerUrl || '';
        storeForm.storeUsername.value = store.username || '';
        storeForm.storeName.value = store.storeName || '';
        storeForm.storeDescription.value = store.description || '';
        if (store.profileImageUrl) {
            profileImagePreview.src = store.profileImageUrl;
            profileImagePreview.style.display = 'block';
        }
        if (design.bannerUrl) {
            bannerImagePreview.src = design.bannerUrl;
            bannerImagePreview.style.display = 'block';
        }
        storeForm.storeThemeColor.value = design.themeColor || '#007aff';
        storeForm.productLayout.value = design.productLayout || 'default';
        storeForm.linkWhatsapp.value = links.whatsapp || '';
        storeForm.linkFacebook.value = links.facebook || '';
        storeForm.linkTiktok.value = links.tiktok || '';
        storeForm.linkGithub.value = links.github || '';
        storeForm.footerText.value = footer.text || '';
        storeForm.footerColor.value = footer.color || '#0A0A1F';
    }
}

// +++++ THIS IS YOUR UPLOAD FUNCTION FROM YOUR PRODUCT FORM +++++
/**
 * Uploads an image to Cloudinary using your Netlify signature function.
 * @param {File} file The file to upload.
 * @returns {Promise<string>} The secure Cloudinary URL.
 */
async function uploadImageToCloudinary(file) {
    try {
        // 1. Get the secure signature from your Netlify function
        const response = await fetch('/.netlify/functions/generate-signature');
        if (!response.ok) throw new Error('Could not get upload signature. Please try again.');
        const { signature, timestamp, cloudname, apikey } = await response.json();

        // 2. Prepare the form data for Cloudinary
        const formData = new FormData();
        formData.append('file', file);
        formData.append('api_key', apikey);
        formData.append('timestamp', timestamp);
        formData.append('signature', signature);

        // 3. Upload the file
        const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudname}/image/upload`;
        const uploadResponse = await fetch(uploadUrl, { method: 'POST', body: formData });

        if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json();
            throw new Error(`Cloudinary upload failed: ${errorData.error.message}`);
        }

        const uploadData = await uploadResponse.json();
        return uploadData.secure_url;
    } catch (error) {
        console.error("Cloudinary upload error:", error);
        throw error; // Re-throw the error to be caught by handleFormSubmit
    }
}
// +++++ END OF YOUR UPLOAD FUNCTION +++++


// ================================================================== //
//                                                                    //
//    THIS IS THE FINAL, CORRECTED `handleFormSubmit` FUNCTION        //
//                                                                    //
// ================================================================== //

async function handleFormSubmit(e) {
    e.preventDefault();
    if (!currentUser) return;

    const saveButton = document.getElementById('saveButton');
    const storeForm = document.getElementById('storeForm');
    
    saveButton.disabled = true;
    saveButton.textContent = 'Saving...';
    showMessage('info', 'Validating store data...');

    const username = storeForm.storeUsername.value.trim().toLowerCase();
    
    // --- Validate Username Format ---
    if (!/^[a-z0-9-]+$/.test(username)) {
        showMessage('error', 'Username can only contain lowercase letters, numbers, and hyphens (-).');
        saveButton.disabled = false;
        saveButton.textContent = 'Save Changes';
        return;
    }
    
    // --- Get existing username (if any) ---
    const userDocRef = doc(db, 'users', currentUser.uid);
    const userDoc = await getDoc(userDocRef);
    const existingUsername = userDoc.exists() ? userDoc.data().store?.username : null;

    // +++++ USERNAME CHECK LOGIC +++++
    let usernameChanged = (username !== existingUsername);
    
    if (usernameChanged) {
        // Check for availability in the new public collection
        showMessage('info', 'Checking username availability...');
        const newUsernameRef = doc(db, 'storeUsernames', username);
        const newUsernameDoc = await getDoc(newUsernameRef);
        
        if (newUsernameDoc.exists()) {
            showMessage('error', 'This store username is already taken. Please choose another.');
            saveButton.disabled = false;
            saveButton.textContent = 'Save Changes';
            return;
        }
    }
    // +++++ END USERNAME CHECK LOGIC +++++

    try {
        let profileImageUrl = storeForm.dataset.existingProfileUrl;
        let bannerUrl = storeForm.dataset.existingBannerUrl;
        
        const profileImageFile = storeForm.storeProfileImageFile.files[0];
        const bannerImageFile = storeForm.storeBannerFile.files[0];

        // --- Upload Profile Pic (if new one is selected) ---
        if (profileImageFile) {
            showMessage('info', 'Uploading profile picture...');
            saveButton.textContent = 'Uploading Profile...';
            profileImageUrl = await uploadImageToCloudinary(profileImageFile);
            showMessage('info', 'Profile picture uploaded!');
        }

        // --- Upload Banner (if new one is selected) ---
        if (bannerImageFile) {
            showMessage('info', 'Uploading store banner...');
            saveButton.textContent = 'Uploading Banner...';
            bannerUrl = await uploadImageToCloudinary(bannerImageFile);
            showMessage('info', 'Store banner uploaded!');
        }

        // --- Prepare Data into a structured object ---
        showMessage('info', 'Saving settings to database...');
        saveButton.textContent = 'Saving...';
        
        const storeData = {
            username: username,
            storeName: storeForm.storeName.value.trim(),
            description: storeForm.storeDescription.value.trim(),
            profileImageUrl: profileImageUrl,
            links: {
                whatsapp: storeForm.linkWhatsapp.value.trim(),
                facebook: storeForm.linkFacebook.value.trim(),
                tiktok: storeForm.linkTiktok.value.trim(),
                github: storeForm.linkGithub.value.trim()
            },
            design: {
                bannerUrl: bannerUrl,
                themeColor: storeForm.storeThemeColor.value,
                productLayout: storeForm.productLayout.value
            },
            footer: {
                text: storeForm.footerText.value.trim(),
                color: storeForm.footerColor.value
            },
            updatedAt: new Date()
        };

        // --- Save to Firestore ---
        // 1. Save the main data to the user's private document
        await setDoc(userDocRef, {
            store: storeData,
            isSeller: true
        }, { merge: true });

        // +++++ NEW: UPDATE PUBLIC USERNAME COLLECTION (FIXED) +++++
        
        // 1. Always create or update the *current* username document.
        // This is "idempotent" - it's safe to run even if the doc already exists.
        // This will fix the migration issue for existing users like "test-store".
        const newUsernameRef = doc(db, 'storeUsernames', username);
        await setDoc(newUsernameRef, { userId: currentUser.uid });

        // 2. If the username *changed* and there was an old one, delete the old one.
        if (usernameChanged && existingUsername) {
            const oldUsernameRef = doc(db, 'storeUsernames', existingUsername);
            await deleteDoc(oldUsernameRef).catch(err => {
                console.warn("Could not delete old username doc:", err);
            });
        }
        // +++++ END OF NEW LOGIC +++++

        showMessage('success', 'Store updated successfully! Your public store link is now active.');
    
    } catch (error) {
        console.error("Error saving store:", error);
        let politeError = `Could not save store: ${error.message}`;
        if (error.message.includes('Cloudinary')) {
            politeError = 'Polite Error: We had trouble uploading your image.';
        } else if (error.message.includes('permission')) {
             politeError = 'Polite Error: Could not save username. Please try again.';
        }
        showMessage('error', politeError);
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

    // Add icons like your product form's showMessage
    if (type === 'error') {
        messageBox.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${text}`;
    } else if (type === 'success') {
        messageBox.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${text}`;
    } else if (type === 'info') {
        messageBox.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${text}`;
    }
}