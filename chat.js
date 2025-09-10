import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { doc, getDoc, collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, setDoc, updateDoc, runTransaction, increment } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- Elements ---
const chatRecipientName = document.getElementById('chat-recipient-name');
const chatMessages = document.getElementById('chat-messages');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
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

// --- CRITICAL CHECK ---
// Check if the necessary IDs were passed in the URL. If not, stop everything.
if (!chatId || !recipientId) {
    document.body.innerHTML = `<div style="text-align: center; padding: 50px;"><h1>Error</h1><p>Could not start chat. Missing required information. Please go back and try again.</p></div>`;
} else {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;

            // Ensure the parent chat document exists to satisfy security rules
            const chatRef = doc(db, 'chats', chatId);
            await setDoc(chatRef, { users: [currentUser.uid, recipientId] }, { merge: true });

            const recipientDoc = await getDoc(doc(db, 'users', recipientId));
            const recipientName = recipientDoc.exists() ? recipientDoc.data().name : 'User';
            chatRecipientName.textContent = recipientName;
            if (reviewRecipientName) reviewRecipientName.textContent = recipientName;
            
            setupMessageListener();
            markChatAsRead();
            setupReviewModal();
        } else {
            document.body.innerHTML = `<div style="text-align: center; padding: 50px;"><h1>Access Denied</h1><p>You must be <a href="/sell/">logged in</a> to view this page.</p></div>`;
        }
    });
}

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
    }, (error) => {
        console.error("CRITICAL: Message listener failed!", error);
        chatMessages.innerHTML = `<p style="text-align:center;color:red;">Error loading messages. Your security rules might be incorrect.</p>`;
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
        await addDoc(collection(db, `chats/${chatId}/messages`), {
            text: messageText,
            senderId: currentUser.uid,
            recipientId: recipientId,
            timestamp: serverTimestamp()
        });
        await updateDoc(doc(db, 'chats', chatId), {
            lastMessage: messageText,
            lastUpdated: serverTimestamp(),
            lastSenderId: currentUser.uid,
            lastRead: { [currentUser.uid]: serverTimestamp() }
        });
    } catch (error) { 
        console.error("Error sending message:", error); 
        alert("Message could not be sent. Please check the console for errors.");
        messageInput.value = originalValue;
    } finally {
        messageInput.disabled = false;
        messageInput.focus();
    }
}

async function markChatAsRead() {
    if (!currentUser) return;
    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
        [`lastRead.${currentUser.uid}`]: serverTimestamp()
    }).catch(err => {
        console.log("Could not mark chat as read. This is normal for a brand new chat.");
    });
}

// --- Review Handling Logic ---
function setupReviewModal() {
    if (!reviewModalBtn || !cancelReviewBtn || !reviewModal || !reviewForm) return;

    checkIfAlreadyReviewed();

    reviewModalBtn.addEventListener('click', () => reviewModal.style.display = 'flex');
    cancelReviewBtn.addEventListener('click', () => reviewModal.style.display = 'none');
    reviewModal.addEventListener('click', (e) => {
        if (e.target === reviewModal) {
            reviewModal.style.display = 'none';
        }
    });

    starRatingContainer.addEventListener('click', e => {
        if (e.target.classList.contains('star')) {
            selectedRating = parseInt(e.target.dataset.value);
            stars.forEach(star => {
                star.classList.toggle('selected', parseInt(star.dataset.value) <= selectedRating);
            });
        }
    });

    reviewForm.addEventListener('submit', handleReviewSubmission);
}

async function checkIfAlreadyReviewed() {
    const reviewRef = doc(db, `users/${recipientId}/reviews`, currentUser.uid);
    const reviewSnap = await getDoc(reviewRef);
    reviewModalBtn.disabled = reviewSnap.exists();
    if (reviewSnap.exists()) {
        reviewModalBtn.textContent = 'Review Submitted';
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
        await runTransaction(db, async (transaction) => {
            const sellerRef = doc(db, 'users', recipientId);
            const reviewRef = doc(db, `users/${recipientId}/reviews`, currentUser.uid);
            const sellerDoc = await transaction.get(sellerRef);
            if (!sellerDoc.exists()) {
                throw "Seller profile does not exist.";
            }
            
            const oldRatingTotal = sellerDoc.data().ratingTotal || 0;
            const oldReviewCount = sellerDoc.data().reviewCount || 0;
            
            transaction.update(sellerRef, {
                reviewCount: increment(1),
                ratingTotal: oldRatingTotal + selectedRating,
                averageRating: (oldRatingTotal + selectedRating) / (oldReviewCount + 1)
            });

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
            checkIfAlreadyReviewed();
        }, 2000);

    } catch (error) {
        console.error("Error submitting review:", error);
        messageEl.textContent = 'Failed to submit review. Please try again.';
        messageEl.style.color = 'red';
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Review';
    }
}
