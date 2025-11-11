/*
 * post.js
 * This file loads and displays a single blog post.
 * - Correctly loads by EITHER post ID or slug.
 * - Saves "likes" to the database.
 */

// Post State
let postState = {
    post: null,
    isLiked: false,
    likeCount: 0,
    isUpdatingLike: false // Prevents spam-clicking
};

// DOM Elements
const postElements = {
    loading: document.getElementById('postLoading'),
    blogPost: document.getElementById('blogPost'),
    errorState: document.getElementById('errorState'),
    relatedPosts: document.getElementById('relatedPosts'),

    // Content elements
    postCategory: document.getElementById('postCategory'),
    postTitle: document.getElementById('postTitle'),
    postAuthor: document.getElementById('postAuthor'),
    postDate: document.getElementById('postDate'),
    postReadTime: document.getElementById('postReadTime'),
    postViews: document.getElementById('postViews'),
    featuredImageContainer: document.getElementById('featuredImageContainer'),
    postFeaturedImage: document.getElementById('postFeaturedImage'),
    postContent: document.getElementById('postContent'),
    postTagsContainer: document.getElementById('postTagsContainer'),
    postTags: document.getElementById('postTags'),
    likeIcon: document.getElementById('likeIcon'),
    likeCount: document.getElementById('likeCount'),
    relatedGrid: document.getElementById('relatedGrid')
};

/**
 * Main function to load the blog post
 */
async function loadBlogPost() {
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('id');
    const postSlug = urlParams.get('slug');

    let fetchUrl = '';

    // **FIX: Check for both ID and Slug**
    if (postId) {
        fetchUrl = `/.netlify/functions/get-blog-post?id=${postId}`;
    } else if (postSlug) {
        fetchUrl = `/.netlify/functions/get-blog-post?slug=${postSlug}`;
    } else {
        // No id or slug, show error
        showErrorState();
        return;
    }

    try {
        const response = await fetch(fetchUrl);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Post not found');
        }

        postState.post = data.post;
        postState.likeCount = data.post.likes || 0;
        
        // Check if user has liked this post before
        checkLikeStatus();
        
        renderPost();
        renderRelatedPosts(data.relatedPosts);
        updatePageMetadata();

    } catch (error) {
        console.error('Error loading blog post:', error);
        showErrorState();
    }
}

/**
 * Renders the main post content
 */
function renderPost() {
    if (!postState.post) return;

    const { post } = postState;

    postElements.postCategory.textContent = post.category;
    postElements.postTitle.textContent = post.title;
    postElements.postAuthor.textContent = post.author;
    postElements.postDate.textContent = formatDate(post.publishedAt);
    postElements.postReadTime.textContent = `${post.readTime} min read`;
    
    // Add 1 to views for this load (since backend already incremented)
    postElements.postViews.textContent = `${post.views + 1} views`;

    if (post.featuredImage) {
        postElements.postFeaturedImage.src = post.featuredImage;
        postElements.postFeaturedImage.alt = post.title;
        postElements.featuredImageContainer.style.display = 'block';
    }

    // Use a simple Markdown formatter
    postElements.postContent.innerHTML = formatContent(post.content);

    if (post.tags && post.tags.length > 0) {
        postElements.postTags.innerHTML = post.tags.map(tag => 
            `<span class="tag" onclick="filterByTag('${tag}')">${tag}</span>`
        ).join('');
        postElements.postTagsContainer.style.display = 'flex';
    }

    updateLikeButton();

    postElements.loading.style.display = 'none';
    postElements.blogPost.style.display = 'block';
}

/**
 * Renders the "Related Posts" section
 */
function renderRelatedPosts(relatedPosts) {
    if (!relatedPosts || relatedPosts.length === 0) return;

    postElements.relatedGrid.innerHTML = relatedPosts.map(relatedPost => `
        <article class="post-card" onclick="openPost('${relatedPost._id}')">
            ${relatedPost.featuredImage ? `
                <img src="${relatedPost.featuredImage}" alt="${relatedPost.title}" class="post-image">
            ` : ''}
            <div class="post-content">
                <span class="post-category">${relatedPost.category}</span>
                <h3>${relatedPost.title}</h3>
                <p class="post-excerpt">${relatedPost.excerpt}</p>
                <div class="post-meta">
                    <div class="author-info">
                        <span>By ${relatedPost.author}</span>
                        <span>•</span>
                        <time>${formatDate(relatedPost.publishedAt)}</time>
                    </div>
                </div>
            </div>
        </article>
    `).join('');

    postElements.relatedPosts.style.display = 'block';
}

