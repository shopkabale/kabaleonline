import { auth, db } from '../firebase.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { collection, getDocs, doc, getDoc, deleteDoc, query, orderBy, updateDoc, where, serverTimestamp, Timestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

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

// Action Card Elements
const pendingProductsCount = document.getElementById('pending-products-count');
const pendingTestimonialsCount = document.getElementById('pending-testimonials-count');

// Management Section Elements
const userList = document.getElementById('user-list');
const allProductsList = document.getElementById('all-products-list');
const pendingTestimonialsList = document.getElementById('pending-testimonials-list');
const approvedTestimonialsList = document.getElementById('approved-testimonials-list');

let activityChart = null; // To hold the Chart.js instance

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
                    fetchAllStats();
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
 * A reusable helper function to get the document count of a collection by fetching docs.
 * This method works with standard 'read' permissions.
 * @param {string} collectionName - The name of the Firestore collection.
 * @returns {Promise<number>} - The total number of documents.
 */
async function fetchCollectionCount(collectionName) {
    const collRef = collection(db, collectionName);
    const snapshot = await getDocs(collRef);
    return snapshot.size;
}

/**
 * A reusable helper function to get the count of items pending approval by fetching docs.
 * @param {string} collectionName - The name of the Firestore collection.
 * @returns {Promise<number>} - The number of documents with 'pending' status.
 */
async function fetchPendingCount(collectionName) {
    const q = query(collection(db, collectionName), where('status', '==', 'pending'));
    const snapshot = await getDocs(q);
    return snapshot.size;
}

/**
 * Fetches all necessary statistics for the admin dashboard concurrently.
 */
async function fetchAllStats() {
    try {
        const [
            userCount, productCount, orderCount, rentalCount, eventCount,
            testimonialCount, referralCount, pendingProducts, pendingTestimonials,
            salesData, wishlistCount
        ] = await Promise.all([
            fetchCollectionCount('users'),
            fetchCollectionCount('products'),
            fetchCollectionCount('orders'),
            fetchCollectionCount('rentals'),
            fetchCollectionCount('events'),
            fetchCollectionCount('testimonials'),
            fetchCollectionCount('referrals'),
            fetchPendingCount('products'),
            fetchPendingCount('testimonials'),
            getDocs(query(collection(db, 'products'), where('isSold', '==', true))),
            getDocs(query(collection(db, 'users'), where('wishlist', '!=', [])))
        ]);

        const totalSalesValue = salesData.docs.reduce((sum, doc) => sum + (doc.data().price || 0), 0);
        const totalWishlistedItems = wishlistCount.docs.reduce((sum, doc) => sum + (doc.data().wishlist?.length || 0), 0);

        // Update UI
        totalUsersStat.textContent = userCount;
        totalProductsStat.textContent = productCount;
        totalOrdersStat.textContent = orderCount;
        totalSalesStat.textContent = `UGX ${totalSalesValue.toLocaleString()}`;
        totalWishlistStat.textContent = totalWishlistedItems;
        totalReferralsStat.textContent = referralCount;
        totalRentalsStat.textContent = rentalCount;
        totalEventsStat.textContent = eventCount;
        pendingProductsCount.textContent = pendingProducts;
        pendingTestimonialsCount.textContent = pendingTestimonials;
        
        fetchChartData();

    } catch (error) {
        console.error("Error fetching stats:", error);
        // Display an error message to the admin
        document.querySelector('.stats-grid').innerHTML = '<p>Could not load statistics. Please check console for errors.</p>';
    }
}

/**
 * Fetches data for the last 7 days to populate the activity chart.
 */
async function fetchChartData() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoTimestamp = Timestamp.fromDate(sevenDaysAgo);

    const labels = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toLocaleDateString('en-US', { weekday: 'short' });
    }).reverse();

    const fetchDataForLast7Days = async (collectionName) => {
        const counts = new Array(7).fill(0);
        const q = query(collection(db, collectionName), where('createdAt', '>=', sevenDaysAgoTimestamp));
        const snapshot = await getDocs(q);
        snapshot.forEach(doc => {
            if (doc.data().createdAt) {
                const docDate = doc.data().createdAt.toDate();
                const today = new Date();
                const diffDays = Math.floor((today.setHours(0,0,0,0) - docDate.setHours(0,0,0,0)) / (1000 * 3600 * 24));
                if (diffDays >= 0 && diffDays < 7) {
                    counts[6 - diffDays]++;
                }
            }
        });
        return counts;
    };

    try {
        const [userCounts, productCounts, orderCounts] = await Promise.all([
            fetchDataForLast7Days('users'),
            fetchDataForLast7Days('products'),
            fetchDataForLast7Days('orders')
        ]);
        renderActivityChart(labels, userCounts, productCounts, orderCounts);
    } catch (error) {
        console.error("Error fetching chart data:", error);
    }
}

