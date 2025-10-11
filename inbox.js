// inbox.js

import { auth, db } from "./firebase.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";

import { collection, query, where, onSnapshot, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";



const conversationList = document.getElementById('conversation-list');



onAuthStateChanged(auth, user => {

  if (!user) {

    conversationList.innerHTML = `<div style="padding:20px;text-align:center;"><h2>Access Denied</h2><p>Please <a href="/sell/">log in</a> to view your inbox.</p></div>`;

    return;

  }

  loadConversations(user.uid);

});



function loadConversations(currentUserId) {

  const chatsRef = collection(db, 'chats');

  const q = query(chatsRef, where('users', 'array-contains', currentUserId));



  onSnapshot(q, async (snapshot) => {

    if (snapshot.empty) {

      conversationList.innerHTML = '<p style="padding:20px;text-align:center;">You have no conversations yet.</p>';

      return;

    }



    const chats = snapshot.docs.map(d => ({ id: d.id, data: d.data() }))

      .sort((a,b) => (b.data.lastUpdated?.toMillis?.() || 0) - (a.data.lastUpdated?.toMillis?.() || 0));



    const nodes = await Promise.all(chats.map(async (c) => {

      const chat = c.data;

      const chatId = c.id;

      const recipientId = (chat.users || []).find(id => id !== currentUserId) || null;



      let recipientName = 'User';

      if (recipientId) {

        const userDoc = await getDoc(doc(db, 'users', recipientId));

        if (userDoc.exists()) recipientName = userDoc.data().name || 'User';

      }



      const lastReadTime = chat.lastRead?.[currentUserId]?.toMillis?.() || 0;

      const lastUpdatedTime = chat.lastUpdated?.toMillis?.() || 0;



      const isUnread = chat.lastUpdated &&

        lastReadTime < lastUpdatedTime &&

        chat.lastSenderId !== currentUserId;



      const a = document.createElement('a');

      a.href = `/chat.html?chatId=${encodeURIComponent(chatId)}&recipientId=${encodeURIComponent(recipientId)}`;

      a.className = 'conversation-item' + (isUnread ? ' unread' : '');

      a.innerHTML = `

        <div style="flex:1">

          <div class="user-name">${recipientName} ${isUnread ? '<span class="unread-dot"></span>' : ''}</div>

          <p class="last-message">${chat.lastSenderId === currentUserId ? 'You: ' : ''}${chat.lastMessage || 'No messages yet'}</p>

        </div>

      `;

      return a;

    }));



    conversationList.innerHTML = '';

    nodes.forEach(n => conversationList.appendChild(n));

  }, err => {

    console.error('Conversation listener failed:', err);

    conversationList.innerHTML = '<p style="padding:20px;text-align:center;color:red;">Could not load conversations.</p>';

  });

}