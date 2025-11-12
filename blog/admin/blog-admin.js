import { auth, db } from '/firebase.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// Admin State
let adminState = {
    currentUser: null,
    posts: [],
    currentPage: 1,
    postsPerPage: 10,
    totalPosts: 0,
    filters: {
        search: '',
        status: 'all',
        category: 'all',
        sort: 'newest'
    },
    isLoading: false
};

// DOM Elements
const elements = {
    // Admin Info
    adminName: document.getElementById('adminName'),
    adminAvatar: document.querySelector('.admin-avatar'), // <-- Avatar fix
    logoutBtn: document.getElementById('logoutBtn'),

    // Stats
    totalPosts: document.getElementById('totalPosts'),
    publishedPosts: document.getElementById('publishedPosts'),
    draftPosts: document.getElementById('draftPosts'),
    totalViews: document.getElementById('totalViews'),

    // Filters
    searchInput: document.getElementById('searchInput'),
    statusFilter: document.getElementById('statusFilter'),
    categoryFilter: document.getElementById('categoryFilter'),
    sortFilter: document.getElementById('sortFilter'),

    // Table
    postsTableBody: document.getElementById('postsTableBody'),
    pagination: document.getElementById('pagination'),

    // Buttons
    createPostBtn: document.getElementById('createPostBtn'),

    // Modals
    postModal: document.getElementById('postModal'),
    deleteModal: document.getElementById('deleteModal'),
    closeModal: document.getElementById('closeModal'),
    cancelBtn: document.getElementById('cancelBtn'),

    // Forms
    postForm: document.getElementById('postForm'),
    modalTitle: document.getElementById('modalTitle'),
    postId: document.getElementById('postId'),
    postTitle: document.getElementById('postTitle'),
    postCategory: document.getElementById('postCategory'),
    postExcerpt: document.getElementById('postExcerpt'),
    postContent: document.getElementById('postContent'),
    postTags: document.getElementById('postTags'),
    postStatus: document.getElementById('postStatus'),
    featuredImage: document.getElementById('featuredImage'),
    submitBtn: document.getElementById('submitBtn'),
    submitText: document.getElementById('submitText'),
    submitSpinner: document.getElementById('submitSpinner'),

    // Delete Modal
    deletePostTitle: document.getElementById('deletePostTitle'),
    cancelDelete: document.getElementById('cancelDelete'),
    confirmDelete: document.getElementById('confirmDelete')
};

// Initialize Admin Panel
function initializeAdminPanel() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists() && userDoc.data().role === 'admin') {
                    adminState.currentUser = user;
                    const userData = userDoc.data();
                    
                    // ** FIX 1: SET AVATAR AND NAME **
                    elements.adminName.textContent = userData.name || user.email;
                    if (userData.profileImageUrl) {
                        elements.adminAvatar.src = userData.profileImageUrl;
                    }
                    // ** END FIX **

                    setupEventListeners();
                    loadStats();
                    loadPosts();

                } else {
                    window.location.href = '/admin/access-denied.html';
                }
            } catch (error) {
                console.error("Error verifying admin role:", error);
                window.location.href = '/admin/access-denied.html';
            }
        } else {
            window.location.href = '/login/';
        }
    });
}

// Event Listeners
function setupEventListeners() {
    elements.logoutBtn.addEventListener('click', () => {
        signOut(auth).catch(error => console.error("Logout Error:", error));
    });

    elements.createPostBtn.addEventListener('click', () => {
        openCreateModal();
    });

    elements.searchInput.addEventListener('input', debounce(() => {
        adminState.filters.search = elements.searchInput.value;
        adminState.currentPage = 1;
        loadPosts();
    }, 500));

    elements.statusFilter.addEventListener('change', () => {
        adminState.filters.status = elements.statusFilter.value;
        adminState.currentPage = 1;
        loadPosts();
    });

    elements.categoryFilter.addEventListener('change', () => {
        adminState.filters.category = elements.categoryFilter.value;
        adminState.currentPage = 1;
        loadPosts();
    });

    elements.sortFilter.addEventListener('change', () => {
        adminState.filters.sort = elements.sortFilter.value;
        adminState.currentPage = 1;
        loadPosts();
    });

    elements.closeModal.addEventListener('click', closeModals);
    elements.cancelBtn.addEventListener('click', closeModals);
    elements.cancelDelete.addEventListener('click', closeModals);

    elements.postForm.addEventListener('submit', handlePostSubmit);

    elements.confirmDelete.addEventListener('click', handleDeletePost);

    window.addEventListener('click', (e) => {
        if (e.target === elements.postModal) closeModals();
        if (e.target === elements.deleteModal) closeModals();
    });
}

