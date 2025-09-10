import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { doc, getDoc, collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const chatRecipientName = document.getElementById('chat-recipient-name');
const chatMessages = document.getElementById('chat-messages');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');

const urlParams = new URLSearchParams(window.location.search);
const chatId = urlParams.get('chatId');
const recipientId = urlParams.get('recipientId');

let currentUser;

onAuthStateChanged(auth, async (user) => {
    if (user && chatId && recipientId) {
        currentUser = user;
        
        const recipientDoc = await getDoc(doc(db, 'users', recipientId));
        const recipientName = recipientDoc.exists() ? recipientDoc.data().name : 'User';
        chatRecipientName.textContent = recipientName;

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
        
        // Mark chat as read when opened
        markChatAsRead();

    } else {
        document.body.innerHTML = '<h1>Access Denied</h1><p>You must be <a href="/sell/">logged in</a> to chat.</p>';
    }
});

chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const messageText = messageInput.value.trim();
    if (messageText === '' || !currentUser) return;

    messageInput.value = '';

    try {
        const messagesRef = collection(db, `chats/${chatId}/messages`);
        await addDoc(messagesRef, {
            text: messageText,
            senderId: currentUser.uid,
            recipientId: recipientId,
            timestamp: serverTimestamp()
        });

        const chatRef = doc(db, 'chats', chatId);
        await setDoc(chatRef, {
            users: [currentUser.uid, recipientId],
            lastMessage: messageText,
            lastUpdated: serverTimestamp(),
            lastSenderId: currentUser.uid, // Track who sent the last message
            lastRead: { [currentUser.uid]: serverTimestamp() } // Mark as read for the sender
        }, { merge: true });

    } catch (error) {
        console.error("Error sending message: ", error);
    }
});

// NEW function to mark the chat as read for the current user
async function markChatAsRead() {
    if (!currentUser) return;
    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
        [`lastRead.${currentUser.uid}`]: serverTimestamp()
    });
}
