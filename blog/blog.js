// Blog State Management
let blogState = {
    currentPage: 1,
    currentCategory: 'all',
    currentSort: 'newest',
    currentSearch: '',
    isLoading: false,
    hasMore: true,
    allPosts: [],
    featuredPosts: [],
    categories: [],
    popularPosts: []
};

// DOM Elements
const elements = {
    postsGrid: document.getElementById('postsGrid'),
    featuredGrid: document.getElementById('featuredGrid'),
    categoriesList: document.getElementById('categoriesList'),
    popularPosts: document.getElementById('popularPosts'),
    tagsCloud: document.getElementById('tagsCloud'),
    loadMoreBtn: document.getElementById('loadMoreBtn'),
    categoryFilter: document.getElementById('categoryFilter'),
    sortFilter: document.getElementById('sortFilter'),
    blogSearch: document.getElementById('blogSearch')
};

// Initialize Blog
function initBlog() {
    loadFeaturedPosts();
    loadPosts();
    setupEventListeners();
}

// Event Listeners
function setupEventListeners() {
    if (elements.categoryFilter) {
        elements.categoryFilter.addEventListener('change', (e) => {
            blogState.currentCategory = e.target.value;
            blogState.currentPage = 1;
            loadPosts(true);
        });
    }

    if (elements.sortFilter) {
        elements.sortFilter.addEventListener('change', (e) => {
            blogState.currentSort = e.target.value;
            blogState.currentPage = 1;
            loadPosts(true);
        });
    }

    if (elements.blogSearch) {
        let searchTimeout;
        elements.blogSearch.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                blogState.currentSearch = e.target.value;
                blogState.currentPage = 1;
                loadPosts(true);
            }, 500);
        });
    }

    // Infinite scroll
    let scrollTimeout;
    window.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
            if (scrollTop + clientHeight >= scrollHeight - 500 && !blogState.isLoading && blogState.hasMore) {
                loadMorePosts();
            }
        }, 100);
    });
}

// Load Featured Posts
async function loadFeaturedPosts() {
    try {
        const response = await fetch('/.netlify/functions/get-blog-posts?limit=3&featured=true');
        const data = await response.json();
        
        if (data.posts && data.posts.length > 0) {
            blogState.featuredPosts = data.posts;
            renderFeaturedPosts();
        }
    } catch (error) {
        console.error('Error loading featured posts:', error);
    }
}

