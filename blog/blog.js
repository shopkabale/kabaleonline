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

function initBlog() {
    loadFeaturedPosts();
    loadPosts();
    setupEventListeners();
}

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
    
    if (elements.loadMoreBtn) {
        elements.loadMoreBtn.addEventListener('click', loadMorePosts);
    }

    function handlePostClick(e) {
        const card = e.target.closest('[data-post-id]');
        if (card && card.dataset.postId) {
            openPost(card.dataset.postId);
        }
    }

    if (elements.featuredGrid) {
        elements.featuredGrid.addEventListener('click', handlePostClick);
    }
    if (elements.postsGrid) {
        elements.postsGrid.addEventListener('click', handlePostClick);
    }
    if (elements.popularPosts) {
        elements.popularPosts.addEventListener('click', handlePostClick);
    }

    if (elements.categoriesList) {
        elements.categoriesList.addEventListener('click', (e) => {
            const categoryItem = e.target.closest('[data-category]');
            if (categoryItem && categoryItem.dataset.category) {
                filterByCategory(categoryItem.dataset.category);
            }
        });
    }

    if (elements.tagsCloud) {
        elements.tagsCloud.addEventListener('click', (e) => {
            e.preventDefault();
            const tagItem = e.target.closest('[data-tag]');
            if (tagItem && tagItem.dataset.tag) {
                filterByTag(tagItem.dataset.tag);
            }
        });
    }
}

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

async function loadPosts(reset = false) {
    if (blogState.isLoading) return;

    blogState.isLoading = true;

    if (reset) {
        blogState.allPosts = [];
        showLoadingState();
    }
    
    updateLoadMoreButton();

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
        } else if (blogState.currentSort === 'oldest') {
             params.append('sort', 'oldest');
        }

        const response = await fetch(`/.netlify/functions/get-blog-posts?${params}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to load posts');
        }

        const newPosts = data.posts || [];

        if (reset) {
            blogState.allPosts = newPosts;
        } else {
            blogState.allPosts = [...blogState.allPosts, ...newPosts];
        }

        blogState.hasMore = data.pagination?.hasNext || false;

        renderPosts();

        if (blogState.currentPage === 1) {
            loadSidebarData();
        }

    } catch (error) {
        console.error('Error loading posts:', error);
        showErrorState('Failed to load articles. Please try again.');
    } finally {
        blogState.isLoading = false;
        updateLoadMoreButton();
    }
}

async function loadMorePosts() {
    if (blogState.isLoading || !blogState.hasMore) return;

    blogState.currentPage++;
    await loadPosts(false);
}

async function loadSidebarData() {
    try {
        const allPostsResponse = await fetch('/.netlify/functions/get-blog-posts?limit=500&status=published');
        const allPostsData = await allPostsResponse.json();

        if (allPostsData.posts) {
            updateCategories(allPostsData.posts);
            updateTagsCloud(allPostsData.posts);
        }

        const popularResponse = await fetch('/.netlify/functions/get-blog-posts?sort=popular&limit=5&status=published');
        const popularData = await popularResponse.json();

        if (popularData.posts) {
            blogState.popularPosts = popularData.posts;
            renderPopularPosts();
        }

    } catch (error) {
        console.error('Error loading sidebar data:', error);
    }
}

function renderFeaturedPosts() {
    if (!elements.featuredGrid) return;

    elements.featuredGrid.innerHTML = blogState.featuredPosts.map(post => `
        <article class="featured-card" data-post-id="${post._id}">
            ${post.featuredImage ? `
                <img src="${post.featuredImage}" alt="${post.title}" class="featured-image">
            ` : ''}
            <div class="featured-content">
                <span class="featured-category">${post.category}</span>
                <h3>${post.title}</h3>
                <p class="featured-excerpt">${formatExcerpt(post.excerpt)}</p>
                <div class="featured-meta">
                    <span>By ${post.author}</span>
                    <span>${formatDate(post.publishedAt)}</span>
                </div>
            </div>
        </article>
    `).join('');
}

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
    
    const postsHTML = blogState.allPosts.map(post => `
        <article class="post-card" data-post-id="${post._id}">
            ${post.featuredImage ? `
                <img src="${post.featuredImage}" alt="${post.title}" class="post-image">
            ` : ''}
            <div class="post-content">
                <span class="post-category">${post.category}</span>
                <h3>${post.title}</h3>
                <p class="post-excerpt">${formatExcerpt(post.excerpt)}</p>
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
    
    elements.postsGrid.innerHTML = postsHTML;
}

