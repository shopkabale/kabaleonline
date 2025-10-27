/*
 * =================================================================
 * NEW GROUP CHAT SCRIPT
 * * Features:
 * - All features from your original 'group-chat.js' (replies, etc.)
 * - Authentication logic from your 'chat.js' (checks !user first)
 * - All imports consolidated from './firebase.js'
 * =================================================================
 */

// --- 1. CONSOLIDATED IMPORTS ---
// Import all necessary services and functions from your central firebase.js file
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
} from './firebase.js';

// --- 2. DOM ELEMENT SELECTION ---
const messageArea = document.getElementById('message-area');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const backButton = document.getElementById('back-button');

// Reply-to-message elements
const replyBanner = document.getElementById('reply-banner');
const replyToNameEl = document.getElementById('reply-to-name');
const replyToPreviewEl = document.getElementById('reply-to-preview');
const cancelReplyBtn = document.getElementById('cancel-reply-btn');

// --- 3. GLOBAL STATE VARIABLES ---
let currentUser = null; // Will be populated with { uid, name, profilePicUrl }
let unsubscribe = null; // To stop the message listener on unload
let replyingToMessage = null; // Will be populated with { id, sender, text }

// --- 4. AUTHENTICATION & INITIALIZATION ---
// This is the main entry point for the application, using the logic from chat.js
onAuthStateChanged(auth, async (user) => {

  // Step 1: Check for a logged-in user (from chat.js logic)
  if (!user) {
    console.warn('No user logged in. Redirecting to login...');
    window.location.href = '/login/';
    return; // Stop all execution
  }

  // Step 2: Check for email verification (required by your original logic)
  if (!user.emailVerified) {
    console.warn('User email is not verified. Redirecting to login ...');
    window.location.href = '/login/';
    return; // Stop all execution
  }

  // Step 3: Fetch the user's profile document (required for name/avatar)
  try {
    const userDoc = await getDoc(doc(db, "users", user.uid));

    if (userDoc.exists()) {
      // SUCCESS: User is logged in, verified, and has a profile.
      currentUser = {
        uid: user.uid,
        name: userDoc.data().name,
        profilePicUrl: userDoc.data().profilePicUrl
      };
      
      backButton.href = '/dashboard/'; // Set back button link

      // Start the application by listening for messages
      listenForMessages();

    } else {
      // User is authenticated but has no profile in Firestore.
      console.error('User profile document not found in Firestore. Redirecting...');
      window.location.href = '/login/';
    }
  } catch (error) {
    console.error('Error fetching user document:', error);
    // If we can't get the profile, the chat can't function.
    window.location.href = '/login/';
  }
});

// --- 5. CORE CHAT FUNCTIONS ---

/**
 * Sets up the real-time listener for new messages in the group chat.
 */
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

    // Scroll to the bottom after new messages are added
    setTimeout(() => {
      messageArea.scrollTop = messageArea.scrollHeight;
    }, 100);

  }, (error) => {
    console.error("Error fetching messages:", error);
    messageArea.innerHTML = `<p style="padding: 20px; text-align: center;">Error: Could not load messages.</p>`;
  });
}

/**
 * Creates and appends a new message bubble to the chat window.
 * @param {object} data - The message data from Firestore.
 */
function renderMessage(data) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message';

  const isOwnMessage = data.userId === currentUser.uid;
  if (isOwnMessage) {
    messageDiv.classList.add('own-message');
  }

  // Use a placeholder if avatar is missing
  const avatar = data.profilePicUrl || `https://placehold.co/45x45/10336d/a7c0e8?text=${(data.userName || 'U').charAt(0)}`;

  // Build the HTML for a quoted reply, if one exists
  let replyQuoteHTML = '';
  if (data.repliedToMessageId) {
    replyQuoteHTML = `
      <div class="reply-quote">
        <div class="reply-quote-sender">${data.repliedToSender || 'User'}</div>
        <div class="reply-quote-text">${data.repliedToText || '...'}</div>
      </div>
    `;
  }

  // Create the final message HTML
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

/**
 * Shows or hides the "Replying to..." banner based on state.
 */
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

/**
 * Resets the reply state and hides the banner.
 */
function cancelReply() {
    replyingToMessage = null;
    updateReplyUI();
}

// --- 6. EVENT LISTENERS ---

/**
 * Handles the chat form submission to send a new message.
 */
chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const messageText = messageInput.value.trim();

  // Ensure message is not empty and user is fully loaded
  if (messageText && currentUser) {
    
    // Create the new message object
    const newMessage = {
      text: messageText,
      userId: currentUser.uid,
      userName: currentUser.name,
      profilePicUrl: currentUser.profilePicUrl || '',
      createdAt: serverTimestamp()
    };

    // Add reply information if we are in reply-mode
    if (replyingToMessage) {
      newMessage.repliedToMessageId = replyingToMessage.id;
      newMessage.repliedToSender = replyingToMessage.sender;
      newMessage.repliedToText = replyingToMessage.text;
    }

    try {
      // Send the message to Firestore
      await addDoc(collection(db, "group-chat"), newMessage);
      messageInput.value = ''; // Clear the input
      cancelReply(); // Reset the reply state
    } catch (error) {
      console.error("Error sending message: ", error);
      // You could show an error to the user here
    }
  }
});

/**
 * Uses event delegation to listen for clicks on all reply buttons.
 */
messageArea.addEventListener('click', (e) => {
  const replyButton = e.target.closest('.reply-btn');
  if (replyButton) {
    // A reply button was clicked. Store its data.
    replyingToMessage = {
      id: replyButton.dataset.id,
      sender: replyButton.dataset.sender,
      text: replyButton.dataset.text
    };
    updateReplyUI(); // Show the banner
  }
});

/**
 * Handles clicking the "cancel" button on the reply banner.
 */
cancelReplyBtn.addEventListener('click', () => {
  cancelReply();
});

/**
 * Cleans up the Firestore listener when the user leaves the page.
 */
window.addEventListener('beforeunload', () => {
  if (unsubscribe) {
    unsubscribe();
  }
});
