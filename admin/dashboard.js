import { db } from '../firebase.js';
// Import our new shared admin functions
import { checkAdminAuth, setupHeader } from './admin-common.js';
import { collection, getDocs, doc, query, orderBy, where, Timestamp, getCountFromServer } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- DOM ELEMENTS ---
const adminContent = document.getElementById('admin-content');
const loader = document.getElementById('loader');

// Stat Card Elements
const totalUsersStat = document.getElementById('total-users-stat');
const totalProductsStat = document.getElementById('total-products-stat');
const totalViewsStat = document.getElementById('total-views-stat'); // <-- ADDED
const totalOrdersStat = document.getElementById('total-orders-stat');
const totalSalesStat = document.getElementById('total-sales-stat');
const totalWishlistStat = document.getElementById('total-wishlist-stat');
const totalReferralsStat = document.getElementById('total-referrals-stat');
const totalRentalsStat = document.getElementById('total-rentals-stat');
const totalEventsStat = document.getElementById('total-events-stat');
const totalServicesStat = document.getElementById('total-services-stat');

// Action Card Elements
const pendingProductsCount = document.getElementById('pending-products-count');
const pendingTestimonialsCount = document.getElementById('pending-testimonials-count');

// Chart Elements
const weeklyViewBtn = document.getElementById('weekly-view-btn');
const monthlyViewBtn = document.getElementById('monthly-view-btn');
let activityChart = null;

/**
 * Main initialization function.
 */
function initializeDashboard() {
    // Use the common auth checker
    checkAdminAuth((adminData) => {
        // On success, setup the header
        setupHeader(adminData.name, adminData.photoURL); // Pass photoURL

        // Show the page
        adminContent.style.display = 'block';
        loader.style.display = 'none';

        // Setup UI interactivity
        setupEventListeners();

        // Fetch dashboard-specific data
        fetchAllStats();
    });
}

/**
 * Fetches all high-level statistics concurrently for performance.
 */
async function fetchAllStats() {
    try {
        // --- UPGRADED LOGIC ---
        // 1. Fetch all products in one go.
        const productsSnapshot = await getDocs(collection(db, 'products'));
        
        // 2. Fetch all users in one go.
        const usersSnapshot = await getDocs(collection(db, 'users'));
        
        // 3. Fetch all other counts concurrently
        const [
            orderCount, rentalCount, eventCount,
            testimonialCount, serviceCount, 
            pendingTestimonials
        ] = await Promise.all([
            getCountFromServer(collection(db, 'orders')),
            getCountFromServer(collection(db, 'rentals')),
            getCountFromServer(collection(db, 'events')),
            getCountFromServer(collection(db, 'testimonials')),
            getCountFromServer(collection(db, 'services')),
            getCountFromServer(query(collection(db, 'testimonials'), where('status', '==', 'pending')))
        ]);

        // 4. Calculate User Stats (from usersSnapshot)
        let totalWishlistedItems = 0;
        let totalReferralCount = 0;
        for (const userDoc of usersSnapshot.docs) {
            totalReferralCount += userDoc.data().referralCount || 0;
            const wishlistCol = collection(db, 'users', userDoc.id, 'wishlist');
            const wishlistSnapshot = await getCountFromServer(wishlistCol);
            totalWishlistedItems += wishlistSnapshot.data().count;
        }

        // 5. Calculate Product Stats (from productsSnapshot)
        let totalSalesValue = 0;
        let totalViews = 0;
        let pendingProducts = 0;
        productsSnapshot.forEach(doc => {
            const data = doc.data();
            totalViews += data.views || 0; // <-- Calculate Total Views
            
            if (data.isSold) {
                totalSalesValue += data.price || 0;
            }
            if (data.status === 'pending') {
                pendingProducts++;
            }
        });
        // --- END UPGRADED LOGIC ---

        // 6. Render all stats
        totalUsersStat.textContent = usersSnapshot.size.toLocaleString();
        totalProductsStat.textContent = productsSnapshot.size.toLocaleString();
        totalViewsStat.textContent = totalViews.toLocaleString(); // <-- RENDERED
        totalOrdersStat.textContent = orderCount.data().count.toLocaleString();
        totalSalesStat.textContent = `UGX ${totalSalesValue.toLocaleString()}`;
        totalWishlistStat.textContent = totalWishlistedItems.toLocaleString();
        totalReferralsStat.textContent = totalReferralCount.toLocaleString();
        totalRentalsStat.textContent = rentalCount.data().count.toLocaleString();
        totalEventsStat.textContent = eventCount.data().count.toLocaleString();
        totalServicesStat.textContent = serviceCount.data().count.toLocaleString(); 
        
        pendingProductsCount.textContent = pendingProducts; // <-- RENDERED
        pendingTestimonialsCount.textContent = pendingTestimonials.data().count;

        fetchAndRenderChart(7); // Load chart after stats

    } catch (error) {
        console.error("Error fetching stats:", error);
    }
}

