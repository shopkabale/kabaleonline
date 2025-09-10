import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { doc, getDoc, collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, setDoc, updateDoc, runTransaction, increment } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- Chat Elements ---
const chatRecipientName = document.getElementById('chat-recipient-name');
const chatMessages = document.getElementById('chat-messages');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');

// --- Review Modal Elements ---
const reviewModalBtn = document.getElementById('review-modal-btn');
const reviewModal = document.getElementById('review-modal');
const cancelReviewBtn = document.getElementById('cancel-review-btn');
const reviewForm = document.getElementById('review-form');
const reviewRecipientName = document.getElementById('review-recipient-name');
const starRatingContainer = document.getElementById('star-rating');
const stars = document.querySelectorAll('.star');
let selectedRating = 0;

// --- State Variables ---
const urlParams = new URLSearchParams(window.location.search);
const chatId = urlParams.get('chatId');
const recipientId = urlParams.get('recipientId');
let currentUser;
let recipientName;


// --- Main Initialization on Auth State Change ---
onAuthStateChanged(auth, async (user) => {
    if (user && chatId && recipientId) {
        currentUser = user;
        
        const recipientDoc = await getDoc(doc(db, 'users', recipientId));
        if (recipientDoc.exists()) {
            recipientName = recipientDoc.data().name || 'User';
        } else {
            recipientName = 'User';
        }
        
        chatRecipientName.textContent = recipientName;
        if(reviewRecipientName) reviewRecipientName.textContent = recipientName;

        setupMessageListener();
        markChatAsRead();
        setupReviewModal(); // Initialize review functionality
    } else {
        document.body.innerHTML = `
            <div style="text-align: center; padding-top: 50px;">
                <h1>Access Denied</h1>
                <p>You must be <a href="/sell/">logged in</a> to view this page.</p>
            </div>
        `;
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
    
    const originalValue = messageInput.value;
    messageInput.value = '';
    messageInput.disabled = true;

    try {
        // 1. Create the message in the subcollection
        await addDoc(collection(db, `chats/${chatId}/messages`), {
            text: messageText,
            senderId: currentUser.uid,
            recipientId: recipientId,
            timestamp: serverTimestamp()
        });

        // 2. Update the parent chat document for inbox/notifications
        await setDoc(doc(db, 'chats', chatId), {
            users: [currentUser.uid, recipientId],
            lastMessage: messageText,
            lastUpdated: serverTimestamp(),
            lastSenderId: currentUser.uid,
            lastRead: { [currentUser.uid]: serverTimestamp() }
        }, { merge: true });

    } catch (error) { 
        console.error("Error sending message: ", error); 
        alert("Message could not be sent. Please check the console for errors.");
        messageInput.value = originalValue; // Restore message on failure
    } finally {
        messageInput.disabled = false;
        messageInput.focus();
    }
});

async function markChatAsRead() {
    if (!currentUser) return;
    // This updates the 'lastRead' timestamp for the current user, which hides the notification dot.
    await updateDoc(doc(db, 'chats', chatId), {
        [`lastRead.${currentUser.uid}`]: serverTimestamp()
    }).catch(err => {
        // This can fail harmlessly on the very first message if the doc doesn't exist yet.
        console.log("Could not mark chat as read. This is normal for a new chat.");
    });
}


// --- Review Handling Logic ---

function setupReviewModal() {
    if (!reviewModalBtn) return;

    checkIfAlreadyReviewed();

    // Modal visibility event listeners
    reviewModalBtn.addEventListener('click', () => reviewModal.style.display = 'flex');
    cancelReviewBtn.addEventListener('click', () => reviewModal.style.display = 'none');
    reviewModal.addEventListener('click', (e) => {
        if (e.target === reviewModal) {
            reviewModal.style.display = 'none';
        }
    });

    // Star rating selection listener
    starRatingContainer.addEventListener('click', e => {
        if (e.target.classList.contains('star')) {
            selectedRating = parseInt(e.target.dataset.value);
            stars.forEach(star => {
                star.classList.toggle('selected', parseInt(star.dataset.value) <= selectedRating);
            });
        }
    });

    // Form submission listener
    reviewForm.addEventListener('submit', handleReviewSubmission);
}

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

async function handleReviewSubmission(e) {
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
        // Use a transaction for data consistency (update average and add review together)
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
            checkIfAlreadyReviewed(); // Disable button after successful submission
        }, 2000);

    } catch (error) {
        console.error("Error submitting review: ", error);
        messageEl.textContent = 'Failed to submit review. Please try again.';
        messageEl.style.color = 'red';
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit';
    }
}
