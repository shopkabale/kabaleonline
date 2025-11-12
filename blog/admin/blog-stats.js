import { auth, db } from '/firebase.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- STATE ---
let blogCharts = {
    categoryChart: null,
    postsChart: null
};

// --- DOM ELEMENTS ---
const elements = {
    adminName: document.getElementById('adminName'),
    adminAvatar: document.querySelector('.admin-avatar'),
    logoutBtn: document.getElementById('logoutBtn'),
    refreshStats: document.getElementById('refreshStats'),
    totalPosts: document.getElementById('totalPosts'),
    totalViews: document.getElementById('totalViews'),
    totalLikes: document.getElementById('totalLikes'),
    avgReadTime: document.getElementById('avgReadTime'),
    categoryChart: document.getElementById('categoryChart'),
    postsChart: document.getElementById('postsChart'),
    topPostsList: document.getElementById('topPostsList')
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', initializeAnalytics);

function initializeAnalytics() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists() && userDoc.data().role === 'admin') {
                    const userData = userDoc.data();
                    elements.adminName.textContent = userData.name || user.email;
                    if (userData.photoURL) {
                        elements.adminAvatar.src = userData.photoURL;
                    }
                    setupEventListeners();
                    loadAllStats();
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

// --- EVENT LISTENERS ---
function setupEventListeners() {
    elements.logoutBtn.addEventListener('click', () => {
        signOut(auth).catch(error => console.error("Logout Error:", error));
    });
    elements.refreshStats.addEventListener('click', loadAllStats);
}

// --- DATA FETCHING ---
async function loadAllStats() {
    showLoading(true);
    try {
        // Fetch stats and top posts at the same time
        const [statsResponse, postsResponse] = await Promise.all([
            fetch('/.netlify/functions/get-blog-stats'),
            fetch('/.netlify/functions/get-blog-posts?sort=popular&limit=5&status=published')
        ]);

        if (!statsResponse.ok) {
            throw new Error('Failed to fetch blog stats');
        }
        if (!postsResponse.ok) {
            throw new Error('Failed to fetch top posts');
        }

        const statsData = await statsResponse.json();
        const postsData = await postsResponse.json();

        // Render all components
        renderStatsCards(statsData);
        renderCategoryChart(statsData.categories);
        renderPostsChart(statsData.categories);
        renderTopPosts(postsData.posts);

    } catch (error) {
        console.error("Error loading stats:", error);
        if(elements.topPostsList) {
             elements.topPostsList.innerHTML = `<p style="color: var(--danger-color);">Could not load analytics. Please try again.</p>`;
        }
    } finally {
        showLoading(false);
    }
}

// --- RENDERING FUNCTIONS ---

function renderStatsCards(data) {
    elements.totalPosts.textContent = data.totalPosts?.toLocaleString() || '0';
    elements.totalViews.textContent = data.totalViews?.toLocaleString() || '0';
    elements.totalLikes.textContent = data.totalLikes?.toLocaleString() || '0';
    elements.avgReadTime.textContent = `${data.avgReadTime?.toLocaleString() || '0'} min`;
}

function renderTopPosts(posts) {
    if (!posts || posts.length === 0) {
        elements.topPostsList.innerHTML = '<p>No top posts found.</p>';
        return;
    }

    elements.topPostsList.innerHTML = posts.map(post => `
        <div class="top-post-item" onclick="window.open('/blog/post.html?id=${post._id}', '_blank')">
            <div class="top-post-title">${post.title}</div>
            <div class="top-post-stats">
                <span><i class="fas fa-eye"></i> ${post.views.toLocaleString()}</span>
                <span><i class="fas fa-heart"></i> ${post.likes.toLocaleString()}</span>
            </div>
        </div>
    `).join('');
}

function renderCategoryChart(categories) {
    if (blogCharts.categoryChart) {
        blogCharts.categoryChart.destroy();
    }
    if (!elements.categoryChart) return;

    const labels = categories.map(c => c._id);
    const data = categories.map(c => c.totalViews);

    blogCharts.categoryChart = new Chart(elements.categoryChart, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Total Views',
                data: data,
                backgroundColor: 'rgba(37, 99, 235, 0.8)',
                borderColor: 'rgba(37, 99, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: { y: { beginAtZero: true } },
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

function renderPostsChart(categories) {
    if (blogCharts.postsChart) {
        blogCharts.postsChart.destroy();
    }
    if (!elements.postsChart) return;

    const labels = categories.map(c => c._id);
    const data = categories.map(c => c.count);

    blogCharts.postsChart = new Chart(elements.postsChart, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                label: 'Post Count',
                data: data,
                backgroundColor: [
                    '#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'
                ],
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

// --- UTILITY FUNCTIONS ---

function showLoading(isLoading) {
    elements.refreshStats.disabled = isLoading;
    const icon = elements.refreshStats.querySelector('i');
    if (icon) {
        icon.className = isLoading ? 'fas fa-spinner fa-spin' : 'fas fa-sync-alt';
    }
}