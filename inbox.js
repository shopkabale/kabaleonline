import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { collection, query, where, getDocs, orderBy, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const conversationList = document.getElementById('conversation-list');

onAuthStateChanged(auth, user => {
    if (user) {
        loadConversations(user.uid);
    } else {
        conversationList.innerHTML = `
            <div style="padding: 20px; text-align: center;">
                <h2>Access Denied</h2>
                <p>Please <a href="/sell/">log in</a> to view your inbox.</p>
            </div>
        `;
    }
});

async function loadConversations(currentUserId) {
    try {
        const chatsRef = collection(db, 'chats');
        const q = query(
            chatsRef,
            where('users', 'array-contains', currentUserId),
            orderBy('lastUpdated', 'desc')
        );

        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            conversationList.innerHTML = '<p style="padding: 20px; text-align: center;">You have no conversations yet.</p>';
            return;
        }

        conversationList.innerHTML = ''; // Clear the loading message

        for (const docSnap of querySnapshot.docs) {
            const chat = docSnap.data();
            const chatId = docSnap.id;

            // Find the other user's ID
            const recipientId = chat.users.find(id => id !== currentUserId);
            if (!recipientId) continue;

            // Fetch the other user's name
            const userDoc = await getDoc(doc(db, 'users', recipientId));
            const recipientName = userDoc.exists() ? userDoc.data().name : 'User';
            
            const conversationLink = document.createElement('a');
            conversationLink.href = `/chat.html?chatId=${chatId}&recipientId=${recipientId}`;
            conversationLink.className = 'conversation-item';
            
            conversationLink.innerHTML = `
                <div class="user-name">${recipientName}</div>
                <p class="last-message">${chat.lastMessage || '...'}</p>
            `;
            
            conversationList.appendChild(conversationLink);
        }

    } catch (error) {
        console.error("Error loading conversations: ", error);
        conversationList.innerHTML = '<p style="padding: 20px; text-align: center; color: red;">Could not load conversations. Please try again later.</p>';
    }
}
