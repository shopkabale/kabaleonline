import { db } from '/firebase.js';
// Use your common admin functions
import { checkAdminAuth, setupHeader } from './admin-common.js';
import { collection, getDocs, getCountFromServer } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- STATE ---
let productCharts = {
    categoryChart: null,
    productsChart: null
};

// --- DOM ELEMENTS ---
const elements = {
    // adminName, adminAvatar, logoutBtn are handled by admin-common.js
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
    // Use checkAdminAuth for security and header setup
    checkAdminAuth((adminData) => {
        setupHeader(adminData.name, adminData.photoURL); // Pass photoURL too
        
        setupEventListeners();
        loadAllStats();
    });
}

// --- EVENT LISTENERS ---
function setupEventListeners() {
    // logoutBtn listener is in admin-common.js
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

/**
 * Renders "Views by Category" as a HORIZONTAL bar chart.
 */
function renderCategoryChart(categories) {
    if (productCharts.categoryChart) {
        productCharts.categoryChart.destroy();
    }
    if (!elements.categoryChart) return;

    const labels = categories.map(c => c._id);
    const data = categories.map(c => c.totalViews);
    const isDarkMode = document.body.classList.contains('dark-mode');
    const labelColor = isDarkMode ? '#e2e8f0' : '#34495e';
    const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

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
            // ** THIS IS THE FIX **
            indexAxis: 'y', // Makes the bar chart horizontal
            // ** END FIX **
            scales: { 
                y: { beginAtZero: true, ticks: { color: labelColor }, grid: { color: gridColor } },
                x: { ticks: { color: labelColor }, grid: { color: gridColor } }
            },
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: labelColor } }
            }
        }
    });
}

/**
 * Renders "Products by Category" as a doughnut chart with NO LEGEND.
 */
function renderProductsChart(categories) {
    if (productCharts.productsChart) {
        productCharts.productsChart.destroy();
    }
    if (!elements.productsChart) return;

    const labels = categories.map(c => c._id);
    const data = categories.map(c => c.count);
    const isDarkMode = document.body.classList.contains('dark-mode');
    const labelColor = isDarkMode ? '#e2e8f0' : '#34495e';

    productCharts.productsChart = new Chart(elements.productsChart, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                label: 'Product Count',
                data: data,
                backgroundColor: [
                    '#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#d946ef',
                    '#3b82f6', '#22c55e', '#f97316', '#dc2626', '#a855f7', '#0891b2', '#c026d3'
                ],
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { 
                    // ** THIS IS THE FIX **
                    display: false // Hides the broken legend
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed !== null) {
                                label += context.parsed;
                            }
                            return label;
                        }
                    }
                }
            }
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