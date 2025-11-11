let postState = {
    post: null,
    isLiked: false,
    likeCount: 0,
    isUpdatingLike: false
};

const postElements = {
    loading: document.getElementById('postLoading'),
    blogPost: document.getElementById('blogPost'),
    errorState: document.getElementById('errorState'),
    relatedPosts: document.getElementById('relatedPosts'),
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

async function loadBlogPost() {
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('id');
    const postSlug = urlParams.get('slug');

    let fetchUrl = '';

    if (postId) {
        fetchUrl = `/.netlify/functions/get-blog-post?id=${postId}`;
    } else if (postSlug) {
        fetchUrl = `/.netlify/functions/get-blog-post?slug=${postSlug}`;
    } else {
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
        
        checkLikeStatus();
        
        renderPost();
        renderRelatedPosts(data.relatedPosts);
        updatePageMetadata();

    } catch (error) {
        console.error('Error loading blog post:', error);
        showErrorState();
    }
}

function renderPost() {
    if (!postState.post) return;

    const { post } = postState;

    postElements.postCategory.textContent = post.category;
    postElements.postTitle.textContent = post.title;
    postElements.postAuthor.textContent = post.author;
    postElements.postDate.textContent = formatDate(post.publishedAt);
    postElements.postReadTime.textContent = `${post.readTime} min read`;
    postElements.postViews.textContent = `${post.views + 1} views`;

    if (post.featuredImage) {
        postElements.postFeaturedImage.src = post.featuredImage;
        postElements.postFeaturedImage.alt = post.title;
        postElements.featuredImageContainer.style.display = 'block';
    }

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

async function toggleLike() {
    if (postState.isUpdatingLike || !postState.post) return;
    
    postState.isUpdatingLike = true;
    const { _id: postId } = postState.post;
    const action = postState.isLiked ? 'unlike' : 'like';

    postState.isLiked = !postState.isLiked;
    postState.likeCount += (action === 'like' ? 1 : -1);
    updateLikeButton();

    try {
        const response = await fetch(`/.netlify/functions/update-like-count?id=${postId}&action=${action}`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error('Like update failed');
        }

        saveLikeStatus(postId, postState.isLiked);

    } catch (error) {
        console.error('Error updating like:', error);
        
        postState.isLiked = !postState.isLiked;
        postState.likeCount += (action === 'like' ? -1 : 1);
        updateLikeButton();
    } finally {
        postState.isUpdatingLike = false;
    }
}

function checkLikeStatus() {
    const likedPosts = JSON.parse(localStorage.getItem('likedPosts') || '{}');
    postState.isLiked = !!likedPosts[postState.post._id];
    updateLikeButton();
}

function saveLikeStatus(postId, isLiked) {
    const likedPosts = JSON.parse(localStorage.getItem('likedPosts') || '{}');
    if (isLiked) {
        likedPosts[postId] = true;
    } else {
        delete likedPosts[postId];
    }
    localStorage.setItem('likedPosts', JSON.stringify(likedPosts));
}

function updateLikeButton() {
    if (postElements.likeIcon && postElements.likeCount) {
        postElements.likeIcon.className = postState.isLiked ? 'fas fa-heart' : 'far fa-heart';
        postElements.likeCount.textContent = postState.likeCount;
        postElements.likeIcon.style.color = postState.isLiked ? '#ef4444' : 'inherit';
    }
}

function formatContent(content) {
    if (!content) return '<p>No content available.</p>';
    return content
        .split('\n')
        .filter(line => line.trim() !== '')
        .map(line => {
            if (line.startsWith('### ')) return `<h3>${line.substring(4)}</h3>`;
            if (line.startsWith('## ')) return `<h2>${line.substring(3)}</h2>`;
            if (line.startsWith('# ')) return `<h1>${line.substring(2)}</h1>`;
            line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            line = line.replace(/\*(.*?)\*/g, '<em>$1</em>');
            return `<p>${line}</p>`;
        })
        .join('');
}

function updatePageMetadata() {
    if (!postState.post) return;

    const { post } = postState;

    document.title = `${post.title} - KabaleOnline Blog`;

    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
        metaDescription.content = post.excerpt || post.content.substring(0, 160);
    }

    updateMetaTag('og:title', post.title);
    updateMetaTag('og:description', post.excerpt || post.content.substring(0, 160));
    updateMetaTag('og:url', window.location.href);

    if (post.featuredImage) {
        updateMetaTag('og:image', post.featuredImage);
    }

    updateMetaTag('twitter:title', post.title);
    updateMetaTag('twitter:description', post.excerpt || post.content.substring(0, 160));
    if (post.featuredImage) {
        updateMetaTag('twitter:image', post.featuredImage);
    }
}

function updateMetaTag(property, content) {
    let metaTag = document.querySelector(`meta[property="${property}"]`) || 
                  document.querySelector(`meta[name="${property}"]`);

    if (!metaTag) {
        metaTag = document.createElement('meta');
        if (property.startsWith('og:')) {
            metaTag.setAttribute('property', property);
        } else {
            metaTag.setAttribute('name', property);
        }
        document.head.appendChild(metaTag);
    }

    metaTag.setAttribute('content', content);
}

function sharePost() {
    if (navigator.share) {
        navigator.share({
            title: postState.post.title,
            text: postState.post.excerpt,
            url: window.location.href
        });
    } else {
        alert('Share this article using your preferred social media platform.');
    }
}

function shareOnFacebook() {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
}

function shareOnTwitter() {
    const text = encodeURIComponent(postState.post.title);
    const url = encodeURIComponent(window.location.href);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
}

function shareOnWhatsApp() {
    const text = encodeURIComponent(`${postState.post.title} - ${window.location.href}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
}

function shareOnLinkedIn() {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank');
}

function showErrorState() {
    postElements.loading.style.display = 'none';
    postElements.errorState.style.display = 'block';
}

function formatDate(dateString) {
    if (!dateString) return 'Recently';
    
    const date = new Date(dateString); 
    
    if (isNaN(date.getTime())) {
        return 'Recently';
    }
    
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

window.sharePost = sharePost;
window.shareOnFacebook = shareOnFacebook;
window.shareOnTwitter = shareOnTwitter;
window.shareOnWhatsApp = shareOnWhatsApp;
window.shareOnLinkedIn = shareOnLinkedIn;
window.toggleLike = toggleLike;
window.openPost = openPost;
window.filterByTag = filterByTag;
window.loadBlogPost = loadBlogPost;