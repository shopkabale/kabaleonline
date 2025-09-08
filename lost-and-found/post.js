import { auth, db } from '../firebase.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const postForm = document.getElementById('post-form');
const successMessage = document.getElementById('success-message');
const submitBtn = document.getElementById('submit-btn');

// This function is now much smarter and safer
postForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    // Get the current user AT THE MOMENT of submission
    const user = auth.currentUser;

    // This is the collection name for this form
    const collectionName = 'lost_and_found'; // For your rentals form, change this to 'rentals'

    // --- IMPORTANT CHECK for collections that REQUIRE login (like rentals) ---
    // if (collectionName === 'rentals' && !user) {
    //     alert("You must be logged in to post a rental.");
    //     submitBtn.disabled = false;
    //     submitBtn.textContent = 'Submit Post';
    //     return; // Stop the function here
    // }

    try {
        const status = document.getElementById('status').value;
        const itemName = document.getElementById('item-name').value;
        const description = document.getElementById('description').value;
        const location = document.getElementById('location').value;
        const nickname = document.getElementById('nickname').value;
        const contactInfo = document.getElementById('contact-info').value;

        // Prepare the data to be saved
        const postData = {
            status,
            itemName,
            description,
            location,
            nickname,
            contactInfo,
            createdAt: serverTimestamp()
        };

        // ONLY add the posterId if a user is actually logged in
        if (user) {
            postData.posterId = user.uid;
        }

        // Add the document to the database
        await addDoc(collection(db, collectionName), postData);

        // Show success message
        successMessage.style.display = 'block';
        postForm.reset();
        window.scrollTo(0, 0);

    } catch (error) {
        console.error(`Error submitting post to ${collectionName}:`, error);
        alert("There was an error submitting your post. Please try again.");
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Post';
    }
});
