import { auth, db } from '/firebase.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const eventForm = document.getElementById('event-form');
const feedbackEl = document.getElementById('feedback-message');

/**
 * ✨ 1. NEW HELPER FUNCTION FOR DISPLAYING FEEDBACK
 * @param {string} message The text to display.
 * @param {'info'|'warning'|'success'|'error'} type The type of message, for styling.
 */
function showFeedback(message, type = 'info') {
    if (!feedbackEl) return;
    feedbackEl.textContent = message;
    // Sets the class based on type e.g., "feedback-message feedback-success"
    feedbackEl.className = `feedback-message feedback-${type}`; 
    feedbackEl.style.display = 'block';
}

function hideFeedback() {
    if (feedbackEl) feedbackEl.style.display = 'none';
}

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
        throw new Error("Could not upload image. Please check your connection and try again.");
    }
}

eventForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    const submitBtn = eventForm.querySelector('.submit-btn');

    if (!user) {
        showFeedback("You must be logged in to post an event.", "error");
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
    hideFeedback(); // Hide any previous messages

    // ✨ 2. IMPLEMENT MULTI-STAGE FEEDBACK WITH TIMEOUTS
    showFeedback("Initializing submission...", "info");

    // Show a warning if it takes too long (e.g., > 8 seconds)
    const warningTimeout = setTimeout(() => {
        showFeedback("This is taking a bit longer than expected. Please wait...", "warning");
    }, 8000);

    try {
        const title = document.getElementById('event-title').value;
        const description = document.getElementById('event-description').value;
        const date = document.getElementById('event-date').value;
        const time = document.getElementById('event-time').value;
        const location = document.getElementById('event-location').value;
        const price = Number(document.getElementById('event-price').value);
        const imageFile = document.getElementById('event-image').files[0];

        if (!imageFile) throw new Error("An event image or poster is required.");
        if (!title || !date || !time || !location) throw new Error("Please fill out all required fields.");
        
        showFeedback("Uploading image poster...", "info");
        const imageUrl = await uploadImageToCloudinary(imageFile);

        // Clear the warning timeout if the upload was fast
        clearTimeout(warningTimeout);
        showFeedback("Finishing up...", "info");

        const eventData = {
            title: title,
            title_lowercase: title.toLowerCase(),
            description: description,
            date: date,
            time: time,
            location: location,
            price: price,
            imageUrl: imageUrl,
            uploaderId: user.uid,
            createdAt: serverTimestamp()
        };

        const docRef = await addDoc(collection(db, 'events'), eventData);

        // Trigger Algolia sync in the background (no need to wait for it)
        fetch('/.netlify/functions/syncToAlgolia').catch(err => console.error("Error triggering sync:", err));

        // ✨ 3. SHOW CUSTOM SUCCESS MESSAGE AND REDIRECT
        showFeedback("✅ Event posted successfully! Taking you to the event page...", "success");

        setTimeout(() => {
            window.location.href = `/events/detail.html?id=${docRef.id}`;
        }, 2500); // Wait 2.5 seconds before redirecting

    } catch (error) {
        console.error("Error submitting event:", error);
        // ✨ 4. SHOW ERROR MESSAGE IN THE FEEDBACK ELEMENT
        clearTimeout(warningTimeout); // Clear timeout on error too
        showFeedback(`Failed to submit: ${error.message}`, "error");
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Event';
    } 
    // We removed the 'finally' block because the success case now handles the redirect,
    // and the error case needs to keep the button enabled and message visible.
});