/**
 * **NEW: Handles the "Like" button click**
 * Saves the like to the database.
 */
async function toggleLike() {
    if (postState.isUpdatingLike || !postState.post) return;
    
    postState.isUpdatingLike = true;
    const { _id: postId } = postState.post;
    const action = postState.isLiked ? 'unlike' : 'like';

    // Optimistic UI update
    postState.isLiked = !postState.isLiked;
    postState.likeCount += (action === 'like' ? 1 : -1);
    updateLikeButton();

    try {
        // Send update to the backend
        const response = await fetch(`/.netlify/functions/update-like-count?id=${postId}&action=${action}`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error('Like update failed');
        }

        // Save status to localStorage
        saveLikeStatus(postId, postState.isLiked);

    } catch (error) {
        console.error('Error updating like:', error);
        
        // Revert UI on failure
        postState.isLiked = !postState.isLiked;
        postState.likeCount += (action === 'like' ? -1 : 1);
        updateLikeButton();
    } finally {
        postState.isUpdatingLike = false;
    }
}

/**
 * **NEW: Checks localStorage to see if user liked this post**
 */
function checkLikeStatus() {
    const likedPosts = JSON.parse(localStorage.getItem('likedPosts') || '{}');
    postState.isLiked = !!likedPosts[postState.post._id];
    updateLikeButton();
}

/**
 * **NEW: Saves like status to localStorage**
 */
function saveLikeStatus(postId, isLiked) {
    const likedPosts = JSON.parse(localStorage.getItem('likedPosts') || '{}');
    if (isLiked) {
        likedPosts[postId] = true;
    } else {
        delete likedPosts[postId];
    }
    localStorage.setItem('likedPosts', JSON.stringify(likedPosts));
}

/**
 * Updates the like button UI
 */
function updateLikeButton() {
    if (postElements.likeIcon && postElements.likeCount) {
        postElements.likeIcon.className = postState.isLiked ? 'fas fa-heart' : 'far fa-heart';
        postElements.likeCount.textContent = postState.likeCount;
        postElements.likeIcon.style.color = postState.isLiked ? '#ef4444' : 'inherit'; // Use a hex color
    }
}

// --- Utility Functions ---

// Simple Markdown-like formatter
function formatContent(content) {
    if (!content) return '<p>No content available.</p>';
    return content
        .split('\n')
        .filter(line => line.trim() !== '')
        .map(line => {
            if (line.startsWith('### ')) return `<h3>${line.substring(4)}</h3>`;
            if (line.startsWith('## ')) return `<h2>${line.substring(3)}</h2>`;
            if (line.startsWith('# ')) return `<h1>${line.substring(2)}</h1>`;
            // Add bold/italic
            line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            line = line.replace(/\*(.*?)\*/g, '<em>$1</em>');
            return `<p>${line}</p>`;
        })
        .join('');
}

function updatePageMetadata() {
    // ... (Your existing updatePageMetadata function is perfect, no change needed)
}

function updateMetaTag(property, content) {
    // ... (Your existing updateMetaTag function is perfect, no change needed)
}

// Share functions
function sharePost() { /* ... (Your function is fine) ... */ }
function shareOnFacebook() { /* ... (Your function is fine) ... */ }
function shareOnTwitter() { /* ... (Your function is fine) ... */ }
function shareOnWhatsApp() { /* ... (Your function is fine) ... */ }
function shareOnLinkedIn() { /* ... (Your function is fine) ... */ }

// Other utilities
function showErrorState() {
    postElements.loading.style.display = 'none';
    postElements.errorState.style.display = 'block';
}

function formatDate(dateString) {
    if (!dateString) return 'Recently';
    const date = new Date(dateSring);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

function openPost(postId) {
    window.location.href = `/blog/post.html?id=${postId}`;
}

function filterByTag(tag) {
    window.location.href = `/blog/?search=${encodeURIComponent(tag)}`;
}

// Export functions to window for onclick attributes
window.sharePost = sharePost;
window.shareOnFacebook = shareOnFacebook;
window.shareOnTwitter = shareOnTwitter;
window.shareOnWhatsApp = shareOnWhatsApp;
window.shareOnLinkedIn = shareOnLinkedIn;
window.toggleLike = toggleLike;
window.openPost = openPost;
window.filterByTag = filterByTag;
window.loadBlogPost = loadBlogPost;