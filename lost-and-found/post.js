import { auth, db } from '../firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const postForm = document.getElementById('post-form');
const successMessage = document.getElementById('success-message');
const submitBtn = document.getElementById('submit-btn');
let currentUserId = null;

// Check if a user is logged in to automatically attach their ID
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserId = user.uid;
    }
});

postForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    try {
        const status = document.getElementById('status').value;
        const itemName = document.getElementById('item-name').value;
        const description = document.getElementById('description').value;
        const location = document.getElementById('location').value;
        const nickname = document.getElementById('nickname').value;
        const contactInfo = document.getElementById('contact-info').value;

        await addDoc(collection(db, 'lost_and_found'), {
            status, itemName, description, location, nickname,
            contactInfo: contactInfo,
            posterId: currentUserId,
            createdAt: serverTimestamp()
        });

        successMessage.style.display = 'block';
        postForm.reset();
        window.scrollTo(0, 0);

    } catch (error) {
        console.error("Error submitting post:", error);
        alert("There was an error submitting your post.");
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Post';
    }
});
