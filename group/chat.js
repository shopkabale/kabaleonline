// --- MODIFIED ---
// I've imported 'app' from your firebase-init.js (or firebase.js)
// If your main file is just 'firebase.js', change this line.
import { app, db, auth } from '../firebase.js'; 
// --- END MODIFIED ---

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { 
    collection, 
    query, 
    orderBy, 
    onSnapshot, 
    addDoc, 
    serverTimestamp,
    doc,
    getDoc,
    limit
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- DOM Elements (as you defined) ---
const messageArea = document.getElementById('message-area');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const backButton = document.getElementById('back-button');
const replyBanner = document.getElementById('reply-banner');
const replyToNameEl = document.getElementById('reply-to-name');
const replyToPreviewEl = document.getElementById('reply-to-preview');
const cancelReplyBtn = document.getElementById('cancel-reply-btn');
const chatTitle = document.getElementById('chat-title'); // Added this

// --- MODIFIED: Global state to hold user and current chat room ---
const state = {
    currentUser: null,
    chatId: null, // This will hold the ID of the room (e.g., "general")
    unsubscribe: null,
    replyingToMessage: null
};
// --- END MODIFIED ---


// This function will handle the entire page logic
async function initializeChat() {
    onAuthStateChanged(auth, async (user) => {
        if (user) { // We don't need user.emailVerified for chat
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                state.currentUser = {
                    uid: user.uid,
                    name: userDoc.data().name,
                    profilePicUrl: userDoc.data().profilePicUrl
                };

                // --- MODIFIED: Get the chat ID from the URL ---
                const urlParams = new URLSearchParams(window.location.search);
                state.chatId = urlParams.get('chatId');

                if (!state.chatId) {
                    // If no ID is provided, default to the "general" chat room.
                    state.chatId = "general";
                }
                
                // Set the chat title
                chatTitle.textContent = state.chatId.charAt(0).toUpperCase() + state.chatId.slice(1) + " Chat";
                backButton.href = 'chat-list.html'; // Link back to the list
                
                // Start listening to the specific chat room
                listenForMessages(state.chatId);
                // --- END MODIFIED ---

            } else {
                 console.error("User document not found.");
                 window.location.href = '/login/'; // Go to your login page
            }
        } else {
            window.location.href = '/login/'; // Go to your login page
        }
    });
}

function listenForMessages(chatId) {
    if (state.unsubscribe) {
        state.unsubscribe(); // Stop listening to any old chat
    }

    // --- MODIFIED: The path is now dynamic ---
    // This new structure is: /chats/{chatId}/messages/{messageId}
    // This is much more scalable than one giant "group-chat" collection.
    const messagesRef = collection(db, "chats", chatId, "messages");
    // --- END MODIFIED ---
    
    const q = query(messagesRef, orderBy("createdAt", "asc"), limit(100));

    state.unsubscribe = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                const messageData = { id: change.doc.id, ...change.doc.data() };
                renderMessage(messageData);
            }
        });
        // Scroll to bottom
        setTimeout(() => {
            messageArea.scrollTop = messageArea.scrollHeight;
        }, 100);
    }, (error) => {
        console.error("Error fetching messages:", error);
        messageArea.innerHTML = `<p style="padding: 20px; text-align: center;">Error: Could not load messages.</p>`;
    });
}

// --- NEW: Function to show or hide the reply banner ---
// (Your existing logic, just moved into a function)
function updateReplyUI() {
    if (state.replyingToMessage) {
        replyToNameEl.textContent = state.replyingToMessage.sender;
        replyToPreviewEl.textContent = state.replyingToMessage.text;
        replyBanner.style.display = 'block';
        messageInput.focus();
    } else {
        replyBanner.style.display = 'none';
    }
}

// --- This is your exact renderMessage function, unchanged ---
function renderMessage(data) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';

    const isOwnMessage = data.userId === state.currentUser.uid;
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

// --- MODIFIED: Form submit now sends to the dynamic chat ID ---
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const messageText = messageInput.value.trim();

    // Check for both user and the chat ID
    if (messageText && state.currentUser && state.chatId) {
        const newMessage = {
            text: messageText,
            userId: state.currentUser.uid,
            userName: state.currentUser.name,
            profilePicUrl: state.currentUser.profilePicUrl || '',
            createdAt: serverTimestamp()
        };

        if (state.replyingToMessage) {
            newMessage.repliedToMessageId = state.replyingToMessage.id;
            newMessage.repliedToSender = state.replyingToMessage.sender;
            newMessage.repliedToText = state.replyingToMessage.text;
        }

        try {
            // --- MODIFIED: Send message to the correct sub-collection ---
            await addDoc(collection(db, "chats", state.chatId, "messages"), newMessage);
            // --- END MODIFIED ---
            
            messageInput.value = '';
            state.replyingToMessage = null;
            updateReplyUI();
        } catch (error) {
            console.error("Error sending message: ", error);
        }
    }
});
// --- END MODIFIED ---

// --- This is your exact reply logic, unchanged ---
messageArea.addEventListener('click', (e) => {
    const replyButton = e.target.closest('.reply-btn');
    if (replyButton) {
        state.replyingToMessage = {
            id: replyButton.dataset.id,
            sender: replyButton.dataset.sender,
            text: replyButton.dataset.text
        };
        updateReplyUI();
    }
});

cancelReplyBtn.addEventListener('click', () => {
    state.replyingToMessage = null;
    updateReplyUI();
});

window.addEventListener('beforeunload', () => {
    if (state.unsubscribe) {
        state.unsubscribe();
    }
});

// --- Run the main function ---
initializeChat();