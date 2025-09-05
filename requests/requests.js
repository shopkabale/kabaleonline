import { db } from '../firebase.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const requestForm = document.getElementById('request-form');
const successMessage = document.getElementById('success-message');
const submitBtn = document.getElementById('submit-request-btn');

requestForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.textContent = 'Posting...';

    try {
        const item = document.getElementById('request-item').value;
        const details = document.getElementById('request-details').value;
        const nickname = document.getElementById('request-nickname').value;

        await addDoc(collection(db, 'requests'), {
            item: item,
            details: details,
            nickname: nickname,
            createdAt: serverTimestamp()
        });

        successMessage.style.display = 'block';
        requestForm.reset();

    } catch (error) {
        console.error("Error posting request:", error);
        alert("Sorry, there was an error posting your request. Please try again.");
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Post Your Request';
    }
});
