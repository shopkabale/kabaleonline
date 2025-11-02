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

                    // Setup UI interactivity immediately.
                    setupEventListeners();

                    // Fetch data in the background without blocking the UI.
                    fetchAllStats();
                    fetchManagementData();

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

        for (const userDoc of usersSnapshot.docs) {
            totalReferralCount += userDoc.data().referralCount || 0;
            const wishlistCol = collection(db, 'users', userDoc.id, 'wishlist');
            const wishlistSnapshot = await getCountFromServer(wishlistCol);
            totalWishlistedItems += wishlistSnapshot.data().count;
        }

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

    // --- UPGRADED EVENT LISTENER ---
    adminContent.addEventListener('click', (e) => {
        const button = e.target.closest('button[data-action]');
        if (!button) return;
        
        const action = button.dataset.action;
        
        switch(action) {
            // User Toggles
            case 'toggle-verify': handleToggleVerify(button); break;
            
            // Product Toggles
            case 'toggle-deal': handleToggleDeal(button); break;
            case 'toggle-hero': handleToggleHero(button); break;
            case 'toggle-save': handleToggleSaveOnMore(button); break;
            case 'toggle-sponsor': handleToggleSponsor(button); break;
            case 'delete-product': handleDeleteProduct(button); break;

            // Testimonial Toggles
            case 'approve-testimonial': handleApproveTestimonial(button); break;
            case 'delete-testimonial': handleDeleteTestimonial(button); break;
        }
    });
}

// --- NEW HELPER FUNCTIONS (FROM FILE 2) ---

/**
 * Generic helper function to toggle a boolean field on a product.
 */
async function handleGenericToggle(button, fieldName, friendlyName) {
    const productId = button.dataset.id;
    const currentStatus = button.dataset.status === 'true';
    const newStatus = !currentStatus;
    
    button.disabled = true;
    button.textContent = 'Updating...';
    try {
        await updateDoc(doc(db, 'products', productId), { [fieldName]: newStatus });
        button.dataset.status = newStatus;
        button.textContent = newStatus ? `Remove ${friendlyName}` : `Make ${friendlyName}`;
        button.classList.toggle(`on-${fieldName.toLowerCase().replace('is','')}`, newStatus);
    } catch (e) {
        console.error(`Error updating ${friendlyName}:`, e);
        alert(`Error updating ${friendlyName} status.`);
        button.dataset.status = currentStatus;
        button.textContent = currentStatus ? `Remove ${friendlyName}` : `Make ${friendlyName}`;
        button.classList.toggle(`on-${fieldName.toLowerCase().replace('is','')}`, currentStatus);
    } finally {
        button.disabled = false;
    }
}

// --- NEW TOGGLE HANDLERS (FROM FILE 2) ---
function handleToggleSaveOnMore(button) {
    handleGenericToggle(button, 'isSaveOnMore', 'Save');
}

function handleToggleSponsor(button) {
    handleGenericToggle(button, 'isSponsored', 'Sponsor');
}

function handleToggleDeal(button) {
    handleGenericToggle(button, 'isDeal', 'Deal');
}

async function handleToggleHero(button) {
    const productId = button.dataset.id;
    const currentStatus = button.dataset.isHero === 'true';
    const newStatus = !currentStatus;

    button.disabled = true;
    button.textContent = 'Updating...';

    try {
        if (newStatus === true) {
            const productsRef = collection(db, 'products');
            const q = query(productsRef, where('isHero', '==', true));
            const countSnapshot = await getCountFromServer(q);
            if (countSnapshot.data().count >= 6) {
                alert('Hero slider is full (6 items max). Please remove another item first.');
                fetchAllProducts(); // Refresh to show correct state
                return;
            }
        }
        const productRef = doc(db, 'products', productId);
        await updateDoc(productRef, {
            isHero: newStatus,
            ...(newStatus && { heroTimestamp: serverTimestamp() })
        });
        await fetchAllProducts();
    } catch (e) {
        console.error("Error toggling hero status:", e);
        alert("Could not update hero status.");
        await fetchAllProducts();
    }
}


// --- MANAGEMENT DATA FUNCTIONS ---

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
        if (snapshot.empty) { userList.innerHTML = '<li>No users found.</li>'; return; }
        userList.innerHTML = '';
        snapshot.forEach(docSnap => {
            const userData = docSnap.data();
            if (userData.role === 'admin') return;
            const isVerified = userData.isVerified || false;
            const li = document.createElement('li');
            li.className = 'user-list-item';
            li.innerHTML = `<span class="user-info">${userData.email} ${isVerified ? '<span style="color:green;">✔️ Verified</span>' : ''}</span><button class="action-btn ${isVerified ? 'red' : 'green'}" data-action="toggle-verify" data-uid="${docSnap.id}" data-status="${isVerified}">${isVerified ? 'Un-verify' : 'Verify'}</button>`;
            userList.appendChild(li);
        });
    } catch (e) { console.error("Error fetching users:", e); userList.innerHTML = '<li>Could not load users.</li>'; }
}

async function handleToggleVerify(button) {
    const userId = button.dataset.uid;
    const currentStatus = button.dataset.status === 'true';
    const newStatus = !currentStatus;
    if (!confirm(`Are you sure you want to ${newStatus ? 'verify' : 'un-verify'} this user?`)) return;
    button.disabled = true; button.textContent = 'Updating...';
    try {
        await updateDoc(doc(db, 'users', userId), { isVerified: newStatus });
        await fetchAllUsers();
    } catch (e) { console.error("Error toggling user verification:", e); alert("Failed to update status."); button.disabled = false; button.textContent = currentStatus ? 'Un-verify' : 'Verify'; }
}

