import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
// MODIFIED: Added runTransaction, increment, and serverTimestamp
import { doc, getDoc, collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, setDoc, updateDoc, runTransaction, increment } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// Existing chat elements
const chatRecipientName = document.getElementById('chat-recipient-name');
const chatMessages = document.getElementById('chat-messages');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');

// NEW: Review modal elements
const reviewModalBtn = document.getElementById('review-modal-btn');
const reviewModal = document.getElementById('review-modal');
const cancelReviewBtn = document.getElementById('cancel-review-btn');
const reviewForm = document.getElementById('review-form');
const reviewRecipientName = document.getElementById('review-recipient-name');
const starRatingContainer = document.getElementById('star-rating');
const stars = document.querySelectorAll('.star');
let selectedRating = 0;

const urlParams = new URLSearchParams(window.location.search);
const chatId = urlParams.get('chatId');
const recipientId = urlParams.get('recipientId');
let currentUser;
let recipientName;

// --- Main Auth Function ---
onAuthStateChanged(auth, async (user) => {
    if (user && chatId && recipientId) {
        currentUser = user;
        
        const recipientDoc = await getDoc(doc(db, 'users', recipientId));
        recipientName = recipientDoc.exists() ? recipientDoc.data().name : 'User';
        chatRecipientName.textContent = recipientName;
        reviewRecipientName.textContent = recipientName;

        setupMessageListener();
        markChatAsRead();
        checkIfAlreadyReviewed(); // Check if user can leave a review
    } else {
        document.body.innerHTML = '<h1>Access Denied</h1><p>You must be <a href="/sell/">logged in</a> to chat.</p>';
    }
});

// --- Message Handling ---
function setupMessageListener() {
    const messagesRef = collection(db, `chats/${chatId}/messages`);
    const q = query(messagesRef, orderBy('timestamp', 'desc'));

    onSnapshot(q, (snapshot) => {
        chatMessages.innerHTML = '';
        snapshot.forEach(doc => {
            const message = doc.data();
            const messageDiv = document.createElement('div');
            messageDiv.classList.add('message');
            messageDiv.textContent = message.text;
            messageDiv.classList.add(message.senderId === currentUser.uid ? 'sent' : 'received');
            chatMessages.appendChild(messageDiv);
        });
    });
}

chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const messageText = messageInput.value.trim();
    if (messageText === '' || !currentUser) return;
    messageInput.value = '';

    try {
        await addDoc(collection(db, `chats/${chatId}/messages`), {
            text: messageText,
            senderId: currentUser.uid,
            recipientId: recipientId,
            timestamp: serverTimestamp()
        });

        await setDoc(doc(db, 'chats', chatId), {
            users: [currentUser.uid, recipientId],
            lastMessage: messageText,
            lastUpdated: serverTimestamp(),
            lastSenderId: currentUser.uid,
            lastRead: { [currentUser.uid]: serverTimestamp() }
        }, { merge: true });

    } catch (error) { console.error("Error sending message: ", error); }
});

async function markChatAsRead() {
    if (!currentUser) return;
    await updateDoc(doc(db, 'chats', chatId), {
        [`lastRead.${currentUser.uid}`]: serverTimestamp()
    });
}


// --- NEW: Review Handling Logic ---

// Check if a review exists to enable/disable the button
async function checkIfAlreadyReviewed() {
    const reviewRef = doc(db, `users/${recipientId}/reviews`, currentUser.uid);
    const reviewSnap = await getDoc(reviewRef);
    if (reviewSnap.exists()) {
        reviewModalBtn.textContent = 'Review Submitted';
        reviewModalBtn.disabled = true;
    } else {
        reviewModalBtn.disabled = false;
    }
}

// Modal visibility
reviewModalBtn.addEventListener('click', () => reviewModal.style.display = 'flex');
cancelReviewBtn.addEventListener('click', () => reviewModal.style.display = 'none');
reviewModal.addEventListener('click', (e) => {
    if (e.target === reviewModal) {
        reviewModal.style.display = 'none';
    }
});

// Star rating selection
starRatingContainer.addEventListener('click', e => {
    if (e.target.classList.contains('star')) {
        selectedRating = parseInt(e.target.dataset.value);
        stars.forEach(star => {
            star.classList.toggle('selected', parseInt(star.dataset.value) <= selectedRating);
        });
    }
});

// Form submission
reviewForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const reviewText = document.getElementById('review-text').value;
    const messageEl = document.getElementById('review-form-message');

    if (selectedRating === 0) {
        messageEl.textContent = 'Please select a star rating.';
        messageEl.style.color = 'red';
        return;
    }

    const submitBtn = document.getElementById('submit-review-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    try {
        // Use a transaction to ensure data consistency
        await runTransaction(db, async (transaction) => {
            const sellerRef = doc(db, 'users', recipientId);
            const reviewRef = doc(db, `users/${recipientId}/reviews`, currentUser.uid);

            const sellerDoc = await transaction.get(sellerRef);
            if (!sellerDoc.exists()) {
                throw "Seller profile does not exist.";
            }
            
            // 1. Update seller's aggregate rating data
            const oldRatingTotal = sellerDoc.data().ratingTotal || 0;
            const oldReviewCount = sellerDoc.data().reviewCount || 0;
            const newReviewCount = oldReviewCount + 1;
            const newRatingTotal = oldRatingTotal + selectedRating;
            const newAverageRating = newRatingTotal / newReviewCount;

            transaction.update(sellerRef, {
                reviewCount: increment(1),
                ratingTotal: increment(selectedRating),
                averageRating: newAverageRating
            });

            // 2. Create the new review document
            const currentUserDoc = await getDoc(doc(db, 'users', currentUser.uid));
            const reviewerName = currentUserDoc.exists() ? currentUserDoc.data().name : 'Anonymous';

            transaction.set(reviewRef, {
                rating: selectedRating,
                text: reviewText,
                reviewerId: currentUser.uid,
                reviewerName: reviewerName,
                timestamp: serverTimestamp()
            });
        });

        messageEl.textContent = 'Review submitted successfully!';
        messageEl.style.color = 'green';
        setTimeout(() => {
            reviewModal.style.display = 'none';
            checkIfAlreadyReviewed(); // Disable button after submission
        }, 2000);

    } catch (error) {
        console.error("Error submitting review: ", error);
        messageEl.textContent = 'Failed to submit review. Please try again.';
        messageEl.style.color = 'red';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit';
    }
});