/**
 * Fetches and renders the chart based on the selected timespan (7 or 30 days).
 */
async function fetchAndRenderChart(days) {
    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - days);
    const startTimestamp = Timestamp.fromDate(startDate);
    const labels = Array.from({ length: days }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (days - 1 - i)); return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); });

    const fetchDataForTimespan = async (collectionName) => {
        const counts = new Array(days).fill(0);
        const q = query(collection(db, collectionName), where('createdAt', '>=', startTimestamp));
        const snapshot = await getDocs(q);
        snapshot.forEach(doc => {
            if (doc.data().createdAt) {
                const docDate = doc.data().createdAt.toDate();
                const diffTime = today.getTime() - docDate.getTime();
                const diffDays = Math.floor(diffTime / (1000 * 3600 * 24));
                if (diffDays >= 0 && diffDays < days) {
                    const index = days - 1 - diffDays;
                    if (index >= 0 && index < counts.length) { counts[index]++; }
                }
            }
        });
        return counts;
    };

    try {
        const [userCounts, productCounts, orderCounts] = await Promise.all([
            fetchDataForTimespan('users'),
            fetchDataForTimespan('products'),
            fetchDataForTimespan('orders')
        ]);
        renderActivityChart(labels, userCounts, productCounts, orderCounts);
    } catch (error) { console.error("Error fetching chart data:", error); }
}

/**
 * Renders a line chart with multiple datasets.
 */
function renderActivityChart(labels, userCounts, productCounts, orderCounts) {
    const ctx = document.getElementById('activity-chart');
    if (!ctx) return;
    if (activityChart) { activityChart.destroy(); }
    const isDarkMode = document.body.classList.contains('dark-mode');
    const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const labelColor = isDarkMode ? '#e2e8f0' : '#34495e';

    activityChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                { label: 'New Users', data: userCounts, borderColor: 'rgba(54, 162, 235, 1)', tension: 0.1, fill: false },
                { label: 'New Products', data: productCounts, borderColor: 'rgba(255, 99, 132, 1)', tension: 0.1, fill: false },
                { label: 'New Orders', data: orderCounts, borderColor: 'rgba(75, 192, 192, 1)', tension: 0.1, fill: false }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: { beginAtZero: true, ticks: { color: labelColor, precision: 0 }, grid: { color: gridColor } },
                x: { ticks: { color: labelColor }, grid: { color: gridColor } }
            },
            plugins: {
                legend: { labels: { color: labelColor } }
            }
        }
    });
}

function setupEventListeners() {
    // Note: The logoutBtn listener is in admin-common.js now

    weeklyViewBtn.addEventListener('click', () => {
        fetchAndRenderChart(7);
        weeklyViewBtn.classList.add('active');
        monthlyViewBtn.classList.remove('active');
    });

    monthlyViewBtn.addEventListener('click', () => {
        fetchAndRenderChart(30);
        monthlyViewBtn.classList.add('active');
        weeklyViewBtn.classList.remove('active');
    });
}

// --- START THE APP ---
document.addEventListener('DOMContentLoaded', initializeDashboard);