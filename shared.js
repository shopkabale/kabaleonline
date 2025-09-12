// shared.js
import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { collection, query, where, onSnapshot, collectionGroup } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const notificationBell = document.getElementById('notification-bell');
const notificationCountEl = document.getElementById('notification-count');

let unreadChats = 0;
let unansweredQanda = 0;

function updateBadge() {
  const total = unreadChats + unansweredQanda;
  if (!notificationCountEl) return;
  if (total > 0) {
    notificationCountEl.textContent = String(total);
    notificationCountEl.style.display = 'inline-block';
  } else {
    notificationCountEl.style.display = 'none';
  }
}

function listenForNotifications(userId) {
  if (!userId) return;

  // 🔹 Unread chats
  const chatsQ = query(collection(db, 'chats'), where('users', 'array-contains', userId));
  onSnapshot(chatsQ, (snap) => {
    let unread = 0;
    snap.forEach(d => {
      const c = d.data();
      if (c.lastUpdated && c.lastSenderId !== userId) {
        const lastReadForMe = c.lastRead?.[userId];
        const lastReadMillis = lastReadForMe?.toMillis?.() || 0;
        const lastUpdatedMillis = c.lastUpdated?.toMillis?.() || 0;
        if (lastUpdatedMillis > lastReadMillis) unread++;
      }
    });
    unreadChats = unread;
    updateBadge();
  }, (err) => console.error('Chats notify error:', err));

  // 🔹 Unanswered Q&A (collectionGroup 'qanda' where sellerId == userId && answer == null)
  try {
    const qandaQ = query(
      collectionGroup(db, 'qanda'),
      where('sellerId', '==', userId),
      where('answer', '==', null)
    );
    onSnapshot(qandaQ, (snap) => {
      unansweredQanda = snap.size || 0;
      updateBadge();
    }, (err) => console.warn('Q&A notify error:', err));
  } catch (err) {
    console.warn('Could not register qanda listener (might be permission/index issue):', err);
  }
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    listenForNotifications(user.uid);
  } else {
    unreadChats = 0;
    unansweredQanda = 0;
    updateBadge();
  }
});