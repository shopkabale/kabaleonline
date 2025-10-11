import { app } from './firebase-init.js';
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { collection, query, where, onSnapshot, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const auth = getAuth(app);
const db = getFirestore(app);

const conversationList = document.getElementById('conversation-list');

onAuthStateChanged(auth, user => {
  if (!user || !user.emailVerified) {
    window.location.href = 'auth.html';
    return;
  }
  loadConversations(user.uid);
});

function loadConversations(currentUserId) {
  const convosRef = collection(db, 'conversations');
  // This simple query works because we will sort by date in our code.
  const q = query(convosRef, where('participants', 'array-contains', currentUserId));
  
  conversationList.innerHTML = '<p style="padding:20px;text-align:center;">Loading conversations...</p>';

  onSnapshot(q, async (snapshot) => {
    if (snapshot.empty) {
      conversationList.innerHTML = '<p style="padding:20px;text-align:center;">You have no conversations yet.</p>';
      return;
    }

    // Map and sort the conversations in JavaScript, just like your professional example.
    const conversations = snapshot.docs.map(d => ({ id: d.id, data: d.data() }))
      .sort((a,b) => (b.data.lastMessageTimestamp?.toMillis?.() || 0) - (a.data.lastMessageTimestamp?.toMillis?.() || 0));

    // Use Promise.all to fetch all user data efficiently.
    const conversationNodes = await Promise.all(conversations.map(async (convoData) => {
      const convo = convoData.data;
      const convoId = convoData.id;
      const recipientId = (convo.participants || []).find(id => id !== currentUserId);

      if (!recipientId) return null; // Skip if something is wrong with the participants

      let recipientName = 'User';
      let recipientAvatar = 'https://placehold.co/55x55';

      const userDoc = await getDoc(doc(db, 'users', recipientId));
      if (userDoc.exists()) {
          const userData = userDoc.data();
          recipientName = userData.name || 'User';
          recipientAvatar = userData.profilePicUrl || `https://placehold.co/55x55/10336d/a7c0e8?text=${recipientName.charAt(0)}`;
      }

      // Check for unread status (logic adapted from your example)
      const lastReadTime = convo.lastRead?.[currentUserId]?.toMillis?.() || 0;
      const lastUpdatedTime = convo.lastMessageTimestamp?.toMillis?.() || 0;
      const isUnread = lastUpdatedTime > lastReadTime && convo.lastSenderId !== currentUserId;
      
      const a = document.createElement('a');
      a.href = `chat.html?recipientId=${recipientId}`;
      a.className = 'conversation-item' + (isUnread ? ' unread' : '');
      a.innerHTML = `
        <img src="${recipientAvatar}" alt="${recipientName}" class="avatar">
        <div class="details">
            <div class="header-row">
                <span class="user-name">${recipientName} ${isUnread ? '<span class="unread-dot"></span>' : ''}</span>
                <span class="timestamp">${convo.lastMessageTimestamp ? new Date(convo.lastMessageTimestamp.toMillis()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</span>
            </div>
            <p class="last-message">${convo.lastSenderId === currentUserId ? 'You: ' : ''}${convo.lastMessageText || 'No messages yet'}</p>
        </div>
      `;
      return a;
    }));

    conversationList.innerHTML = '';
    conversationNodes.filter(node => node).forEach(node => conversationList.appendChild(node));

  }, err => {
    console.error('Conversation listener failed (check Firestore indexes):', err);
    conversationList.innerHTML = '<p style="padding:20px;text-align:center;color:red;">Could not load conversations.</p>';
  });
}