function renderPopularPosts() {
    if (!elements.popularPosts) return;

    elements.popularPosts.innerHTML = blogState.popularPosts.map(post => `
        <div class="popular-post-item" data-post-id="${post._id}">
            ${post.featuredImage ? `
                <img src="${post.featuredImage}" alt="${post.title}" class="popular-post-image">
            ` : '<div class="popular-post-image" style="background: var(--bg-gray);"></div>'}
            <div class="popular-post-content">
                <h4>${truncateText(post.title, 60)}</h4>
                <div class="popular-post-meta">
                    <span>${formatDate(post.publishedAt)}</span>
                    <span>•</span>
                    <span>${post.views} views</span>
                </div>
            </div>
        </div>
    `).join('');
}

function updateCategories(posts) {
    if (!elements.categoriesList) return;

    const categories = {};
    posts.forEach(post => {
        categories[post.category] = (categories[post.category] || 0) + 1;
    });

    elements.categoriesList.innerHTML = Object.entries(categories)
        .sort(([,a], [,b]) => b - a)
        .map(([category, count]) => `
            <div class="category-item" data-category="${category}">
                <span>${category}</span>
                <span class="category-count">${count}</span>
            </div>
        `).join('');
}

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
            <a href="#" class="tag" data-tag="${tag}">
                ${tag} (${count})
            </a>
        `).join('');
}

function filterByCategory(category) {
    if (elements.categoryFilter) {
        elements.categoryFilter.value = category;
        blogState.currentCategory = category;
        blogState.currentPage = 1;
        loadPosts(true);
    }
}

function filterByTag(tag) {
    blogState.currentSearch = tag;
    blogState.currentPage = 1;
    if (elements.blogSearch) {
        elements.blogSearch.value = tag;
    }
    loadPosts(true);
}

function openPost(postId) {
    window.location.href = `/blog/post.html?id=${postId}`;
}

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

function showErrorState(message) {
    if (elements.postsGrid) {
        elements.postsGrid.innerHTML = `
            <div class="error-state" style="text-align: center; padding: 2rem;">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #ef4444; margin-bottom: 1rem;"></i>
                <h3>Something went wrong</h3>
                <p>${message}</p>
                <button id="tryAgainBtn" class="load-more-btn" style="margin-top: 1rem;">
                    Try Again
                </button>
            </div>
        `;
        document.getElementById('tryAgainBtn')?.addEventListener('click', () => loadPosts(true));
    }
}

function updateLoadMoreButton() {
    if (elements.loadMoreBtn) {
        elements.loadMoreBtn.style.display = blogState.hasMore ? 'block' : 'none';
        elements.loadMoreBtn.disabled = blogState.isLoading;
        elements.loadMoreBtn.textContent = blogState.isLoading ? 'Loading...' : 'Load More Articles';
    }
}

function formatExcerpt(text, length = 150) {
  if (!text) return '';
  
  let plainText = text
    .replace(/^[#]{1,3}\s/gm, '')
    .replace(/[\*_]{1,2}(.*?)[*_]{1,2}/g, '$1')
    .replace(/\n/g, ' ');

  if (plainText.length > length) {
    plainText = plainText.substring(0, length).trim() + '...';
  }
  
  return plainText;
}

function truncateText(text, length = 50) {
    if (!text) return '';
    if (text.length > length) {
        return text.substring(0, length).trim() + '...';
    }
    return text;
}

function formatDate(dateString) {
    if (!dateString) return 'Recently';

    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;

    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

if (document.getElementById('newsletterForm')) {
    document.getElementById('newsletterForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const email = form.querySelector('input[type="email"]').value;
        const button = form.querySelector('button');

        if (!email || !email.includes('@')) {
            alert('Please enter a valid email address.');
            return;
        }

        const originalText = button.textContent;
        button.textContent = 'Subscribing...';
        button.disabled = true;

        try {
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

window.initBlog = initBlog;