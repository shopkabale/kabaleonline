import { auth, db } from '../firebase.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const postForm = document.getElementById('post-form');
const successMessage = document.getElementById('success-message');
const submitBtn = document.getElementById('submit-btn');

postForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    // Get the current user at the moment of submission
    const user = auth.currentUser;

    try {
        const status = document.getElementById('status').value;
        const itemName = document.getElementById('item-name').value;
        const description = document.getElementById('description').value;
        const location = document.getElementById('location').value;
        const nickname = document.getElementById('nickname').value;
        const contactInfo = document.getElementById('contact-info').value;

        // Prepare the data to be saved
        const postData = {
            status, itemName, description, location, nickname,
            contactInfo: contactInfo, // This can be an empty string
            createdAt: serverTimestamp()
        };

        // ONLY add the posterId if a user is actually logged in
        if (user) {
            postData.posterId = user.uid;
        }

        // Add the document to the database
        await addDoc(collection(db, 'lost_and_found'), postData);

        // Show success message
        successMessage.style.display = 'block';
        postForm.reset();
        window.scrollTo(0, 0);

    } catch (error) {
        console.error("Error submitting post:", error);
        alert("There was an error submitting your post. Please try again.");
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Post';
    }
});
