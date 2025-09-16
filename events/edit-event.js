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

// This function must be available, e.g., from a shared utility file or copied here.
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
    if (!feedbackEl) return;
    feedbackEl.textContent = message;
    feedbackEl.className = `feedback-message feedback-${type}`;
    feedbackEl.style.display = 'block';
}

function hideFeedback() {
    if (feedbackEl) feedbackEl.style.display = 'none';
}

// --- MAIN LOGIC ---

// Get Event ID from URL
const urlParams = new URLSearchParams(window.location.search);
const eventId = urlParams.get('id');
let existingImageUrl = '';

// 1. Function to fetch and populate form data
async function populateForm(user) {
    console.log("Attempting to populate form for event ID:", eventId);
    if (!eventId) {
        showFeedback("No event ID provided in URL. Cannot edit.", "error");
        editForm.style.display = 'none';
        return;
    }

    try {
        const eventRef = doc(db, 'events', eventId);
        const docSnap = await getDoc(eventRef);

        if (!docSnap.exists()) {
            throw new Error("This event could not be found.");
        }

        const event = docSnap.data();
        console.log("Found event data:", event);

        // Security check: Ensure the current user is the owner
        if (user.uid !== event.uploaderId) {
            console.error("Permission Denied. Current user UID:", user.uid, "Event uploader UID:", event.uploaderId);
            throw new Error("You do not have permission to edit this event.");
        }

        console.log("User has permission. Populating form fields...");
        // Populate the form with all the previous data
        titleInput.value = event.title || '';
        descriptionInput.value = event.description || '';
        dateInput.value = event.date || '';
        timeInput.value = event.time || '';
        locationInput.value = event.location || '';
        priceInput.value = event.price || 0;
        existingImageUrl = event.imageUrl; // Store the current image URL
        
        console.log("Form population complete.");
        showFeedback("Data loaded successfully. You can now edit your event.", "success");
        setTimeout(hideFeedback, 3000); // Hide message after 3 seconds

    } catch (error) {
        console.error("Error populating form:", error);
        showFeedback(error.message, "error");
        submitBtn.disabled = true; // Disable the form if there's a critical error
        submitBtn.style.cursor = 'not-allowed';
    }
}

// 2. Add submit event listener to the form
editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.textContent = 'Updating...';
    hideFeedback();

    try {
        const imageFile = imageInput.files[0];
        let newImageUrl = existingImageUrl;

        // Feedback Step: Check for new image
        if (imageFile) {
            console.log("New image detected. Starting upload...");
            showFeedback("Uploading new poster...", "info");
            newImageUrl = await uploadImageToCloudinary(imageFile);
            console.log("New image uploaded:", newImageUrl);
        } else {
            console.log("No new image. Keeping existing URL:", existingImageUrl);
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

        // Feedback Step: Saving data
        showFeedback("Saving your changes...", "info");
        const eventRef = doc(db, 'events', eventId);
        await updateDoc(eventRef, updatedData);
        console.log("Firestore document updated successfully.");
        
        // Final Feedback: Success and redirect
        showFeedback("✅ Event updated successfully! Taking you back...", "success");

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
        console.log("User is logged in. UID:", user.uid);
        populateForm(user);
    } else {
        console.log("No user is logged in.");
        showFeedback("You must be logged in to edit an event.", "error");
        editForm.style.display = 'none';
    }
});
