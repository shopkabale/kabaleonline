import { db, auth } from '../firebase.js';
import { collection, query, orderBy, getDocs, doc, getDoc, runTransaction, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";

const storiesList = document.getElementById('stories-list');
let currentUserId = null;

onAuthStateChanged(auth, (user) => {
    currentUserId = user ? user.uid : null;
    fetchAndDisplayStories();
});

// Centralized message handler for the stories page
const showMessage = (message, isError = false) => {
    const messageEl = document.getElementById('stories-message') || document.createElement('p');
    if (!document.getElementById('stories-message')) {
        messageEl.id = 'stories-message';
        storiesList.parentNode.insertBefore(messageEl, storiesList);
    }
    messageEl.textContent = message;
    messageEl.className = isError ? 'error-message' : 'success-message';
    messageEl.style.display = 'block';
    setTimeout(() => { messageEl.style.display = 'none'; }, 5000);
};

async function fetchAndDisplayStories() {
    storiesList.innerHTML = '<p>Loading stories...</p>';
    
    const storiesQuery = query(collection(db, 'stories'), orderBy('createdAt', 'desc'));

    try {
        const querySnapshot = await getDocs(storiesQuery);
        storiesList.innerHTML = '';

        if (querySnapshot.empty) {
            storiesList.innerHTML = '<p>No stories have been posted yet. Be the first!</p>';
            return;
        }
        
        const storiesPromises = querySnapshot.docs.map(async docSnapshot => {
            const story = docSnapshot.data();
            const storyId = docSnapshot.id;
            
            const authorDoc = await getDoc(doc(db, 'users', story.authorId));
            const authorName = authorDoc.exists() ? authorDoc.data().name : 'Anonymous';
            
            let isLiked = false;
            if (currentUserId) {
                const likeDoc = await getDoc(doc(db, `stories/${storyId}/likes`, currentUserId));
                isLiked = likeDoc.exists();
            }

            const storyElement = document.createElement('div');
            storyElement.className = 'story-card';
            storyElement.innerHTML = `
                <h2>${story.title}</h2>
                <div class="story-content">${story.content}</div>
                <div class="story-meta">
                    <p>By <a href="/profile.html?id=${story.authorId}">${authorName}</a></p>
                    <div class="likes-section">
                        <button class="like-btn ${isLiked ? 'liked' : ''}" data-story-id="${storyId}" data-author-id="${story.authorId}">❤️</button>
                        <span class="likes-count">${story.likeCount || 0}</span>
                    </div>
                </div>
            `;
            storiesList.appendChild(storyElement);
        });

        await Promise.all(storiesPromises);
        
        document.querySelectorAll('.like-btn').forEach(btn => {
            btn.addEventListener('click', handleLike);
        });

    } catch (error) {
        console.error("Error fetching stories:", error);
        showMessage('Failed to load stories. Please try refreshing the page.', true);
    }
}

async function handleLike(e) {
    const btn = e.target;
    if (!currentUserId) {
        showMessage('You must be logged in to like a story.', true);
        return;
    }
    
    if (btn.classList.contains('liked')) {
        showMessage('You have already liked this story.', true);
        return;
    }

    const storyId = btn.dataset.storyId;
    const authorId = btn.dataset.authorId;
    
    const storyRef = doc(db, 'stories', storyId);
    const likeRef = doc(db, `stories/${storyId}/likes`, currentUserId);
    const authorProfileRef = doc(db, 'users', authorId);

    try {
        await runTransaction(db, async (transaction) => {
            const storyDoc = await transaction.get(storyRef);
            if (!storyDoc.exists()) {
                throw new Error("Story does not exist!");
            }

            const newLikeCount = (storyDoc.data().likeCount || 0) + 1;
            
            transaction.set(likeRef, { likedAt: serverTimestamp() });
            
            transaction.update(storyRef, { likeCount: newLikeCount });

            // Ensure the 'reputation' field exists on the user document.
            // This is a simple fix. A more robust solution might use a Cloud Function.
            const authorProfileDoc = await transaction.get(authorProfileRef);
            if (authorProfileDoc.exists()) {
                const currentReputation = authorProfileDoc.data().reputation || 0;
                transaction.update(authorProfileRef, { reputation: currentReputation + 1 });
            }
        });
        
        btn.classList.add('liked');
        const countEl = btn.nextElementSibling;
        countEl.textContent = (parseInt(countEl.textContent) || 0) + 1;
        showMessage('You liked this story! ❤️', false);

    } catch (e) {
        console.error("Transaction failed: ", e);
        showMessage('Failed to like the story. Please check your network and try again.', true);
    }
}
