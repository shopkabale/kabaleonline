// --- MODIFIED ---
// I've imported 'app' from your firebase-init.js (or firebase.js)
// If your main file is just 'firebase.js', change this line.
import { app, db, auth } from '../firebase.js'; 
// --- END MODIFIED ---

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { 
    collection, 
    query, 
    where, 
    onSnapshot,
    getDoc,
    doc
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const myChatsList = document.getElementById('my-chats-list');

onAuthStateChanged(auth, (user) => {
    if (user) {
        listenForMyChats(user.uid);
    } else {
        // Not logged in, hide the private chats section
        document.getElementById('private-chats').style.display = 'none';
    }
});

function listenForMyChats(userId) {
    // This is the new database structure for tracking 1-to-1 chats
    // We query the "chats" collection
    // We look for any chat where the "users" array contains our ID
    const chatsRef = collection(db, "chats");
    const q = query(chatsRef, where("users", "array-contains", userId));

    onSnapshot(q, async (snapshot) => {
        myChatsList.innerHTML = ''; // Clear old list
        
        for (const chatDoc of snapshot.docs) {
            const chatData = chatDoc.data();
            const chatId = chatDoc.id;

            // Don't show the public chats here
            if (chatId === 'general' || chatId === 'support') {
                continue;
            }

            // Figure out who the *other* user is
            const otherUserId = chatData.users.find(uid => uid !== userId);
            let otherUserName = "Unknown User";

            if (otherUserId) {
                // Get the other user's name
                const userDoc = await getDoc(doc(db, "users", otherUserId));
                if (userDoc.exists()) {
                    otherUserName = userDoc.data().name || "Seller";
                }
            }
            
            // Get the last message (if it exists)
            const lastMessage = chatData.lastMessageText || "No messages yet";

            // Render the link to this chat
            renderChatLink(chatId, otherUserName, lastMessage);
        }

    }, (error) => {
        console.error("Error fetching user's chats:", error);
    });
}

function renderChatLink(chatId, chatName, lastMessage) {
    const link = document.createElement('a');
    link.className = 'chat-link';
    link.href = `chat.html?chatId=${chatId}`;
    
    link.innerHTML = `
        <i class="fas fa-user"></i>
        <div class="chat-link-info">
            <h4>${chatName}</h4>
            <p>${lastMessage}</p>
        </div>
    `;
    myChatsList.appendChild(link);
}