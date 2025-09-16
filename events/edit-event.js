// /events/edit-event.js

import { auth, db } from '/firebase.js';
import { doc, getDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- FORM & FEEDBACK ELEMENTS ---
const editForm = document.getElementById('edit-event-form');
const feedbackEl = document.getElementById('feedback-message');
const submitBtn = editForm.querySelector('.submit-btn');

// --- FORM INPUTS ---
const titleInput = document.getElementById('event-title');
const descriptionInput = document.getElementById('event-description');
const dateInput = document.getElementById('event-date');
const timeInput = document.getElementById('event-time');
const locationInput = document.getElementById('event-location');
const priceInput = document.getElementById('event-price');
const imageInput = document.getElementById('event-image');

// Helper to re-use the Cloudinary function (make sure it's accessible or copy it here)
// This assumes you have a similar function available globally or imported.
async function uploadImageToCloudinary(file) {
    try {
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
    } catch (error) {
        console.error("Cloudinary Error:", error);
        throw new Error("Could not upload image.");
    }
}

function showFeedback(message, type = 'info') {
    feedbackEl.textContent = message;
    feedbackEl.className = `feedback-message feedback-${type}`; 
    feedbackEl.style.display = 'block';
}

// --- MAIN LOGIC ---

// Get Event ID from URL
const urlParams = new URLSearchParams(window.location.search);
const eventId = urlParams.get('id');
let existingImageUrl = ''; // To store the old image URL

// 1. Function to fetch and populate form data
async function populateForm() {
    if (!eventId) {
        showFeedback("No event ID provided. Cannot edit.", "error");
        editForm.style.display = 'none';
        return;
    }

    try {
        const eventRef = doc(db, 'events', eventId);
        const docSnap = await getDoc(eventRef);

        if (!docSnap.exists()) {
            throw new Error("Event not found.");
        }

        const event = docSnap.data();

        // Security check: Ensure the current user is the owner
        const user = auth.currentUser;
        if (!user || user.uid !== event.uploaderId) {
            throw new Error("You do not have permission to edit this event.");
        }

        // Populate the form
        titleInput.value = event.title;
        descriptionInput.value = event.description;
        dateInput.value = event.date;
        timeInput.value = event.time;
        locationInput.value = event.location;
        priceInput.value = event.price;
        existingImageUrl = event.imageUrl; // Store the current image URL

    } catch (error) {
        showFeedback(error.message, "error");
        submitBtn.disabled = true; // Disable the form if there's an error
    }
}

// 2. Add submit event listener to the form
editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.textContent = 'Updating...';

    try {
        const imageFile = imageInput.files[0];
        let newImageUrl = existingImageUrl;

        // If a new image is selected, upload it
        if (imageFile) {
            showFeedback("Uploading new image...", "info");
            newImageUrl = await uploadImageToCloudinary(imageFile);
        }

        // Prepare the data to update
        const updatedData = {
            title: titleInput.value,
            title_lowercase: titleInput.value.toLowerCase(),
            description: descriptionInput.value,
            date: dateInput.value,
            time: timeInput.value,
            location: locationInput.value,
            price: Number(priceInput.value),
            imageUrl: newImageUrl,
            lastModified: serverTimestamp() // Good practice to track updates
        };

        // Update the document in Firestore
        const eventRef = doc(db, 'events', eventId);
        await updateDoc(eventRef, updatedData);
        
        // Trigger Algolia sync (optional, but good if you have it)
        fetch('/.netlify/functions/syncToAlgolia').catch(err => console.error("Error triggering sync:", err));

        showFeedback("✅ Event updated successfully! Redirecting...", "success");

        setTimeout(() => {
            window.location.href = `/events/detail.html?id=${eventId}`;
        }, 2000);

    } catch (error) {
        console.error("Error updating event:", error);
        showFeedback(`Update failed: ${error.message}`, "error");
        submitBtn.disabled = false;
        submitBtn.textContent = 'Update Event';
    }
});

// 3. Initial call to populate the form when the page loads
auth.onAuthStateChanged(user => {
    if (user) {
        populateForm();
    } else {
        showFeedback("You must be logged in to edit an event.", "error");
        editForm.style.display = 'none';
    }
});