// Load Posts
async function loadPosts(reset = false) {
    if (blogState.isLoading) return;
    
    blogState.isLoading = true;
    
    if (reset) {
        blogState.allPosts = [];
        showLoadingState();
    }

    try {
        const params = new URLSearchParams({
            page: blogState.currentPage,
            limit: '9',
            status: 'published'
        });

        if (blogState.currentCategory !== 'all') {
            params.append('category', blogState.currentCategory);
        }

        if (blogState.currentSearch) {
            params.append('search', blogState.currentSearch);
        }

        if (blogState.currentSort === 'popular') {
            params.append('sort', 'views');
        }

        const response = await fetch(`/.netlify/functions/get-blog-posts?${params}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to load posts');
        }

        if (reset) {
            blogState.allPosts = data.posts || [];
        } else {
            blogState.allPosts = [...blogState.allPosts, ...(data.posts || [])];
        }

        blogState.hasMore = data.pagination?.hasNext || false;
        
        renderPosts();
        updateLoadMoreButton();
        
        // Load sidebar data on first load
        if (blogState.currentPage === 1) {
            loadSidebarData();
        }

    } catch (error) {
        console.error('Error loading posts:', error);
        showErrorState('Failed to load articles. Please try again.');
    } finally {
        blogState.isLoading = false;
    }
}

// Load More Posts
async function loadMorePosts() {
    if (blogState.isLoading || !blogState.hasMore) return;
    
    blogState.currentPage++;
    await loadPosts(false);
}

// Load Sidebar Data
async function loadSidebarData() {
    try {
        // Load categories
        const categoriesResponse = await fetch('/.netlify/functions/get-blog-posts?limit=100');
        const categoriesData = await categoriesResponse.json();
        
        if (categoriesData.posts) {
            updateCategories(categoriesData.posts);
            updateTagsCloud(categoriesData.posts);
        }

        // Load popular posts
        const popularResponse = await fetch('/.netlify/functions/get-blog-posts?sort=views&limit=5');
        const popularData = await popularResponse.json();
        
        if (popularData.posts) {
            blogState.popularPosts = popularData.posts;
            renderPopularPosts();
        }

    } catch (error) {
        console.error('Error loading sidebar data:', error);
    }
}

// Render Featured Posts
function renderFeaturedPosts() {
    if (!elements.featuredGrid) return;

    elements.featuredGrid.innerHTML = blogState.featuredPosts.map(post => `
        <article class="featured-card" onclick="openPost('${post._id}')">
            ${post.featuredImage ? `
                <img src="${post.featuredImage}" alt="${post.title}" class="featured-image">
            ` : ''}
            <div class="featured-content">
                <span class="featured-category">${post.category}</span>
                <h3>${post.title}</h3>
                <p class="featured-excerpt">${post.excerpt}</p>
                <div class="featured-meta">
                    <span>By ${post.author}</span>
                    <span>${formatDate(post.publishedAt)}</span>
                </div>
            </div>
        </article>
    `).join('');
}

// Render Posts
function renderPosts() {
    if (!elements.postsGrid) return;

    if (blogState.allPosts.length === 0) {
        elements.postsGrid.innerHTML = `
            <div class="no-posts">
                <i class="fas fa-newspaper" style="font-size: 3rem; color: var(--text-secondary); margin-bottom: 1rem;"></i>
                <h3>No articles found</h3>
                <p>Try changing your filters or search terms.</p>
            </div>
        `;
        return;
    }

    elements.postsGrid.innerHTML = blogState.allPosts.map(post => `
        <article class="post-card" onclick="openPost('${post._id}')">
            ${post.featuredImage ? `
                <img src="${post.featuredImage}" alt="${post.title}" class="post-image">
            ` : ''}
            <div class="post-content">
                <span class="post-category">${post.category}</span>
                <h3>${post.title}</h3>
                <p class="post-excerpt">${post.excerpt}</p>
                <div class="post-meta">
                    <div class="author-info">
                        <span>By ${post.author}</span>
                        <span>•</span>
                        <time>${formatDate(post.publishedAt)}</time>
                    </div>
                    <div class="read-time">
                        <i class="far fa-clock"></i>
                        <span>${post.readTime} min read</span>
                    </div>
                </div>
            </div>
        </article>
    `).join('');
}

// Render Popular Posts
function renderPopularPosts() {
    if (!elements.popularPosts) return;

    elements.popularPosts.innerHTML = blogState.popularPosts.map(post => `
        <div class="popular-post-item" onclick="openPost('${post._id}')">
            ${post.featuredImage ? `
                <img src="${post.featuredImage}" alt="${post.title}" class="popular-post-image">
            ` : '<div class="popular-post-image" style="background: var(--bg-gray);"></div>'}
            <div class="popular-post-content">
                <h4>${post.title}</h4>
                <div class="popular-post-meta">
                    <span>${formatDate(post.publishedAt)}</span>
                    <span>•</span>
                    <span>${post.views} views</span>
                </div>
            </div>
        </div>
    `).join('');
}

// Update Categories
function updateCategories(posts) {
    if (!elements.categoriesList) return;

    const categories = {};
    posts.forEach(post => {
        categories[post.category] = (categories[post.category] || 0) + 1;
    });

    elements.categoriesList.innerHTML = Object.entries(categories)
        .sort(([,a], [,b]) => b - a)
        .map(([category, count]) => `
            <div class="category-item" onclick="filterByCategory('${category}')">
                <span>${category}</span>
                <span class="category-count">${count}</span>
            </div>
        `).join('');
}

// Update Tags Cloud
function updateTagsCloud(posts) {
    if (!elements.tagsCloud) return;

    const tags = {};
    posts.forEach(post => {
        post.tags?.forEach(tag => {
            tags[tag] = (tags[tag] || 0) + 1;
        });
    });

    const sortedTags = Object.entries(tags)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 15);

    elements.tagsCloud.innerHTML = sortedTags
        .map(([tag, count]) => `
            <a href="javascript:void(0)" class="tag" onclick="filterByTag('${tag}')">
                ${tag} (${count})
            </a>
        `).join('');
}

// Filter by Category
function filterByCategory(category) {
    if (elements.categoryFilter) {
        elements.categoryFilter.value = category;
        blogState.currentCategory = category;
        blogState.currentPage = 1;
        loadPosts(true);
    }
}

// Filter by Tag
function filterByTag(tag) {
    blogState.currentSearch = tag;
    blogState.currentPage = 1;
    if (elements.blogSearch) {
        elements.blogSearch.value = tag;
    }
    loadPosts(true);
}

// Search Posts
function searchPosts() {
    if (elements.blogSearch) {
        blogState.currentSearch = elements.blogSearch.value;
        blogState.currentPage = 1;
        loadPosts(true);
    }
}

// Open Post
function openPost(postId) {
    window.location.href = `/blog/post.html?id=${postId}`;
}

// Show Loading State
function showLoadingState() {
    if (elements.postsGrid) {
        elements.postsGrid.innerHTML = `
            <div class="loading-posts">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading articles...</p>
            </div>
        `;
    }
}

// Show Error State
function showErrorState(message) {
    if (elements.postsGrid) {
        elements.postsGrid.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: var(--ko-danger); margin-bottom: 1rem;"></i>
                <h3>Something went wrong</h3>
                <p>${message}</p>
                <button onclick="loadPosts(true)" class="load-more-btn" style="margin-top: 1rem;">
                    Try Again
                </button>
            </div>
        `;
    }
}

// Update Load More Button
function updateLoadMoreButton() {
    if (elements.loadMoreBtn) {
        elements.loadMoreBtn.style.display = blogState.hasMore ? 'block' : 'none';
        elements.loadMoreBtn.disabled = blogState.isLoading;
        elements.loadMoreBtn.textContent = blogState.isLoading ? 'Loading...' : 'Load More Articles';
    }
}

// Format Date
function formatDate(dateString) {
    if (!dateString) return 'Recently';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

// Newsletter Form Handler
if (document.getElementById('newsletterForm')) {
    document.getElementById('newsletterForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const email = form.querySelector('input[type="email"]').value;
        const button = form.querySelector('button');

        // Simple validation
        if (!email || !email.includes('@')) {
            alert('Please enter a valid email address.');
            return;
        }

        const originalText = button.textContent;
        button.textContent = 'Subscribing...';
        button.disabled = true;

        try {
            // Here you would typically send to your email service
            // For now, we'll just show a success message
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            alert('Thank you for subscribing to our newsletter!');
            form.reset();
        } catch (error) {
            alert('Failed to subscribe. Please try again.');
        } finally {
            button.textContent = originalText;
            button.disabled = false;
        }
    });
}

// Export functions for global access
window.initBlog = initBlog;
window.loadMorePosts = loadMorePosts;
window.searchPosts = searchPosts;
window.openPost = openPost;
window.filterByCategory = filterByCategory;
window.filterByTag = filterByTag;