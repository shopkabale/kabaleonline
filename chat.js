// chat.js
import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import {
  collection, doc, getDoc, setDoc, addDoc, updateDoc,
  onSnapshot, query, orderBy, serverTimestamp, runTransaction
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// DOM
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

let currentUser = null;
let chatId = null;
let recipientId = null;
let selectedRating = 0;

// read URL params
const urlParams = new URLSearchParams(window.location.search);
const chatIdParam = urlParams.get('chatId'); // optional
const recipientParam = urlParams.get('recipientId'); // required

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    console.warn('No user logged in; redirecting to login.');
    // adjust as you prefer
    // window.location.href = '/sell/';
    return;
  }
  currentUser = user;

  if (!recipientParam) {
    chatRecipientName.textContent = 'Missing recipient';
    chatMessages.innerHTML = `<p style="padding:20px;text-align:center;color:red;">Missing recipientId in URL.</p>`;
    return;
  }
  recipientId = recipientParam;

  // compute chatId: prefer explicit param, otherwise deterministic from uids
  chatId = chatIdParam ? chatIdParam : [currentUser.uid, recipientId].sort().join('_');

  try {
    // ensure chat doc exists (merge: true)
    const chatRef = doc(db, 'chats', chatId);
    await setDoc(chatRef, {
      users: [currentUser.uid, recipientId],
      createdAt: serverTimestamp()
    }, { merge: true });

    // load recipient name
    const userDoc = await getDoc(doc(db, 'users', recipientId));
    const recipientName = userDoc.exists() ? userDoc.data().name || 'User' : 'User';
    chatRecipientName.textContent = recipientName;
    if (reviewRecipientName) reviewRecipientName.textContent = recipientName;

    // setup listeners and UI
    setupMessageListener();
    markChatAsRead(); // initial
    setupReviewModal();

  } catch (err) {
    console.error('Initialization error:', err);
    chatMessages.innerHTML = `<p style="padding:20px;text-align:center;color:red;">Could not initialize chat. See console.</p>`;
  }
});

function setupMessageListener() {
  const messagesRef = collection(db, 'chats', chatId, 'messages');
  const q = query(messagesRef, orderBy('timestamp', 'asc'));
  onSnapshot(q, (snap) => {
    chatMessages.innerHTML = '';
    snap.forEach(docSnap => {
      const m = docSnap.data();
      const div = document.createElement('div');
      div.classList.add('message');
      div.classList.add(m.senderId === currentUser.uid ? 'sent' : 'received');

      const textEl = document.createElement('div');
      textEl.textContent = m.text || '';
      div.appendChild(textEl);

      const meta = document.createElement('div');
      meta.className = 'meta';
      try {
        meta.textContent = m.timestamp && m.timestamp.toDate ? m.timestamp.toDate().toLocaleString() : '';
      } catch (e) { meta.textContent = ''; }
      div.appendChild(meta);

      chatMessages.appendChild(div);
    });

    // scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // mark read
    markChatAsRead();
  }, (err) => {
    console.error('Message listener error:', err);
    chatMessages.innerHTML = `<p style="padding:20px;text-align:center;color:red;">Failed to load messages.</p>`;
  });
}

chatForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (!text || !currentUser) return;
  messageInput.disabled = true;
  chatForm.querySelector('button[type="submit"]').disabled = true;

  try {
    // add message
    await addDoc(collection(db, 'chats', chatId, 'messages'), {
      text,
      senderId: currentUser.uid,
      recipientId,
      timestamp: serverTimestamp()
    });

    // update parent chat
    await updateDoc(doc(db, 'chats', chatId), {
      lastMessage: text,
      lastUpdated: serverTimestamp(),
      lastSenderId: currentUser.uid,
      [`lastRead.${currentUser.uid}`]: serverTimestamp()
    });

    messageInput.value = '';
  } catch (err) {
    console.error('Send error:', err);
    alert('Could not send message. See console.');
  } finally {
    messageInput.disabled = false;
    chatForm.querySelector('button[type="submit"]').disabled = false;
    messageInput.focus();
  }
});

async function markChatAsRead() {
  if (!currentUser || !chatId) return;
  try {
    await updateDoc(doc(db, 'chats', chatId), {
      [`lastRead.${currentUser.uid}`]: serverTimestamp()
    });
  } catch (err) {
    // Not fatal — often permission error for new chat doc; ignore
    // console.log('Could not mark read:', err);
  }
}

/* ---------------- Review modal ---------------- */
function setupReviewModal() {
  if (!reviewModalBtn || !cancelReviewBtn || !reviewModal || !reviewForm) return;
  checkIfAlreadyReviewed();

  reviewModalBtn.addEventListener('click', () => { reviewModal.style.display = 'flex'; });
  cancelReviewBtn.addEventListener('click', () => { reviewModal.style.display = 'none'; });
  reviewModal.addEventListener('click', (e) => { if (e.target === reviewModal) reviewModal.style.display = 'none'; });

  starRatingContainer?.addEventListener('click', (e) => {
    if (e.target.classList.contains('star')) {
      selectedRating = parseInt(e.target.dataset.value, 10);
      stars.forEach(s => s.classList.toggle('selected', parseInt(s.dataset.value, 10) <= selectedRating));
    }
  });

  reviewForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const reviewText = document.getElementById('review-text').value || '';
    const messageEl = document.getElementById('review-form-message');
    if (selectedRating === 0) {
      messageEl.textContent = 'Please select a rating'; messageEl.style.color = 'red'; return;
    }
    const submitBtn = document.getElementById('submit-review-btn');
    submitBtn.disabled = true; submitBtn.textContent = 'Submitting...';

    try {
      await runTransaction(db, async (tx) => {
        const sellerRef = doc(db, 'users', recipientId);
        const sellerSnap = await tx.get(sellerRef);
        if (!sellerSnap.exists()) throw new Error('Seller profile missing');

        const oldTotal = sellerSnap.data().ratingTotal || 0;
        const oldCount = sellerSnap.data().reviewCount || 0;
        tx.update(sellerRef, {
          reviewCount: oldCount + 1,
          ratingTotal: oldTotal + selectedRating,
          averageRating: (oldTotal + selectedRating) / (oldCount + 1)
        });

        const reviewRef = doc(db, 'users', recipientId, 'reviews', currentUser.uid);
        tx.set(reviewRef, {
          rating: selectedRating,
          text: reviewText,
          reviewerId: currentUser.uid,
          timestamp: serverTimestamp()
        });
      });

      messageEl.textContent = 'Review submitted'; messageEl.style.color = 'green';
      setTimeout(()=> { reviewModal.style.display = 'none'; checkIfAlreadyReviewed(); }, 1200);
    } catch (err) {
      console.error('Review error:', err);
      messageEl.textContent = 'Could not submit review'; messageEl.style.color = 'red';
    } finally {
      submitBtn.disabled = false; submitBtn.textContent = 'Submit Review';
    }
  });
}

async function checkIfAlreadyReviewed() {
  try {
    const rev = await getDoc(doc(db, 'users', recipientId, 'reviews', currentUser.uid));
    if (rev.exists()) { reviewModalBtn.disabled = true; reviewModalBtn.textContent = 'Review Submitted'; }
    else { reviewModalBtn.disabled = false; reviewModalBtn.textContent = 'Leave a Review'; }
  } catch (err) {
    // ignore
  }
}

// helper imports used inside review functions
import { getDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { doc as docFn } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";