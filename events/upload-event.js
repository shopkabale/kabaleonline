import { auth, db } from '/firebase.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const eventForm = document.getElementById('event-form');

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
        alert("You must be logged in to post an event.");
        return;
    }
    
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

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

        const imageUrl = await uploadImageToCloudinary(imageFile);

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
        
        // --- THIS IS THE UPDATED TRIGGER ---
        // Manually trigger the bulk-sync function to update Algolia.
        console.log("Triggering Algolia sync function...");
        fetch('/.netlify/functions/syncToAlgolia') // Correctly points to your function
            .then(response => {
                if (!response.ok) {
                    console.error("Failed to trigger Algolia sync.");
                } else {
                    console.log("Algolia sync triggered successfully.");
                }
            })
            .catch(err => console.error("Error triggering sync function:", err));
        
        alert(`Event submitted successfully!`);
        eventForm.reset();
        window.location.href = `/events/detail.html?id=${docRef.id}`;

    } catch (error) {
        console.error("Error submitting event:", error);
        alert(`Failed to submit event: ${error.message}`);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Event';
    }
});
