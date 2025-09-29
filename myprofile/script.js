import { auth, db } from '../js/auth.js';
import { sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { showMessage, toggleLoading } from '../js/shared.js';

// --- DOM ELEMENTS ---
const loader = document.getElementById('profile-loader');
const content = document.getElementById('profile-content');
const messageEl = document.getElementById('profile-update-message');
const resetPasswordBtn = document.getElementById('reset-password-btn');

// Display View Elements
const profileDisplayView = document.getElementById('profile-display-view');
const displayPhoto = document.getElementById('display-photo');
const displayName = document.getElementById('display-name');
const displayEmail = document.getElementById('display-email');
const displayWhatsapp = document.getElementById('display-whatsapp');
const displayLocation = document.getElementById('display-location');
const displayBio = document.getElementById('display-bio');
const editProfileBtn = document.getElementById('edit-profile-btn');

// Edit Form Elements
const profileForm = document.getElementById('profile-form');
const updateBtn = document.getElementById('update-profile-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const inputName = document.getElementById('profile-name');
const inputLocation = document.getElementById('profile-location');
const inputBio = document.getElementById('profile-bio');
const inputPhoto = document.getElementById('profile-photo');

let currentUser = null;

// --- AUTHENTICATION & DATA LOADING ---
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        loadProfileData(user);
    }
});

async function loadProfileData(user) {
    const userDocRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(userDocRef);

    if (docSnap.exists()) {
        const data = docSnap.data();
        // Populate the display view
        displayPhoto.src = data.profilePhotoUrl || 'https://placehold.co/120x120/e0e0e0/777?text=U';
        displayName.textContent = data.name || 'N/A';
        displayEmail.textContent = data.email || 'N/A';
        displayWhatsapp.textContent = data.whatsapp || 'N/A';
        displayLocation.textContent = data.location || 'N/A';
        displayBio.textContent = data.bio || 'No bio provided.';
        
        // Populate the hidden edit form
        inputName.value = data.name || '';
        inputLocation.value = data.location || '';
        inputBio.value = data.bio || '';
    }
    loader.classList.add('hidden');
    content.classList.remove('hidden');
}

// --- EVENT LISTENERS ---

// Switch to "Edit Mode"
editProfileBtn.addEventListener('click', () => {
    profileDisplayView.classList.add('hidden');
    profileForm.classList.remove('hidden');
});

// Cancel editing and switch back to "Display Mode"
cancelEditBtn.addEventListener('click', () => {
    profileForm.classList.add('hidden');
    profileDisplayView.classList.remove('hidden');
    // Optional: Reset form fields if user made changes then canceled
    loadProfileData(currentUser); 
});

// Handle form submission to update profile
profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    toggleLoading(updateBtn, true, 'Saving...');
    try {
        const dataToUpdate = { 
            name: inputName.value, 
            location: inputLocation.value, 
            bio: inputBio.value 
        };
        
        const photoFile = inputPhoto.files[0];
        if (photoFile) {
            const photoUrl = await uploadImageToCloudinary(photoFile);
            dataToUpdate.profilePhotoUrl = photoUrl;
        }

        await updateDoc(doc(db, 'users', currentUser.uid), dataToUpdate);
        await loadProfileData(currentUser); // Reload all data to reflect changes
        
        // Switch back to display mode and show success
        profileForm.classList.add('hidden');
        profileDisplayView.classList.remove('hidden');
        showMessage(messageEl, 'Profile updated successfully!', false);

    } catch (error) {
        console.error("Error updating profile: ", error);
        showMessage(messageEl, 'Failed to update profile. Please try again.', true);
    } finally {
        toggleLoading(updateBtn, false, 'Save Changes');
    }
});

// Handle password reset request
resetPasswordBtn.addEventListener('click', async () => {
    if (!currentUser) return;
    try {
        await sendPasswordResetEmail(auth, currentUser.email);
        showMessage(messageEl, 'Password reset email sent. Please check your inbox.', false);
    } catch (error) {
        showMessage(messageEl, 'Could not send reset email. Please try again.', true);
    }
});


// --- UTILITY FUNCTIONS ---
async function uploadImageToCloudinary(file) {
    try {
        const response = await fetch('/.netlify/functions/generate-signature');
        if (!response.ok) throw new Error('Failed to get signature.');
        const { signature, timestamp, cloudname, apikey } = await response.json();
        const formData = new FormData();
        formData.append('file', file);
        formData.append('api_key', apikey);
        formData.append('timestamp', timestamp);
        formData.append('signature', signature);
        const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudname}/image/upload`;
        const uploadResponse = await fetch(uploadUrl, { method: 'POST', body: formData });
        if (!uploadResponse.ok) throw new Error('Cloudinary upload failed.');
        const uploadData = await uploadResponse.json();
        return uploadData.secure_url;
    } catch (error) {
        console.error("Error in Cloudinary upload process: ", error);
        throw error;
    }
}