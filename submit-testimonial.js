import { db } from './firebase.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const form = document.getElementById('testimonial-form');
const submitBtn = document.getElementById('submit-btn');
const formMessage = document.getElementById('form-message');

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    const testimonialData = {
        quote: form.quote.value.trim(),
        authorName: form.authorName.value.trim(),
        authorDetail: form.authorDetail.value.trim(),
        createdAt: serverTimestamp(),
        status: 'pending' // Default status for admin review
    };

    try {
        await addDoc(collection(db, 'testimonials'), testimonialData);
        form.reset();
        showMessage('Thank you! Your feedback has been submitted for review.', 'success');
    } catch (error) {
        console.error("Error submitting testimonial: ", error);
        showMessage('Sorry, something went wrong. Please try again.', 'error');
    } finally {
        // Use a timeout to give user time to read the success message before re-enabling
        setTimeout(() => {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Feedback';
            formMessage.style.display = 'none';
        }, 4000);
    }
});

function showMessage(message, type) {
    formMessage.textContent = message;
    formMessage.className = `form-message ${type}`;
    formMessage.style.display = 'block';
}