/**
 * Renders the Chart.js bar chart with fetched data.
 */
function renderActivityChart(labels, userCounts, productCounts, orderCounts) {
    const ctx = document.getElementById('recent-activity-chart');
    if (!ctx) return;
    if (activityChart) {
        activityChart.destroy();
    }
    
    const isDarkMode = document.body.classList.contains('dark-mode');
    const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const labelColor = isDarkMode ? '#e2e8f0' : '#34495e';

    activityChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                { label: 'New Users', data: userCounts, backgroundColor: 'rgba(54, 162, 235, 0.7)' },
                { label: 'New Products', data: productCounts, backgroundColor: 'rgba(255, 99, 132, 0.7)' },
                { label: 'New Orders', data: orderCounts, backgroundColor: 'rgba(75, 192, 192, 0.7)' }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: { beginAtZero: true, ticks: { color: labelColor, stepSize: 1 }, grid: { color: gridColor } },
                x: { ticks: { color: labelColor }, grid: { color: gridColor } }
            },
            plugins: {
                legend: { labels: { color: labelColor } }
            }
        }
    });
}

/**
 * Sets up global event listeners for the page.
 */
function setupEventListeners() {
    logoutBtn.addEventListener('click', () => {
        signOut(auth).catch(error => console.error("Logout Error:", error));
    });

    const accordions = document.querySelectorAll('.accordion-header');
    accordions.forEach(header => {
        header.addEventListener('click', () => {
            header.classList.toggle('active');
            const content = header.nextElementSibling;
            if (content.style.maxHeight) {
                content.style.maxHeight = null;
            } else {
                content.style.maxHeight = content.scrollHeight + "px";
            }
        });
    });

    adminContent.addEventListener('click', (e) => {
        const button = e.target.closest('button[data-action]');
        if (!button) return;

        const action = button.dataset.action;
        const id = button.dataset.id || button.dataset.uid;
        const name = button.dataset.name;

        switch(action) {
            case 'toggle-verify':
                handleToggleVerify(button);
                break;
            case 'delete-product':
                handleDeleteProduct(id, name);
                break;
            case 'approve-testimonial':
                handleApproveTestimonial(id);
                break;
            case 'delete-testimonial':
                handleDeleteTestimonial(id);
                break;
        }
    });
}

/**
 * Fetches data for the management sections.
 */
function fetchManagementData() {
    fetchAllUsers();
    fetchAllProducts();
    fetchTestimonialsForAdmin();
}

async function fetchAllUsers() {
    userList.innerHTML = '<li>Loading users...</li>';
    try {
        const q = query(collection(db, 'users'), orderBy('email'));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            userList.innerHTML = '<li>No users found.</li>';
            return;
        }
        userList.innerHTML = '';
        snapshot.forEach(docSnap => {
            const userData = docSnap.data();
            if (userData.role === 'admin') return;
            const isVerified = userData.isVerified || false;
            const li = document.createElement('li');
            li.className = 'user-list-item';
            li.innerHTML = `
                <span class="user-info">
                    ${userData.email} ${isVerified ? '<span class="verified-badge" style="color:green;">✔️ Verified</span>' : ''}
                </span>
                <button class="action-btn ${isVerified ? 'red' : 'green'}" data-action="toggle-verify" data-uid="${docSnap.id}" data-status="${isVerified}">
                    ${isVerified ? 'Un-verify' : 'Verify'}
                </button>`;
            userList.appendChild(li);
        });
    } catch (e) {
        console.error("Error fetching users:", e);
        userList.innerHTML = '<li>Could not load users.</li>';
    }
}

