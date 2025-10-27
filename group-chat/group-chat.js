import { app } from './firebase-init.js';
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { 
    getFirestore, 
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

const auth = getAuth(app);
const db = getFirestore(app);

const messageArea = document.getElementById('message-area');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const backButton = document.getElementById('back-button');

// --- NEW: Elements for the Reply Banner ---
const replyBanner = document.getElementById('reply-banner');
const replyToNameEl = document.getElementById('reply-to-name');
const replyToPreviewEl = document.getElementById('reply-to-preview');
const cancelReplyBtn = document.getElementById('cancel-reply-btn');

let currentUser = null;
let unsubscribe = null; 
// --- NEW: State variable to track the message we are replying to ---
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
                 window.location.href = 'auth.html';
            }
        } else {
            window.location.href = 'auth.html';
        }
    });
}

function listenForMessages() {
    const messagesRef = collection(db, "group-chat");
    const q = query(messagesRef, orderBy("createdAt", "asc"), limit(100));

    unsubscribe = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                // --- MODIFIED: Pass the full document data, including its ID ---
                const messageData = { id: change.doc.id, ...change.doc.data() };
                renderMessage(messageData);
            }
        });
        setTimeout(() => {
            messageArea.scrollTop = messageArea.scrollHeight;
        }, 100);
    }, (error) => {
        console.error("Error fetching messages:", error);
        messageArea.innerHTML = `<p style="padding: 20px; text-align: center;">Error: Could not load messages.</p>`;
    });
}

// --- NEW: Function to show or hide the reply banner ---
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

    // --- NEW: Check if this message is a reply and build the quote HTML ---
    let replyQuoteHTML = '';
    if (data.repliedToMessageId) {
        replyQuoteHTML = `
            <div class="reply-quote">
                <div class="reply-quote-sender">${data.repliedToSender}</div>
                <div class="reply-quote-text">${data.repliedToText}</div>
            </div>
        `;
    }

    // --- MODIFIED: The inner HTML now includes the reply functionality ---
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
        // --- MODIFIED: Create the message object and add reply info if it exists ---
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
            // --- NEW: Reset reply state after sending ---
            replyingToMessage = null;
            updateReplyUI();
        } catch (error) {
            console.error("Error sending message: ", error);
        }
    }
});

// --- NEW: Event listener for the whole message area to catch clicks on reply buttons ---
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

// --- NEW: Event listener for the cancel reply button ---
cancelReplyBtn.addEventListener('click', () => {
    replyingToMessage = null;
    updateReplyUI();
});

window.addEventListener('beforeunload', () => {
    if (unsubscribe) {
        unsubscribe();
    }
});

// --- Run the main function ---
initializeChat();