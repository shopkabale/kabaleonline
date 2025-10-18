import { auth, db } from '../firebase.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { collection, getDocs, doc, getDoc, deleteDoc, query, orderBy, updateDoc, where, serverTimestamp, Timestamp, getCountFromServer } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- DOM ELEMENTS ---
const adminContent = document.getElementById('admin-content');
const accessDenied = document.getElementById('access-denied');
const loader = document.getElementById('loader');
const adminNameEl = document.getElementById('admin-name');
const logoutBtn = document.getElementById('logout-btn');

// Stat Card Elements
const totalUsersStat = document.getElementById('total-users-stat');
const totalProductsStat = document.getElementById('total-products-stat');
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

// Management Section Elements
const userList = document.getElementById('user-list');
const allProductsList = document.getElementById('all-products-list');
const pendingTestimonialsList = document.getElementById('pending-testimonials-list');
const approvedTestimonialsList = document.getElementById('approved-testimonials-list');

// Chart Elements
const weeklyViewBtn = document.getElementById('weekly-view-btn');
const monthlyViewBtn = document.getElementById('monthly-view-btn');
let activityChart = null;

/**
 * Main initialization function.
 */
function initializeAdminPanel() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists() && userDoc.data().role === 'admin') {
                    adminNameEl.textContent = userDoc.data().name || user.email;
                    adminContent.style.display = 'block';
                    loader.style.display = 'none';
                    await fetchAllStats();
                    fetchManagementData();
                    setupEventListeners();
                } else {
                    showAccessDenied();
                }
            } catch (error) {
                console.error("Error verifying admin role:", error);
                showAccessDenied();
            }
        } else {
            showAccessDenied(true);
        }
    });
}

function showAccessDenied(redirectToLogin = false) {
    adminContent.style.display = 'none';
    loader.style.display = 'none';
    accessDenied.style.display = 'block';
    if (redirectToLogin) {
        window.location.href = '/login/';
    }
}

/**
 * Fetches all high-level statistics concurrently for performance.
 */
async function fetchAllStats() {
    try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        let totalWishlistedItems = 0;
        let totalReferralCount = 0;

        // Iterate through users for complex stats not available in getCountFromServer
        for (const userDoc of usersSnapshot.docs) {
            // Correctly count referrals by summing the referralCount field
            totalReferralCount += userDoc.data().referralCount || 0;

            // Correctly count wishlisted items from subcollections
            const wishlistCol = collection(db, 'users', userDoc.id, 'wishlist');
            const wishlistSnapshot = await getCountFromServer(wishlistCol);
            totalWishlistedItems += wishlistSnapshot.data().count;
        }

        // Fetch simple counts in parallel
        const [
            productCount, orderCount, rentalCount, eventCount,
            testimonialCount, serviceCount, pendingProducts, pendingTestimonials,
            salesData
        ] = await Promise.all([
            getCountFromServer(collection(db, 'products')),
            getCountFromServer(collection(db, 'orders')),
            getCountFromServer(collection(db, 'rentals')),
            getCountFromServer(collection(db, 'events')),
            getCountFromServer(collection(db, 'testimonials')),
            getCountFromServer(collection(db, 'services')),
            getCountFromServer(query(collection(db, 'products'), where('status', '==', 'pending'))),
            getCountFromServer(query(collection(db, 'testimonials'), where('status', '==', 'pending'))),
            getDocs(query(collection(db, 'products'), where('isSold', '==', true))),
        ]);

        const totalSalesValue = salesData.docs.reduce((sum, doc) => sum + (doc.data().price || 0), 0);
        
        // Update UI with all correct values
        totalUsersStat.textContent = usersSnapshot.size;
        totalProductsStat.textContent = productCount.data().count;
        totalOrdersStat.textContent = orderCount.data().count;
        totalSalesStat.textContent = `UGX ${totalSalesValue.toLocaleString()}`;
        totalWishlistStat.textContent = totalWishlistedItems;
        totalReferralsStat.textContent = totalReferralCount;
        totalRentalsStat.textContent = rentalCount.data().count;
        totalEventsStat.textContent = eventCount.data().count;
        totalServicesStat.textContent = serviceCount.data().count;
        pendingProductsCount.textContent = pendingProducts.data().count;
        pendingTestimonialsCount.textContent = pendingTestimonials.data().count;
        
        fetchAndRenderChart(7);

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

    const labels = Array.from({ length: days }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (days - 1 - i));
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

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
                    if (index >= 0 && index < counts.length) {
                       counts[index]++;
                    }
                }
            }
        });
        return counts;
    };

    try {
        const [userCounts, productCounts, orderCounts, serviceCounts] = await Promise.all([
            fetchDataForTimespan('users'),
            fetchDataForTimespan('products'),
            fetchDataForTimespan('orders'),
            fetchDataForTimespan('services')
        ]);
        renderActivityChart(labels, userCounts, productCounts, orderCounts, serviceCounts);
    } catch (error) {
        console.error("Error fetching chart data:", error);
    }
}

/**
 * Renders a line chart with multiple datasets.
 */
function renderActivityChart(labels, userCounts, productCounts, orderCounts, serviceCounts) {
    const ctx = document.getElementById('activity-chart');
    if (!ctx) return;
    if (activityChart) {
        activityChart.destroy();
    }
    
    const isDarkMode = document.body.classList.contains('dark-mode');
    const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const labelColor = isDarkMode ? '#e2e8f0' : '#34495e';

    activityChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                { label: 'Users', data: userCounts, borderColor: 'rgba(54, 162, 235, 1)', tension: 0.1, fill: false },
                { label: 'Products', data: productCounts, borderColor: 'rgba(255, 99, 132, 1)', tension: 0.1, fill: false },
                { label: 'Orders', data: orderCounts, borderColor: 'rgba(75, 192, 192, 1)', tension: 0.1, fill: false },
                { label: 'Services', data: serviceCounts, borderColor: 'rgba(255, 159, 64, 1)', tension: 0.1, fill: false },
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
    logoutBtn.addEventListener('click', () => { signOut(auth).catch(error => console.error("Logout Error:", error)); });

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
    
    // Setup for accordions and other dynamic buttons
}

// Placeholder for management functions if you add them back
function fetchManagementData() {}

// --- START THE APP ---
document.addEventListener('DOMContentLoaded', initializeAdminPanel);