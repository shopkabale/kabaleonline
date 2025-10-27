// --- CORRECTED: Import EVERYTHING from your local firebase.js setup file ---
import {
  auth,
  db,
  onAuthStateChanged,
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  limit
} from './firebase.js'; // Make sure this path is correct

// --- REMOVED: Redundant getAuth() and getFirestore() calls ---

const messageArea = document.getElementById('message-area');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const backButton = document.getElementById('back-button');

const replyBanner = document.getElementById('reply-banner');
const replyToNameEl = document.getElementById('reply-to-name');
const replyToPreviewEl = document.getElementById('reply-to-preview');
const cancelReplyBtn = document.getElementById('cancel-reply-btn');

let currentUser = null;
let unsubscribe = null;
let replyingToMessage = null;

// This function will handle the entire page logic
async function initializeChat() {
  onAuthStateChanged(auth, async (user) => {
    if (user && user.emailVerified) {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        currentUser = {
          uid: user.uid,
          name: userDoc.data().name,
          profilePicUrl: userDoc.data().profilePicUrl
        };
        backButton.href = 'dashboard.html';
        listenForMessages();
      } else {
        // User is authenticated but has no user profile document
        console.error("User document not found in Firestore.");
        window.location.href = '/login/'; // Or a profile setup page
      }
    } else {
      // User is not logged in or email is not verified
      window.location.href = '/login/';
    }
  });
}

function listenForMessages() {
  const messagesRef = collection(db, "group-chat");
  const q = query(messagesRef, orderBy("createdAt", "asc"), limit(100));

  unsubscribe = onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === "added") {
        const messageData = { id: change.doc.id, ...change.doc.data() };
        renderMessage(messageData);
      }
    });
    // Scroll to the bottom after messages are rendered
    setTimeout(() => {
      messageArea.scrollTop = messageArea.scrollHeight;
    }, 100);
  }, (error) => {
    console.error("Error fetching messages:", error);
    messageArea.innerHTML = `<p style="padding: 20px; text-align: center;">Error: Could not load messages.</p>`;
  });
}

function updateReplyUI() {
  if (replyingToMessage) {
    replyToNameEl.textContent = replyingToMessage.sender;
    replyToPreviewEl.textContent = replyingToMessage.text;
    replyBanner.style.display = 'block';
    messageInput.focus();
  } else {
    replyBanner.style.display = 'none';
  }
}

function renderMessage(data) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message';

  const isOwnMessage = data.userId === currentUser.uid;
  if (isOwnMessage) {
    messageDiv.classList.add('own-message');
  }

  const avatar = data.profilePicUrl || `https://placehold.co/45x45/10336d/a7c0e8?text=${(data.userName || 'U').charAt(0)}`;

  let replyQuoteHTML = '';
  if (data.repliedToMessageId) {
    replyQuoteHTML = `
      <div class="reply-quote">
        <div class="reply-quote-sender">${data.repliedToSender}</div>
        <div class="reply-quote-text">${data.repliedToText}</div>
      </div>
    `;
  }

  messageDiv.innerHTML = `
    <a href="profile.html?id=${data.userId}" class="message-profile-link">
        <img src="${avatar}" alt="${data.userName}" class="message-avatar">
    </a>
    <div class="message-content">
        <div>
            <a href="profile.html?id=${data.userId}" class="message-profile-link">
                <div class="message-sender">${data.userName}</div>
            </a>
            ${replyQuoteHTML}
            <p class="message-bubble">${data.text}</p>
        </div>
        <button class="reply-btn" data-id="${data.id}" data-sender="${data.userName}" data-text="${data.text}">
            <i class="fas fa-reply"></i>
        </button>
    </div>
  `;
  messageArea.appendChild(messageDiv);
}

chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const messageText = messageInput.value.trim();

  if (messageText && currentUser) {
    const newMessage = {
      text: messageText,
      userId: currentUser.uid,
      userName: currentUser.name,
      profilePicUrl: currentUser.profilePicUrl || '',
      createdAt: serverTimestamp()
    };

    if (replyingToMessage) {
      newMessage.repliedToMessageId = replyingToMessage.id;
      newMessage.repliedToSender = replyingToMessage.sender;
      newMessage.repliedToText = replyingToMessage.text;
    }

    try {
      await addDoc(collection(db, "group-chat"), newMessage);
      messageInput.value = '';
      replyingToMessage = null;
      updateReplyUI();
    } catch (error) {
      console.error("Error sending message: ", error);
    }
  }
});

messageArea.addEventListener('click', (e) => {
  const replyButton = e.target.closest('.reply-btn');
  if (replyButton) {
    replyingToMessage = {
      id: replyButton.dataset.id,
      sender: replyButton.dataset.sender,
      text: replyButton.dataset.text
    };
    updateReplyUI();
  }
});

cancelReplyBtn.addEventListener('click', () => {
  replyingToMessage = null;
  updateReplyUI();
});

window.addEventListener('beforeunload', () => {
  if (unsubscribe) {
    unsubscribe();
  }
});

// Run the main function
initializeChat();