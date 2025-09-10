import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { doc, getDoc, collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, setDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

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
        
        // Fetch recipient's name for the header
        const recipientDoc = await getDoc(doc(db, 'users', recipientId));
        const recipientName = recipientDoc.exists() ? recipientDoc.data().name : 'User';
        chatRecipientName.textContent = recipientName;

        // Listen for new messages in real-time
        const messagesRef = collection(db, `chats/${chatId}/messages`);
        const q = query(messagesRef, orderBy('timestamp', 'desc'));

        onSnapshot(q, (snapshot) => {
            chatMessages.innerHTML = '';
            snapshot.forEach(doc => {
                const message = doc.data();
                const messageDiv = document.createElement('div');
                messageDiv.classList.add('message');
                messageDiv.textContent = message.text;

                if (message.senderId === currentUser.uid) {
                    messageDiv.classList.add('sent');
                } else {
                    messageDiv.classList.add('received');
                }
                chatMessages.appendChild(messageDiv);
            });
        });

    } else {
        document.body.innerHTML = '<h1>Access Denied</h1><p>You must be <a href="/sell/">logged in</a> to chat.</p>';
    }
});

chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const messageText = messageInput.value.trim();
    if (messageText === '' || !currentUser) return;

    const originalValue = messageInput.value;
    messageInput.value = '';
    messageInput.disabled = true;

    try {
        // Add the message to the subcollection
        const messagesRef = collection(db, `chats/${chatId}/messages`);
        await addDoc(messagesRef, {
            text: messageText,
            senderId: currentUser.uid,
            recipientId: recipientId,
            timestamp: serverTimestamp()
        });

        // Update the main chat document with last message info for the inbox
        const chatRef = doc(db, 'chats', chatId);
        await setDoc(chatRef, {
            lastMessage: messageText,
            lastUpdated: serverTimestamp(),
            users: [currentUser.uid, recipientId]
        }, { merge: true }); // merge: true prevents overwriting existing fields

    } catch (error) {
        console.error("Error sending message: ", error);
        alert("Message could not be sent.");
        messageInput.value = originalValue; // Restore message on failure
    } finally {
        messageInput.disabled = false;
        messageInput.focus();
    }
});
