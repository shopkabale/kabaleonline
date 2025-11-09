// =================================================================== //
//                                                                     //
//             KABALE ONLINE - GROUP CHAT SYSTEM                       //
//                   CHAT ROOM SCRIPT (chat.js)                        //
//                                                                     //
// =================================================================== //

import { auth, db } from '../firebase.js';
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

// --- DOM Elements ---
const messageArea = document.getElementById('message-area');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const backButton = document.getElementById('back-button');
const chatTitle = document.getElementById('chat-title');
const replyBanner = document.getElementById('reply-banner');
const replyToNameEl = document.getElementById('reply-to-name');
const replyToPreviewEl = document.getElementById('reply-to-preview');
const cancelReplyBtn = document.getElementById('cancel-reply-btn');

// NEW: Image Upload Elements
const imageUploadBtn = document.getElementById('image-upload-btn');
const imageUploadInput = document.getElementById('image-upload-input');

// --- Global State ---
let currentUser = null;
let currentGroupId = null;
let unsubscribe = null; 
let replyingToMessage = null;

// --- Main Initialization ---
async function initializeChat() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (!userDoc.exists()) {
                console.error("User document not found.");
                window.location.href = '/login/';
                return;
            }
            currentUser = {
                uid: user.uid,
                name: userDoc.data().name,
                profilePicUrl: userDoc.data().profilePicUrl
            };

            const urlParams = new URLSearchParams(window.location.search);
            currentGroupId = urlParams.get('groupId');

            if (!currentGroupId) {
                alert("Error: No group ID specified.");
                window.location.href = 'index.html'; // Back to group list
                return;
            }
            
            // Get group details to set title
            const groupDoc = await getDoc(doc(db, "groups", currentGroupId));
            if (groupDoc.exists()) {
                chatTitle.textContent = groupDoc.data().name;
            }
            
            backButton.href = 'index.html'; // Link back to the group list
            listenForMessages(currentGroupId);

        } else {
            window.location.href = '/login/';
        }
    });
}

function listenForMessages(groupId) {
    if (unsubscribe) unsubscribe(); 

    // Listen to the sub-collection for messages
    const messagesRef = collection(db, "groups", groupId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"), limit(100));

    unsubscribe = onSnapshot(q, (snapshot) => {
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

// --- This is YOUR reply UI logic ---
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

// --- MODIFIED: Renders both TEXT and IMAGE messages ---
function renderMessage(data) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';

    const isOwnMessage = data.userId === currentUser.uid;
    if (isOwnMessage) {
        messageDiv.classList.add('own-message');
    }

    const avatar = data.profilePicUrl || `https://placehold.co/45x45/10336d/a7c0e8?text=${(data.userName || 'U').charAt(0)}`;

    // 1. Check for Reply Quote
    let replyQuoteHTML = '';
    if (data.repliedToMessageId) {
        replyQuoteHTML = `
            <div class="reply-quote">
                <div class="reply-quote-sender">${data.repliedToSender}</div>
                <div class="reply-quote-text">${data.repliedToText}</div>
            </div>
        `;
    }

    // 2. Check for Message Type (Text vs Image)
    let messageBubbleHTML = '';
    if (data.type === 'image' && data.imageData) {
        // This is an image message
        messageBubbleHTML = `
            <p class="message-bubble message-image">
                <img src="${data.imageData}" alt="User image" loading="lazy">
            </p>
        `;
    } else {
        // This is a standard text message
        messageBubbleHTML = `<p class="message-bubble">${data.text}</p>`;
    }

    // 3. Render
    messageDiv.innerHTML = `
        <a href="../profile.html?id=${data.userId}" class="message-profile-link">
            <img src="${avatar}" alt="${data.userName}" class="message-avatar">
        </a>
        <div class="message-content">
            <div>
                <a href="../profile.html?id=${data.userId}" class="message-profile-link">
                    <div class="message-sender">${data.userName}</div>
                </a>
                ${replyQuoteHTML}
                ${messageBubbleHTML}
            </div>
            <button class="reply-btn" data-id="${data.id}" data-sender="${data.userName}" data-text="${data.text || 'Image'}">
                <i class="fas fa-reply"></i>
            </button>
        </div>
    `;
    messageArea.appendChild(messageDiv);
}

// --- MODIFIED: Form submit now handles TEXT messages ---
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const messageText = messageInput.value.trim();

    if (messageText && currentUser && currentGroupId) {
        const newMessage = {
            type: "text", // This is a text message
            text: messageText,
            userId: currentUser.uid,
            userName: currentUser.name,
            profilePicUrl: currentUser.profilePicUrl || '',
            createdAt: serverTimestamp() // For TTL auto-delete
        };

        if (replyingToMessage) {
            newMessage.repliedToMessageId = replyingToMessage.id;
            newMessage.repliedToSender = replyingToMessage.sender;
            newMessage.repliedToText = replyingToMessage.text;
        }

        try {
            await addDoc(collection(db, "groups", currentGroupId, "messages"), newMessage);
            messageInput.value = '';
            replyingToMessage = null;
            updateReplyUI();
        } catch (error) {
            console.error("Error sending message: ", error);
        }
    }
});

// --- NEW: Handle Image Upload Button ---
imageUploadBtn.addEventListener('click', () => {
    imageUploadInput.click(); // Open the file picker
});

imageUploadInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 500 * 1024) { // 500KB size limit
        alert("Image is too large. Please choose a file under 500KB.");
        return;
    }

    // Resize and convert to base64
    resizeAndSendImage(file);
    
    // Reset the input so you can send the same file again
    e.target.value = null;
});

// --- NEW: Image Resizing and Sending Logic ---
function resizeAndSendImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = async () => {
            // Resize logic
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 600;
            const MAX_HEIGHT = 600;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // Get the resized image as a base64 string
            const dataUrl = canvas.toDataURL(file.type, 0.8); // 80% quality
            
            // Send this dataUrl to Firestore
            sendImageMessage(dataUrl);
        }
        img.src = e.target.result;
    }
    reader.readAsDataURL(file);
}

async function sendImageMessage(base64ImageData) {
    if (!currentUser || !currentGroupId) return;

    const newMessage = {
        type: "image", // This is an image message
        imageData: base64ImageData, // The self-destructing data
        userId: currentUser.uid,
        userName: currentUser.name,
        profilePicUrl: currentUser.profilePicUrl || '',
        createdAt: serverTimestamp() // For TTL auto-delete
    };
    
    // Add reply info if it exists
    if (replyingToMessage) {
        newMessage.repliedToMessageId = replyingToMessage.id;
        newMessage.repliedToSender = replyingToMessage.sender;
        newMessage.repliedToText = replyingToMessage.text;
    }

    try {
        await addDoc(collection(db, "groups", currentGroupId, "messages"), newMessage);
        replyingToMessage = null;
        updateReplyUI();
    } catch (error) {
        console.error("Error sending image message: ", error);
    }
}


// --- This is your exact reply logic, unchanged ---
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

// --- Run the main function ---
initializeChat();