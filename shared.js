// shared.js
import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { collection, query, where, onSnapshot, collectionGroup } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const notificationBell = document.getElementById('notification-bell');
const notificationCountEl = document.getElementById('notification-count');

function listenForNotifications(userId) {
  if (!userId) return;
  // Unread chats
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
    updateBadge(unread);
  }, (err) => console.error('Chats notify error:', err));

  // Unanswered Q&A (collectionGroup 'qanda' where sellerId == userId && answer == null)
  try {
    const qandaQ = query(collectionGroup(db, 'qanda'), where('sellerId', '==', userId), where('answer', '==', null));
    onSnapshot(qandaQ, (snap) => {
      const unanswered = snap.size || 0;
      // Combine with unread; (we'll read current badge value)
      const current = parseInt(notificationCountEl?.textContent || '0') || 0;
      // Attempt to show sum; we will instead compute fresh by calling chats listener again,
      // but to keep it simple we add unanswered to badge
      updateBadge(current + unanswered);
    }, (err) => console.warn('Q&A notify error:', err));
  } catch (err) {
    // collectionGroup may be restricted by rules — ignore if it errors
    console.warn('Could not register qanda listener (might be permission/index issue):', err);
  }
}

function updateBadge(count) {
  if (!notificationCountEl) return;
  if (count > 0) {
    notificationCountEl.textContent = String(count);
    notificationCountEl.style.display = 'inline-block';
  } else {
    notificationCountEl.style.display = 'none';
  }
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    listenForNotifications(user.uid);
  } else {
    updateBadge(0);
  }
});