// Load Blog Stats
async function loadStats() {
    try {
        const response = await fetch('/.netlify/functions/get-blog-stats');
        const data = await response.json();

        if (response.ok) {
            elements.totalPosts.textContent = data.totalPosts.toLocaleString();
            elements.totalViews.textContent = data.totalViews.toLocaleString();

            const postsResponse = await fetch('/.netlify/functions/get-blog-posts?limit=1000&status=all');
            const postsData = await postsResponse.json();

            if (postsResponse.ok) {
                const published = postsData.posts.filter(post => post.status === 'published').length;
                const drafts = postsData.posts.filter(post => post.status === 'draft').length;

                elements.publishedPosts.textContent = published.toLocaleString();
                elements.draftPosts.textContent = drafts.toLocaleString();
            }
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Load Posts
async function loadPosts() {
    if (adminState.isLoading) return;

    adminState.isLoading = true;
    elements.postsTableBody.innerHTML = `
        <tr>
            <td colspan="7" class="loading-cell">
                <i class="fas fa-spinner fa-spin"></i>
                Loading posts...
            </td>
        </tr>
    `;

    try {
        const params = new URLSearchParams({
            page: adminState.currentPage,
            limit: adminState.postsPerPage,
            status: adminState.filters.status === 'all' ? '' : adminState.filters.status,
            category: adminState.filters.category === 'all' ? '' : adminState.filters.category,
            search: adminState.filters.search,
            sort: adminState.filters.sort
        });

        const response = await fetch(`/.netlify/functions/get-blog-posts?${params}`);
        const data = await response.json();

        if (response.ok) {
            adminState.posts = data.posts;
            adminState.totalPosts = data.pagination.totalPosts;
            renderPosts();
            renderPagination(data.pagination);
        } else {
            throw new Error(data.error || 'Failed to load posts');
        }
    } catch (error) {
        console.error('Error loading posts:', error);
        elements.postsTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="loading-cell">
                    <i class="fas fa-exclamation-triangle"></i>
                    Failed to load posts. Please try again.
                </td>
            </tr>
        `;
    } finally {
        adminState.isLoading = false;
    }
}

// Render Posts Table
function renderPosts() {
    if (adminState.posts.length === 0) {
        elements.postsTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    <i class="fas fa-newspaper"></i>
                    <h3>No posts found</h3>
                    <p>Try adjusting your filters or create a new post.</p>
                </td>
            </tr>
        `;
        return;
    }

    elements.postsTableBody.innerHTML = adminState.posts.map(post => `
        <tr>
            <td>
                <div class="post-info">
                    ${post.featuredImage ? `
                        <img src="${post.featuredImage}" alt="${post.title}" class="post-image">
                    ` : `
                        <div class="post-image" style="background: var(--bg-gray); display: flex; align-items: center; justify-content: center; color: var(--text-secondary);">
                            <i class="fas fa-image"></i>
                        </div>
                    `}
                    <div class="post-details">
                        <h4>${post.title}</h4>
                        <p>${truncateText(post.excerpt, 100)}</p>
                    </div>
                </div>
            </td>
            <td>${post.category}</td>
            <td>
                <span class="status-badge status-${post.status}">
                    ${post.status}
                </span>
            </td>
            <td>${post.views?.toLocaleString() || '0'}</td>
            <td>${post.likes?.toLocaleString() || '0'}</td>
            <td>${formatDate(post.publishedAt) || 'Not published'}</td>
            <td>
                <div class="actions-cell">
                    <button class="btn btn-sm btn-secondary" onclick="editPost('${post._id}')">
                        <i class="fas fa-edit"></i>
                        Edit
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="confirmDelete('${post._id}', '${post.title.replace(/'/g, "\\'")}')">
                        <i class="fas fa-trash"></i>
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Render Pagination
function renderPagination(pagination) {
    if (pagination.totalPages <= 1) {
        elements.pagination.innerHTML = '';
        return;
    }

    const { currentPage, totalPages, hasNext, hasPrev } = pagination;

    elements.pagination.innerHTML = `
        <button class="pagination-btn" ${!hasPrev ? 'disabled' : ''} onclick="goToPage(${currentPage - 1})">
            <i class="fas fa-chevron-left"></i>
            Previous
        </button>
        
        <span class="pagination-info">
            Page ${currentPage} of ${totalPages}
        </span>
        
        <button class="pagination-btn" ${!hasNext ? 'disabled' : ''} onclick="goToPage(${currentPage + 1})">
            Next
            <i class="fas fa-chevron-right"></i>
        </button>
    `;
}

// Pagination Functions
window.goToPage = function(page) {
    adminState.currentPage = page;
    loadPosts();
};

// Modal Functions
function openCreateModal() {
    elements.modalTitle.textContent = 'Create New Post';
    elements.postForm.reset();
    elements.postId.value = '';
    elements.postStatus.value = 'draft';
    elements.submitText.textContent = 'Create Post';
    elements.postModal.classList.add('show');
}

window.editPost = async function(postId) {
    try {
        showLoadingState(true);

        const response = await fetch(`/.netlify/functions/get-blog-post?id=${postId}`);
        const data = await response.json();

        if (response.ok) {
            const post = data.post;

            elements.modalTitle.textContent = 'Edit Post';
            elements.postId.value = postId;
            elements.postTitle.value = post.title;
            elements.postCategory.value = post.category;
            elements.postExcerpt.value = post.excerpt;
            elements.postContent.value = post.content;
            elements.postTags.value = post.tags?.join(', ') || '';
            elements.postStatus.value = post.status;
            elements.featuredImage.value = post.featuredImage || '';
            elements.submitText.textContent = 'Update Post';

            elements.postModal.classList.add('show');
        } else {
            throw new Error(data.error || 'Failed to load post');
        }
    } catch (error) {
        console.error('Error loading post:', error);
        alert('Failed to load post for editing. Please try again.');
    } finally {
        showLoadingState(false);
    }
};

function closeModals() {
    elements.postModal.classList.remove('show');
    elements.deleteModal.classList.remove('show');
}

// Delete Functions
let postToDelete = null;

window.confirmDelete = function(postId, postTitle) {
    postToDelete = postId;
    elements.deletePostTitle.textContent = postTitle;
    elements.deleteModal.classList.add('show');
};

async function handleDeletePost() {
    if (!postToDelete) return;

    try {
        showLoadingState(true, elements.confirmDelete);
        elements.confirmDelete.disabled = true;

        const response = await fetch(`/.netlify/functions/delete-blog-post?id=${postToDelete}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (response.ok) {
            closeModals();
            loadPosts();
            loadStats();
            showNotification('Post deleted successfully', 'success');
        } else {
            throw new Error(data.error || 'Failed to delete post');
        }
    } catch (error) {
        console.error('Error deleting post:', error);
        showNotification('Failed to delete post. Please try again.', 'error');
    } finally {
        showLoadingState(false, elements.confirmDelete);
        elements.confirmDelete.disabled = false;
        postToDelete = null;
    }
}

// Form Submission
async function handlePostSubmit(e) {
    e.preventDefault();

    if (!validateForm()) return;

    try {
        showLoadingState(true, elements.submitBtn);

        const postData = {
            title: elements.postTitle.value.trim(),
            content: elements.postContent.value.trim(),
            excerpt: elements.postExcerpt.value.trim(),
            category: elements.postCategory.value,
            tags: elements.postTags.value.split(',').map(tag => tag.trim()).filter(tag => tag),
            author: adminState.currentUser.email,
            featuredImage: elements.featuredImage.value.trim() || null,
            status: elements.postStatus.value
        };

        let response;
        const postId = elements.postId.value;

        if (postId) {
            response = await fetch(`/.netlify/functions/update-blog-post?id=${postId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(postData)
            });
        } else {
            response = await fetch('/.netlify/functions/create-blog-post', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(postData)
            });
        }

        const data = await response.json();

        if (response.ok) {
            closeModals();
            loadPosts();
            loadStats();
            showNotification(
                postId ? 'Post updated successfully' : 'Post created successfully',
                'success'
            );
        } else {
            throw new Error(data.error || 'Failed to save post');
        }
    } catch (error) {
        console.error('Error saving post:', error);
        showNotification('Failed to save post. Please try again.', 'error');
    } finally {
        showLoadingState(false, elements.submitBtn);
    }
}

// Form Validation
function validateForm() {
    const title = elements.postTitle.value.trim();
    const content = elements.postContent.value.trim();
    const category = elements.postCategory.value;

    if (!title) {
        showNotification('Please enter a post title', 'error');
        elements.postTitle.focus();
        return false;
    }

    if (!content) {
        showNotification('Please enter post content', 'error');
        elements.postContent.focus();
        return false;
    }

    if (!category) {
        showNotification('Please select a category', 'error');
        elements.postCategory.focus();
        return false;
    }

    return true;
}

// Utility Functions

function truncateText(text, length = 100) {
    if (!text) return '';
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function formatDate(dateString) {
    if (!dateString) return null;

    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function showLoadingState(isLoading, element = null) {
    if (element) {
        element.disabled = isLoading;
        if (element.querySelector('.btn-text')) {
            element.querySelector('.btn-text').style.display = isLoading ? 'none' : 'inline';
        }
        if (element.querySelector('.fa-spinner')) {
            element.querySelector('.fa-spinner').style.display = isLoading ? 'inline-block' : 'none';
        }
    } else {
        document.body.classList.toggle('loading', isLoading);
    }
}

function showNotification(message, type = 'info') {
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
    `;

    if (!document.querySelector('#notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                background: white;
                padding: 1rem 1.5rem;
                border-radius: 0.5rem;
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
                border-left: 4px solid var(--primary-color);
                z-index: 3000;
                animation: slideInRight 0.3s ease;
            }
            
            .notification-success {
                border-left-color: var(--success-color);
            }
            
            .notification-error {
                border-left-color: var(--danger-color);
            }
            
            .notification-content {
                display: flex;
                align-items: center;
                gap: 0.75rem;
            }
            
            .notification-success i {
                color: var(--success-color);
            }
            
            .notification-error i {
                color: var(--danger-color);
            }
            
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(styles);
    }

    document.body.appendChild(notification);

    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

function getNotificationIcon(type) {
    switch (type) {
        case 'success': return 'check-circle';
        case 'error': return 'exclamation-circle';
        default: return 'info-circle';
    }
}

if (!document.querySelector('#notification-animations')) {
    const animations = document.createElement('style');
    animations.id = 'notification-animations';
    animations.textContent = `
        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(animations);
}

document.addEventListener('DOMContentLoaded', initializeAdminPanel);