import { auth, db } from './firebase.js'; // MODIFIED: Added db import
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
// NEW: Added all necessary Firestore imports
import { collection, query, where, onSnapshot, collectionGroup } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- NEW: Notification Listener Function ---
// This function sets up real-time listeners for new messages and questions.
const listenForNotifications = (userId) => {
    const notificationBell = document.getElementById('notification-bell');
    const notificationCount = document.getElementById('notification-count');
    if (!notificationBell || !notificationCount) return;

    let unreadMessages = 0;
    let unansweredQuestions = 0;

    // Listener for Unread Messages
    const chatsQuery = query(
        collection(db, 'chats'),
        where('users', 'array-contains', userId)
    );

    onSnapshot(chatsQuery, (snapshot) => {
        let count = 0;
        snapshot.forEach(doc => {
            const chat = doc.data();
            if (chat.lastUpdated && (!chat.lastRead || !chat.lastRead[userId] || chat.lastRead[userId].toDate() < chat.lastUpdated.toDate())) {
                if(chat.lastSenderId !== userId) {
                    count++;
                }
            }
        });
        unreadMessages = count;
        updateTotalCount();
    });

    // Listener for Unanswered Questions
    const questionsQuery = query(
        collectionGroup(db, 'qanda'),
        where('sellerId', '==', userId),
        where('answer', '==', null)
    );

    onSnapshot(questionsQuery, (snapshot) => {
        unansweredQuestions = snapshot.size;
        updateTotalCount();
    });

    function updateTotalCount() {
        const total = unreadMessages + unansweredQuestions;
        if (total > 0) {
            notificationCount.textContent = total;
            notificationCount.style.display = 'block';
        } else {
            notificationCount.style.display = 'none';
        }
    }
};

// --- Your Existing Header Setup Function ---
const setupDynamicHeader = () => {
    const loginBtn = document.getElementById('login-btn');
    const postBtn = document.getElementById('post-btn');
    const dashboardBtn = document.getElementById('dashboard-btn');

    // Login/Logout Button Logic
    if (loginBtn && postBtn && dashboardBtn) {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                // User is signed in
                loginBtn.style.display = 'none';
                postBtn.style.display = 'none';
                dashboardBtn.style.display = 'flex';
                
                // MODIFIED: Call the notification listener when the user is logged in
                listenForNotifications(user.uid);

            } else {
                // User is signed out
                loginBtn.style.display = 'flex';
                postBtn.style.display = 'flex';
                dashboardBtn.style.display = 'none';
            }
        });
    }

    // Active Page Button Logic
    const urlParams = new URLSearchParams(window.location.search);
    const listingType = urlParams.get('type');
    const path = window.location.pathname;

    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => link.classList.remove('active'));

    if (path === '/' || path === '/index.html') {
        if (listingType === 'service') {
            document.getElementById('services-btn')?.classList.add('active');
        } else {
            document.getElementById('items-btn')?.classList.add('active');
        }
    } else if (path.startsWith('/requests')) {
        document.getElementById('request-btn')?.classList.add('active');
    } else if (path.startsWith('/blog')) {
        document.getElementById('tips-btn')?.classList.add('active');
    }
};

document.addEventListener('DOMContentLoaded', setupDynamicHeader);