async function handleToggleVerify(button) {
    const userId = button.dataset.uid;
    const currentStatus = button.dataset.status === 'true';
    const newStatus = !currentStatus;
    if (!confirm(`Are you sure you want to ${newStatus ? 'verify' : 'un-verify'} this user?`)) return;
    
    button.disabled = true;
    button.textContent = 'Updating...';
    try {
        await updateDoc(doc(db, 'users', userId), { isVerified: newStatus });
        await fetchAllUsers(); // Refresh the list
    } catch (e) {
        console.error("Error toggling user verification:", e);
        alert("Failed to update status.");
        button.disabled = false;
        button.textContent = currentStatus ? 'Un-verify' : 'Verify';
    }
}

async function fetchAllProducts() {
    allProductsList.innerHTML = '<p>Loading products...</p>';
    try {
        const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
             allProductsList.innerHTML = '<p>No products found.</p>';
             return;
        }
        allProductsList.innerHTML = '';
        snapshot.forEach(docSnap => {
            const product = docSnap.data();
            const card = document.createElement('div');
            card.className = 'product-card';
            card.innerHTML = `
                <img src="${product.imageUrls?.[0] || 'https://placehold.co/200'}" alt="${product.name}" loading="lazy">
                <h3>${product.name}</h3>
                <p class="price">UGX ${product.price?.toLocaleString() || 'N/A'}</p>
                <div class="seller-controls">
                    <button class="action-btn red" data-action="delete-product" data-id="${docSnap.id}" data-name="${product.name.replace(/"/g, '&quot;')}">Delete</button>
                </div>
            `;
            allProductsList.appendChild(card);
        });
    } catch (e) {
        console.error("Error fetching products:", e);
        allProductsList.innerHTML = '<p>Could not load products.</p>';
    }
}

async function handleDeleteProduct(id, name) {
    if (!confirm(`Are you sure you want to delete the product "${name}"? This action cannot be undone.`)) return;
    try {
        await deleteDoc(doc(db, 'products', id));
        await fetchAllProducts(); // Refresh list
        await fetchAllStats(); // Refresh stats
    } catch (e) {
        console.error("Error deleting product:", e);
        alert("Could not delete product.");
    }
}

async function fetchTestimonialsForAdmin() {
    pendingTestimonialsList.innerHTML = '<li>Loading...</li>';
    approvedTestimonialsList.innerHTML = '<li>Loading...</li>';
    try {
        const q = query(collection(db, 'testimonials'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        let pendingHTML = '';
        let approvedHTML = '';
        snapshot.forEach(docSnap => {
            const t = docSnap.data();
            const itemHTML = `
                <li class="user-list-item">
                    <div>
                        <p><strong>"${t.quote}"</strong></p>
                        <p>- ${t.authorName}</p>
                    </div>
                    <div class="testimonial-controls" style="display:flex; gap:10px;">
                        ${t.status === 'pending' ? `<button class="action-btn green" data-action="approve-testimonial" data-id="${docSnap.id}">Approve</button>` : ''}
                        <button class="action-btn red" data-action="delete-testimonial" data-id="${docSnap.id}">Delete</button>
                    </div>
                </li>`;
            if (t.status === 'pending') {
                pendingHTML += itemHTML;
            } else {
                approvedHTML += itemHTML;
            }
        });
        pendingTestimonialsList.innerHTML = pendingHTML || '<li>No pending testimonials.</li>';
        approvedTestimonialsList.innerHTML = approvedHTML || '<li>No approved testimonials.</li>';
    } catch (e) {
        console.error("Error fetching testimonials:", e);
    }
}

async function handleApproveTestimonial(id) {
    try {
        await updateDoc(doc(db, 'testimonials', id), { status: 'approved', order: Date.now() });
        await fetchTestimonialsForAdmin();
        await fetchAllStats(); // Refresh stats
    } catch (e) {
        console.error("Error approving testimonial:", e);
        alert("Could not approve.");
    }
}

async function handleDeleteTestimonial(id) {
    if (!confirm("Are you sure you want to delete this testimonial?")) return;
    try {
        await deleteDoc(doc(db, 'testimonials', id));
        await fetchTestimonialsForAdmin();
        await fetchAllStats(); // Refresh stats
    } catch (e) {
        console.error("Error deleting testimonial:", e);
        alert("Could not delete.");
    }
}

// --- START THE APP ---
document.addEventListener('DOMContentLoaded', initializeAdminPanel);