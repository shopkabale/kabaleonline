// script.js
import { auth, db } from '../js/auth.js';
import { 
    onAuthStateChanged, 
    sendPasswordResetEmail 
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { 
    doc, getDoc, setDoc 
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { showMessage, toggleLoading } from '../js/shared.js';

// --- DOM ELEMENTS ---
const loader = document.getElementById('profile-loader');
const content = document.getElementById('profile-content');
const editBtn = document.getElementById('edit-profile-btn');
const cancelBtn = document.getElementById('cancel-edit-btn');
const profileForm = document.getElementById('profile-form');
const updateBtn = document.getElementById('update-profile-btn');
const profileUpdateMsg = document.getElementById('profile-update-message');
const resetPasswordBtn = document.getElementById('reset-password-btn');

const displayPhoto = document.getElementById('display-photo');
const displayName = document.getElementById('display-name');
const displayEmail = document.getElementById('display-email');
const displayWhatsapp = document.getElementById('display-whatsapp');
const displayPhone = document.getElementById('display-phone');
const displayLocation = document.getElementById('display-location');
const displayBio = document.getElementById('display-bio');
const displayProfession = document.getElementById('display-profession');
const displayFacebook = document.getElementById('display-facebook');
const displayInstagram = document.getElementById('display-instagram');
const displayLinkedin = document.getElementById('display-linkedin');

const inputName = document.getElementById('profile-name');
const inputEmail = document.getElementById('profile-email');
const inputWhatsapp = document.getElementById('profile-whatsapp');
const inputPhone = document.getElementById('profile-phone');
const inputLocation = document.getElementById('profile-location');
const inputBio = document.getElementById('profile-bio');
const inputProfession = document.getElementById('profile-profession');
const inputFacebook = document.getElementById('profile-facebook');
const inputInstagram = document.getElementById('profile-instagram');
const inputLinkedin = document.getElementById('profile-linkedin');
const inputPhoto = document.getElementById('profile-photo');

let currentUser = null;
let uploadedPhotoURL = null;

// --- CLOUDINARY UPLOAD FUNCTION ---
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
        console.error("Cloudinary upload error:", error);
        throw error;
    }
}

// --- LOAD PROFILE ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        await loadProfile(user.uid);
    } else {
        window.location.href = '/login/';
    }
});

async function loadProfile(uid) {
    try {
        const docRef = doc(db, 'users', uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();

            // Display values
            displayName.textContent = data.fullName || '';
            displayEmail.textContent = currentUser.email || '';
            displayWhatsapp.textContent = data.whatsapp || '';
            displayPhone.textContent = data.phone || '';
            displayLocation.textContent = data.location || '';
            displayBio.textContent = data.bio || '';
            displayProfession.textContent = data.profession || '';
            displayFacebook.textContent = data.facebook || '';
            displayInstagram.textContent = data.instagram || '';
            displayLinkedin.textContent = data.linkedin || '';
            displayPhoto.src = data.photoURL || 'https://placehold.co/120x120/e0e0e0/777?text=U';

            uploadedPhotoURL = data.photoURL || null;

            // Prefill form
            inputName.value = data.fullName || '';
            inputEmail.value = currentUser.email || '';
            inputWhatsapp.value = data.whatsapp || '';
            inputPhone.value = data.phone || '';
            inputLocation.value = data.location || '';
            inputBio.value = data.bio || '';
            inputProfession.value = data.profession || '';
            inputFacebook.value = data.facebook || '';
            inputInstagram.value = data.instagram || '';
            inputLinkedin.value = data.linkedin || '';
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    } finally {
        loader.style.display = 'none';
        content.classList.remove('hidden');
    }
}

// --- TOGGLE EDIT FORM ---
editBtn.addEventListener('click', () => {
    profileForm.classList.remove('hidden');
    document.getElementById('profile-display-view').classList.add('hidden');
});

cancelBtn.addEventListener('click', () => {
    profileForm.classList.add('hidden');
    document.getElementById('profile-display-view').classList.remove('hidden');
    profileUpdateMsg.style.display = 'none';
});

// --- PHOTO UPLOAD ---
inputPhoto.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    displayPhoto.src = 'https://placehold.co/120x120/cccccc/777?text=Uploading...';

    try {
        uploadedPhotoURL = await uploadImageToCloudinary(file);
        displayPhoto.src = uploadedPhotoURL;
    } catch (error) {
        alert('Photo upload failed. Try again.');
        displayPhoto.src = 'https://placehold.co/120x120/e0e0e0/777?text=U';
    }
});

// --- UPDATE PROFILE ---
profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    toggleLoading(updateBtn, true, 'Saving...');

    try {
        const userRef = doc(db, 'users', currentUser.uid);
        await setDoc(userRef, {
            fullName: inputName.value,
            whatsapp: inputWhatsapp.value,
            phone: inputPhone.value,
            location: inputLocation.value,
            bio: inputBio.value,
            profession: inputProfession.value,
            facebook: inputFacebook.value,
            instagram: inputInstagram.value,
            linkedin: inputLinkedin.value,
            photoURL: uploadedPhotoURL || displayPhoto.src
        }, { merge: true });

        // Update display view
        displayName.textContent = inputName.value;
        displayWhatsapp.textContent = inputWhatsapp.value;
        displayPhone.textContent = inputPhone.value;
        displayLocation.textContent = inputLocation.value;
        displayBio.textContent = inputBio.value;
        displayProfession.textContent = inputProfession.value;
        displayFacebook.textContent = inputFacebook.value;
        displayInstagram.textContent = inputInstagram.value;
        displayLinkedin.textContent = inputLinkedin.value;

        profileUpdateMsg.textContent = 'Profile updated successfully!';
        profileUpdateMsg.style.color = 'green';
        profileUpdateMsg.style.display = 'block';

        profileForm.classList.add('hidden');
        document.getElementById('profile-display-view').classList.remove('hidden');
    } catch (error) {
        console.error(error);
        profileUpdateMsg.textContent = 'Error updating profile.';
        profileUpdateMsg.style.color = 'red';
        profileUpdateMsg.style.display = 'block';
    } finally {
        toggleLoading(updateBtn, false, 'Save Changes');
    }
});

// --- RESET PASSWORD ---
resetPasswordBtn.addEventListener('click', async () => {
    try {
        await sendPasswordResetEmail(auth, currentUser.email);
        alert('Password reset link sent to your email!');
    } catch (error) {
        console.error('Error sending password reset:', error);
        alert('Failed to send reset link. Try again.');
    }
});