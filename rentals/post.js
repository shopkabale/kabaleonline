import { auth, db } from '../firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

async function uploadImageToCloudinary(file) {
    const response = await fetch('/.netlify/functions/generate-signature');
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
}

const rentalForm = document.getElementById('rental-form');
const submitBtn = document.getElementById('submit-btn');
const successMessage = document.getElementById('success-message');
const formWrapper = document.getElementById('form-wrapper');
const loginPrompt = document.getElementById('login-prompt');

onAuthStateChanged(auth, (user) => {
    if (user) {
        loginPrompt.style.display = 'none';
        formWrapper.style.display = 'block';
    } else {
        formWrapper.style.display = 'none';
        loginPrompt.style.display = 'block';
    }
});

rentalForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) {
        alert("Authentication error. Please refresh and log in.");
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";

    try {
        const imageFiles = document.getElementById('photos').files;
        let imageUrls = [];
        if (imageFiles.length > 0) {
            const uploadPromises = Array.from(imageFiles).slice(0, 5).map(file => uploadImageToCloudinary(file));
            imageUrls = await Promise.all(uploadPromises);
        }

        const rentalData = {
            listingType: document.getElementById('listing-type').value,
            title: document.getElementById('title').value,
            location: document.getElementById('location').value,
            price: Number(document.getElementById('price').value),
            priceFrequency: document.getElementById('price-frequency').value,
            description: document.getElementById('description').value,
            amenities: {
                hasWater: document.getElementById('hasWater').checked,
                hasPowerBackup: document.getElementById('hasPowerBackup').checked,
                isFenced: document.getElementById('isFenced').checked,
                isFurnished: document.getElementById('isFurnished').checked,
            },
            contactName: document.getElementById('contactName').value,
            contactPhone: document.getElementById('contactPhone').value,
            imageUrls: imageUrls,
            posterId: user.uid,
            createdAt: serverTimestamp()
        };

        await addDoc(collection(db, 'rentals'), rentalData);
        successMessage.style.display = 'block';
        rentalForm.reset();
        window.scrollTo(0, 0);

    } catch (error) {
        console.error("Error submitting rental:", error);
        alert("There was an error submitting your listing. Please try again.");
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit Listing";
    }
});
