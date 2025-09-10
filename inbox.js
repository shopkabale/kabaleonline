import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { collection, query, where, getDocs, orderBy, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const conversationList = document.getElementById('conversation-list');

onAuthStateChanged(auth, user => {
    if (user) {
        loadConversations(user.uid);
    } else {
        conversationList.innerHTML = `<div style="padding: 20px; text-align: center;"><h2>Access Denied</h2><p>Please <a href="/sell/">log in</a> to view your inbox.</p></div>`;
    }
});

async function loadConversations(currentUserId) {
    try {
        const chatsRef = collection(db, 'chats');
        const q = query(chatsRef, where('users', 'array-contains', currentUserId), orderBy('lastUpdated', 'desc'));

        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            conversationList.innerHTML = '<p style="padding: 20px; text-align: center;">You have no conversations yet.</p>';
            return;
        }

        conversationList.innerHTML = ''; 

        for (const docSnap of querySnapshot.docs) {
            const chat = docSnap.data();
            const chatId = docSnap.id;
            const recipientId = chat.users.find(id => id !== currentUserId);
            if (!recipientId) continue;

            // Check if message is unread
            const isUnread = chat.lastUpdated && (!chat.lastRead || !chat.lastRead[currentUserId] || chat.lastRead[currentUserId].toDate() < chat.lastUpdated.toDate()) && (chat.lastSenderId !== currentUserId);

            const userDoc = await getDoc(doc(db, 'users', recipientId));
            const recipientName = userDoc.exists() ? userDoc.data().name : 'User';
            
            const conversationLink = document.createElement('a');
            conversationLink.href = `/chat.html?chatId=${chatId}&recipientId=${recipientId}`;
            conversationLink.className = 'conversation-item';
            
            conversationLink.innerHTML = `
                <div class="user-name">${recipientName} ${isUnread ? '<span class="unread-dot"></span>' : ''}</div>
                <p class="last-message" style="${isUnread ? 'font-weight: bold; color: #333;' : ''}">
                    ${chat.lastSenderId === currentUserId ? 'You: ' : ''}${chat.lastMessage || '...'}
                </p>
            `;
            
            conversationList.appendChild(conversationLink);
        }

    } catch (error) {
        console.error("Error loading conversations: ", error);
        conversationList.innerHTML = '<p style="padding: 20px; text-align: center; color: red;">Could not load conversations.</p>';
    }
}

// Add CSS for the unread dot
const style = document.createElement('style');
style.textContent = `
    .unread-dot {
        height: 10px;
        width: 10px;
        background-color: #007bff;
        border-radius: 50%;
        display: inline-block;
        margin-left: 8px;
    }
`;
document.head.appendChild(style);
