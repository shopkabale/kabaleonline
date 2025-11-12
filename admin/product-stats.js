import { auth, db } from '/firebase.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- STATE ---
let productCharts = {
    categoryChart: null,
    productsChart: null
};

// --- DOM ELEMENTS ---
const elements = {
    adminName: document.getElementById('adminName'),
    adminAvatar: document.querySelector('.admin-avatar'),
    logoutBtn: document.getElementById('logoutBtn'),
    refreshStats: document.getElementById('refreshStats'),
    totalProducts: document.getElementById('totalProducts'),
    totalProductViews: document.getElementById('totalProductViews'),
    totalSold: document.getElementById('totalSold'),
    totalStockValue: document.getElementById('totalStockValue'),
    categoryChart: document.getElementById('productViewsByCategoryChart'),
    productsChart: document.getElementById('productsByCategoryChart'),
    topProductsList: document.getElementById('topProductsList')
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', initializeProductAnalytics);

function initializeProductAnalytics() {
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
        // Fetch all stats from our single new function
        const response = await fetch('/.netlify/functions/get-product-stats');
        
        if (!response.ok) {
            throw new Error('Failed to fetch product stats');
        }

        const data = await response.json();

        // Render all components
        renderStatsCards(data);
        renderCategoryChart(data.categories);
        renderProductsChart(data.categories);
        renderTopProducts(data.topProducts);

    } catch (error) {
        console.error("Error loading stats:", error);
        if(elements.topProductsList) {
             elements.topProductsList.innerHTML = `<p style="color: var(--danger-color);">Could not load analytics. Please try again.</p>`;
        }
    } finally {
        showLoading(false);
    }
}

// --- RENDERING FUNCTIONS ---

function renderStatsCards(data) {
    elements.totalProducts.textContent = data.totalProducts?.toLocaleString() || '0';
    elements.totalProductViews.textContent = data.totalProductViews?.toLocaleString() || '0';
    elements.totalSold.textContent = data.totalSold?.toLocaleString() || '0';
    elements.totalStockValue.textContent = `UGX ${data.totalStockValue?.toLocaleString() || '0'}`;
}

function renderTopProducts(products) {
    if (!products || products.length === 0) {
        elements.topProductsList.innerHTML = '<p>No top products found.</p>';
        return;
    }

    elements.topProductsList.innerHTML = products.map(product => `
        <div class="top-post-item" onclick="window.open('/product.html?id=${product._id}', '_blank')">
            <div class="top-post-title">${product.name}</div>
            <div class="top-post-stats">
                <span><i class="fas fa-eye"></i> ${product.views.toLocaleString()}</span>
            </div>
        </div>
    `).join('');
}

function renderCategoryChart(categories) {
    if (productCharts.categoryChart) {
        productCharts.categoryChart.destroy();
    }
    if (!elements.categoryChart) return;

    const labels = categories.map(c => c._id);
    const data = categories.map(c => c.totalViews);

    productCharts.categoryChart = new Chart(elements.categoryChart, {
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

function renderProductsChart(categories) {
    if (productCharts.productsChart) {
        productCharts.productsChart.destroy();
    }
    if (!elements.productsChart) return;

    const labels = categories.map(c => c._id);
    const data = categories.map(c => c.count);

    productCharts.productsChart = new Chart(elements.productsChart, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                label: 'Product Count',
                data: data,
                backgroundColor: [
                    '#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#d946ef'
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