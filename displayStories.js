import { db, auth } from '../firebase.js';
import { collection, query, orderBy, getDocs, doc, getDoc, runTransaction, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";

const storiesList = document.getElementById('stories-list');
let currentUserId = null;

onAuthStateChanged(auth, (user) => {
    currentUserId = user ? user.uid : null;
    fetchAndDisplayStories();
});

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
            
            // Get author's name
            const authorDoc = await getDoc(doc(db, 'users', story.authorId));
            const authorName = authorDoc.exists() ? authorDoc.data().name : 'Anonymous';
            
            // Check if current user has already liked this story
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
        
        // Attach event listeners after all elements are on the page
        document.querySelectorAll('.like-btn').forEach(btn => {
            btn.addEventListener('click', handleLike);
        });

    } catch (error) {
        console.error("Error fetching stories:", error);
        storiesList.innerHTML = '<p>Failed to load stories.</p>';
    }
}

async function handleLike(e) {
    const btn = e.target;
    if (!currentUserId) {
        alert("Please log in to like a story.");
        return;
    }
    
    if (btn.classList.contains('liked')) {
        alert("You've already liked this story.");
        return;
    }

    const storyId = btn.dataset.storyId;
    const authorId = btn.dataset.authorId;
    
    // Use a transaction for safe, atomic updates
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
            
            // 1. Add the like document
            transaction.set(likeRef, { likedAt: serverTimestamp() });
            
            // 2. Increment the like count on the story
            transaction.update(storyRef, { likeCount: newLikeCount });

            // 3. Increment the author's reputation score on their user profile
            transaction.update(authorProfileRef, { reputation: newLikeCount });
            
            // Note: The reputation score here is just the like count of a single story.
            // For a total reputation, you would need to sum likes from all stories.
            // A Cloud Function is a better approach for this to avoid race conditions.
        });
        
        // Update UI after successful transaction
        btn.classList.add('liked');
        const countEl = btn.nextElementSibling;
        countEl.textContent = (parseInt(countEl.textContent) || 0) + 1;

    } catch (e) {
        console.error("Transaction failed: ", e);
        alert("Failed to like the story. Please try again.");
    }
}
