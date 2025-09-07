import { db, auth } from '../firebase.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";

const storyForm = document.getElementById('story-form');
const storyTitleInput = document.getElementById('story-title');
const submitBtn = document.getElementById('submit-story-btn');
const storyMessageEl = document.getElementById('story-message');

let currentUserId = null;

onAuthStateChanged(auth, (user) => {
    currentUserId = user ? user.uid : null;
    if (!currentUserId) {
        // Redirect to login or hide form if not authenticated
        storyForm.innerHTML = `<p style="text-align: center;">Please <a href="/sell/">login</a> to post a story.</p>`;
    }
});

// Initialize the Quill editor
const quill = new Quill('#editor-container', {
    theme: 'snow'
});

const showMessage = (element, message, isError = false) => {
    element.textContent = message;
    element.className = isError ? 'error-message' : 'success-message';
    element.style.display = 'block';
    setTimeout(() => { element.style.display = 'none'; }, 5000);
};

storyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUserId) {
        showMessage(storyMessageEl, 'You must be logged in to post.', true);
        return;
    }

    const title = storyTitleInput.value.trim();
    const content = quill.root.innerHTML.trim();

    if (!title || quill.getText().trim() === '') {
        showMessage(storyMessageEl, 'Please fill in all fields.', true);
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Publishing...';

    try {
        await addDoc(collection(db, 'stories'), {
            title: title,
            content: content,
            authorId: currentUserId,
            likeCount: 0,
            createdAt: serverTimestamp()
        });

        showMessage(storyMessageEl, 'Your story has been published!', false);
        storyTitleInput.value = '';
        quill.root.innerHTML = ''; // Clear the editor
    } catch (error) {
        console.error("Error adding story:", error);
        showMessage(storyMessageEl, 'Failed to publish story. Please try again.', true);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Publish Story';
    }
});
