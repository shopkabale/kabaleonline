import { auth, db } from '/js/auth.js';
import { sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { showMessage, toggleLoading } from '/js/shared.js';

const profileForm = document.getElementById('complete-profile-form');
const updateBtn = document.getElementById('update-profile-btn');
const resetPasswordBtn = document.getElementById('reset-password-btn');
const messageEl = document.getElementById('profile-update-message');
const loader = document.getElementById('profile-loader');
const content = document.getElementById('profile-content');
const photoPreview = document.getElementById('profile-photo-preview');

let currentUser = null;

async function uploadImageToCloudinary(file) {
    // ... Paste the uploadImageToCloudinary function from upload/script.js here ...
}

async function loadProfileData(user) {
    const userDocRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(userDocRef);

    if (docSnap.exists()) {
        const data = docSnap.data();
        document.getElementById('profile-name').value = data.name || '';
        document.getElementById('profile-email').value = data.email || '';
        document.getElementById('profile-whatsapp').value = data.whatsapp || '';
        document.getElementById('profile-location').value = data.location || '';
        document.getElementById('profile-bio').value = data.bio || '';
        photoPreview.src = data.profilePhotoUrl || 'https://placehold.co/100x100/e0e0e0/777?text=U';
    }
    loader.style.display = 'none';
    content.style.display = 'block';
}

profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    toggleLoading(updateBtn, true, 'Saving...');
    try {
        const name = document.getElementById('profile-name').value;
        const location = document.getElementById('profile-location').value;
        const bio = document.getElementById('profile-bio').value;
        const photoFile = document.getElementById('profile-photo').files[0];
        
        const dataToUpdate = { name, location, bio };
        if (photoFile) {
            const photoUrl = await uploadImageToCloudinary(photoFile);
            dataToUpdate.profilePhotoUrl = photoUrl;
            photoPreview.src = photoUrl;
        }

        await updateDoc(doc(db, 'users', currentUser.uid), dataToUpdate);
        showMessage(messageEl, 'Profile updated successfully!', false);
    } catch (error) {
        showMessage(messageEl, 'Failed to update profile.', true);
    } finally {
        toggleLoading(updateBtn, false, 'Save and Update Profile');
    }
});

resetPasswordBtn.addEventListener('click', async () => {
    if (!currentUser) return;
    try {
        await sendPasswordResetEmail(auth, currentUser.email);
        showMessage(messageEl, 'Password reset email sent. Please check your inbox.', false);
    } catch (error) {
        showMessage(messageEl, 'Could not send reset email.', true);
    }
});

auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        loadProfileData(user);
    }
});