// --- REPLACED/UPGRADED: fetchAllProducts ---
async function fetchAllProducts() {
    allProductsList.innerHTML = '<p>Loading products...</p>';
    try {
        const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        if (snapshot.empty) { allProductsList.innerHTML = '<p>No products found.</p>'; return; }
        allProductsList.innerHTML = '';
        snapshot.forEach(docSnap => {
            const product = docSnap.data();
            const id = docSnap.id;
            const isDeal = product.isDeal || false;
            const isHero = product.isHero || false;
            const isSaveOnMore = product.isSaveOnMore || false; 
            const isSponsored = product.isSponsored || false; 
            const verifiedBadge = product.sellerIsVerified ? '✔️' : '';

            const card = document.createElement('div');
            card.className = 'product-card';
            // This innerHTML is from File 2, as it's more feature-rich
            card.innerHTML = `
                <img src="${product.imageUrls?.[0] || 'https://placehold.co/200'}" alt="${product.name}" loading="lazy" width="200" height="200">
                <h3>${product.name}</h3>
                <p class="price">UGX ${product.price?.toLocaleString() || 'N/A'}</p>
                <p style="font-size:0.8em;color:grey;word-break:break-all;">By: ${product.sellerName || 'N/A'} ${verifiedBadge}</p>
                <div class="seller-controls">
                    <button class="action-btn product-toggle-btn ${isDeal ? 'on-deal' : ''}" data-action="toggle-deal" data-id="${id}" data-status="${isDeal}">
                        ${isDeal ? 'Remove Deal' : 'Make Deal'}
                    </button>
                    <button class="action-btn product-toggle-btn ${isSaveOnMore ? 'on-save' : ''}" data-action="toggle-save" data-id="${id}" data-status="${isSaveOnMore}">
                        ${isSaveOnMore ? 'Remove Save' : 'Add to Save'}
                    </button>
                    <button class="action-btn product-toggle-btn ${isSponsored ? 'on-sponsor' : ''}" data-action="toggle-sponsor" data-id="${id}" data-status="${isSponsored}">
                        ${isSponsored ? 'Remove Sponsor' : 'Sponsor Item'}
                    </button>
                    <button class="action-btn product-toggle-btn ${isHero ? 'red' : 'blue'}" data-action="toggle-hero" data-id="${id}" data-is-hero="${isHero}">
                        ${isHero ? 'Remove Hero' : 'Add to Hero'}
                    </button>
                    <button class="action-btn red" data-action="delete-product" data-id="${id}" data-name="${product.name.replace(/"/g, '&quot;')}">Delete</button>
                </div>
            `;
            allProductsList.appendChild(card);
        });
    } catch (e) {
        console.error("Error fetching products:", e);
        allProductsList.innerHTML = '<p>Could not load products.</p>';
    }
}

// --- REPLACED/UPGRADED: handleDeleteProduct ---
async function handleDeleteProduct(button) { 
    const id = button.dataset.id; 
    const name = button.dataset.name;
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    try { 
        await deleteDoc(doc(db, 'products', id)); 
        // No need to call fetchAllStats(), just refresh the product list
        await fetchAllProducts(); 
        // We can update just the product count stat for efficiency
        const productCount = await getCountFromServer(collection(db, 'products'));
        totalProductsStat.textContent = productCount.data().count;
    } catch (e) { 
        console.error("Error deleting product:", e); 
        alert("Could not delete product."); 
    } 
}

// --- UNCHANGED: fetchTestimonialsForAdmin ---
async function fetchTestimonialsForAdmin() {
    pendingTestimonialsList.innerHTML = '<li>Loading...</li>';
    approvedTestimonialsList.innerHTML = '<li>Loading...</li>';
    try {
        const q = query(collection(db, 'testimonials'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        let pendingHTML = ''; let approvedHTML = '';
        snapshot.forEach(docSnap => {
            const t = docSnap.data();
            const itemHTML = `<li class="user-list-item"><div><p><strong>"${t.quote}"</strong></p><p>- ${t.authorName}</p></div><div style="display:flex; gap:10px;">${t.status === 'pending' ? `<button class="action-btn green" data-action="approve-testimonial" data-id="${docSnap.id}">Approve</button>` : ''}<button class="action-btn red" data-action="delete-testimonial" data-id="${docSnap.id}">Delete</button></div></li>`;
            if (t.status === 'pending') { pendingHTML += itemHTML; } else { approvedHTML += itemHTML; }
        });
        pendingTestimonialsList.innerHTML = pendingHTML || '<li>No pending testimonials.</li>';
        approvedTestimonialsList.innerHTML = approvedHTML || '<li>No approved testimonials.</li>';
    } catch (e) { console.error("Error fetching testimonials:", e); }
}

// --- MODIFIED: handleApproveTestimonial (to accept button) ---
async function handleApproveTestimonial(button) {
    const id = button.dataset.id;
    button.disabled = true; button.textContent = 'Approving...';
    try {
        await updateDoc(doc(db, 'testimonials', id), { status: 'approved', order: Date.now() });
        fetchManagementData();
        fetchAllStats(); // Keep this to update pending count
    } catch (e) { console.error("Error approving testimonial:", e); alert("Could not approve."); }
}

// --- MODIFIED: handleDeleteTestimonial (to accept button) ---
async function handleDeleteTestimonial(button) {
    const id = button.dataset.id;
    if (!confirm("Delete this testimonial?")) return;
    button.disabled = true; button.textContent = 'Deleting...';
    try {
        await deleteDoc(doc(db, 'testimonials', id));
        fetchManagementData();
        fetchAllStats(); // Keep this to update pending count
    } catch (e) { console.error("Error deleting testimonial:", e); alert("Could not delete."); }
}

// --- START THE APP ---
document.addEventListener('DOMContentLoaded', initializeAdminPanel);