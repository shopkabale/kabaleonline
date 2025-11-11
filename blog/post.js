// Post State
let postState = {
    post: null,
    isLiked: false,
    likeCount: 0
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

// Load Blog Post
async function loadBlogPost() {
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('id');

    if (!postId) {
        showErrorState();
        return;
    }

    try {
        const response = await fetch(`/.netlify/functions/get-blog-post?id=${postId}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Post not found');
        }

        postState.post = data.post;
        renderPost();
        renderRelatedPosts(data.relatedPosts);
        
        // Update page metadata
        updatePageMetadata();

    } catch (error) {
        console.error('Error loading blog post:', error);
        showErrorState();
    }
}

// Render Post
function renderPost() {
    if (!postState.post) return;

    const { post } = postState;

    // Update basic info
    postElements.postCategory.textContent = post.category;
    postElements.postTitle.textContent = post.title;
    postElements.postAuthor.textContent = post.author;
    postElements.postDate.textContent = formatDate(post.publishedAt);
    postElements.postReadTime.textContent = `${post.readTime} min read`;
    postElements.postViews.textContent = `${post.views} views`;

    // Update featured image
    if (post.featuredImage) {
        postElements.postFeaturedImage.src = post.featuredImage;
        postElements.postFeaturedImage.alt = post.title;
        postElements.featuredImageContainer.style.display = 'block';
    }

    // Update content
    postElements.postContent.innerHTML = formatContent(post.content);

    // Update tags
    if (post.tags && post.tags.length > 0) {
        postElements.postTags.innerHTML = post.tags.map(tag => `
            <span class="tag" onclick="filterByTag('${tag}')">${tag}</span>
        `).join('');
        postElements.postTagsContainer.style.display = 'flex';
    }

    // Update likes
    postState.likeCount = post.likes || 0;
    updateLikeButton();

    // Show the post
    postElements.loading.style.display = 'none';
    postElements.blogPost.style.display = 'block';
}

// Render Related Posts
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
                    <div class="read-time">
                        <i class="far fa-clock"></i>
                        <span>${relatedPost.readTime} min read</span>
                    </div>
                </div>
            </div>
        </article>
    `).join('');

    postElements.relatedPosts.style.display = 'block';
}

// Format Content (simple markdown-like formatting)
function formatContent(content) {
    if (!content) return '<p>No content available.</p>';

    return content
        // Convert line breaks to paragraphs
        .split('\n\n')
        .map(paragraph => {
            if (!paragraph.trim()) return '';
            
            // Handle headers
            if (paragraph.startsWith('# ')) {
                return `<h1>${paragraph.substring(2)}</h1>`;
            }
            if (paragraph.startsWith('## ')) {
                return `<h2>${paragraph.substring(3)}</h2>`;
            }
            if (paragraph.startsWith('### ')) {
                return `<h3>${paragraph.substring(4)}</h3>`;
            }
            
            // Handle bold and italic
            paragraph = paragraph
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>');
            
            return `<p>${paragraph}</p>`;
        })
        .join('');
}

// Update Page Metadata
function updatePageMetadata() {
    if (!postState.post) return;

    const { post } = postState;

    // Update page title
    document.title = `${post.title} - KabaleOnline Blog`;

    // Update meta tags for SEO
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
        metaDescription.content = post.excerpt || post.content.substring(0, 160);
    }

    // Update Open Graph tags
    updateMetaTag('og:title', post.title);
    updateMetaTag('og:description', post.excerpt || post.content.substring(0, 160));
    updateMetaTag('og:url', window.location.href);
    
    if (post.featuredImage) {
        updateMetaTag('og:image', post.featuredImage);
    }

    // Update Twitter Card tags
    updateMetaTag('twitter:title', post.title);
    updateMetaTag('twitter:description', post.excerpt || post.content.substring(0, 160));
    if (post.featuredImage) {
        updateMetaTag('twitter:image', post.featuredImage);
    }
}

// Update Meta Tag
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

// Share Functions
function sharePost() {
    if (navigator.share) {
        navigator.share({
            title: postState.post.title,
            text: postState.post.excerpt,
            url: window.location.href
        });
    } else {
        // Fallback: show share options
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

// Like Functions
function toggleLike() {
    postState.isLiked = !postState.isLiked;
    postState.likeCount += postState.isLiked ? 1 : -1;
    updateLikeButton();
    
    // Here you would typically send to your backend
    // For now, we'll just update the UI
}

function updateLikeButton() {
    if (postElements.likeIcon && postElements.likeCount) {
        postElements.likeIcon.className = postState.isLiked ? 'fas fa-heart' : 'far fa-heart';
        postElements.likeCount.textContent = postState.likeCount;
        postElements.likeIcon.style.color = postState.isLiked ? 'var(--ko-danger)' : '';
    }
}

// Utility Functions
function showErrorState() {
    postElements.loading.style.display = 'none';
    postElements.errorState.style.display = 'block';
}

function formatDate(dateString) {
    if (!dateString) return 'Recently';
    
    const date = new Date(dateString);
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

// Export for global access
window.sharePost = sharePost;
window.shareOnFacebook = shareOnFacebook;
window.shareOnTwitter = shareOnTwitter;
window.shareOnWhatsApp = shareOnWhatsApp;
window.shareOnLinkedIn = shareOnLinkedIn;
window.toggleLike = toggleLike;
window.openPost = openPost;
window.filterByTag = filterByTag;
window.loadBlogPost = loadBlogPost;