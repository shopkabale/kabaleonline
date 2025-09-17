import { auth, db } from '../firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { collection, getDocs, doc, getDoc, deleteDoc, query, orderBy, updateDoc, where, writeBatch } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const adminContent = document.getElementById('admin-content');
const accessDenied = document.getElementById('access-denied');
const allProductsList = document.getElementById('all-products-list');
const userList = document.getElementById('user-list');
const pendingTestimonialsList = document.getElementById('pending-testimonials-list');
const approvedTestimonialsList = document.getElementById('approved-testimonials-list');

// --- AUTH CHECK & INITIALIZATION ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists() && userDoc.data().role === 'admin') {
            adminContent.style.display = 'block';
            accessDenied.style.display = 'none';
            initializeAdminPanel();
        } else {
            showAccessDenied();
        }
    } else {
        showAccessDenied();
    }
});

function showAccessDenied() {
    adminContent.style.display = 'none';
    accessDenied.style.display = 'block';
}

function initializeAdminPanel() {
    fetchAllUsers();
    fetchAllProducts();
    fetchTestimonialsForAdmin();
    setupEventListeners();
}

// --- USER MANAGEMENT ---
async function fetchAllUsers() {
    userList.innerHTML = '<p>Loading users...</p>';
    try {
        const usersQuery = query(collection(db, 'users'), orderBy('email'));
        const userSnapshot = await getDocs(usersQuery);

        if (userSnapshot.empty) {
            userList.innerHTML = '<li>No users found.</li>';
            return;
        }

        const referralCounts = {};
        userSnapshot.forEach(doc => {
            const userData = doc.data();
            if (userData.referrerId) {
                referralCounts[userData.referrerId] = (referralCounts[userData.referrerId] || 0) + 1;
            }
        });

        userList.innerHTML = '';
        userSnapshot.forEach(doc => {
            const userData = doc.data();
            const userId = doc.id;
            if (userData.role === 'admin') return;

            const isVerified = userData.isVerified || false;
            const referralCount = referralCounts[userId] || 0;

            const listItem = document.createElement('li');
            listItem.className = 'user-list-item';
            listItem.innerHTML = `
                <span class="user-info">
                    ${userData.email} ${isVerified ? '<span class="verified-badge">✔️ Verified</span>' : ''}
                    <br>
                    <span class="referral-info">Referrals: ${referralCount}</span>
                </span>
                <button class="action-btn ${isVerified ? 'red' : 'green'}" data-action="toggle-verify" data-uid="${userId}" data-status="${isVerified}">
                    ${isVerified ? 'Un-verify' : 'Verify'}
                </button>
            `;
            userList.appendChild(listItem);
        });
    } catch (error) {
        console.error("Error fetching users:", error);
        userList.innerHTML = '<li>Could not load users.</li>';
    }
}

async function toggleUserVerification(uid, currentStatus) {
    const newStatus = !JSON.parse(currentStatus);
    const userRef = doc(db, 'users', uid);
    try {
        await updateDoc(userRef, { isVerified: newStatus });
        const batch = writeBatch(db);
        const q = query(collection(db, 'products'), where("sellerId", "==", uid));
        const productSnapshot = await getDocs(q);
        productSnapshot.forEach((productDoc) => {
            batch.update(doc(db, 'products', productDoc.id), { sellerIsVerified: newStatus });
        });
        await batch.commit();
        alert(`User has been ${newStatus ? 'verified' : 'un-verified'}.`);
        fetchAllUsers(); 
        fetchAllProducts();
    } catch (error) {
        console.error("Verification toggle failed:", error);
        alert("Failed to update user verification.");
    }
}

// --- PRODUCT MANAGEMENT ---
async function fetchAllProducts() {
    allProductsList.innerHTML = '<p>Loading products...</p>';
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        allProductsList.innerHTML = "<p>No products found on the site.</p>";
        return;
    }
    allProductsList.innerHTML = '';
    querySnapshot.forEach((doc) => {
        const product = doc.data();
        const isDeal = product.isDeal || false;
        const verifiedBadge = product.sellerIsVerified ? '<span title="Verified Seller">✔️</span>' : '';

        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.innerHTML = `
            <img src="${product.imageUrls?.[0] || 'https://placehold.co/200'}" alt="${product.name}" loading="lazy">
            <h3>${product.name}</h3>
            <p class="price">UGX ${product.price.toLocaleString()}</p>
            <p style="font-size:0.8em;color:grey;padding:0 5px;word-break:break-all;">By: ${product.sellerName || 'N/A'} ${verifiedBadge}</p>
            <div class="seller-controls">
                <button class="deal-btn ${isDeal ? 'on-deal' : ''}" data-action="toggle-deal" data-id="${doc.id}" data-status="${isDeal}">
                    ${isDeal ? 'Remove Deal' : 'Make Deal'}
                </button>
                <button class="admin-delete" data-action="delete-product" data-id="${doc.id}" data-name="${product.name}">Delete</button>
            </div>
        `;
        allProductsList.appendChild(productCard);
    });
}

async function toggleDealStatusAsAdmin(productId, currentStatus) {
    const newStatus = !JSON.parse(currentStatus);
    await updateDoc(doc(db, 'products', productId), { isDeal: newStatus });
    fetchAllProducts();
}

async function deleteProductAsAdmin(productId, productName) {
    if (confirm(`ADMIN: Are you sure you want to delete "${productName}"? This is permanent.`)) {
        await deleteDoc(doc(db, 'products', productId));
        fetchAllProducts();
    }
}

// --- TESTIMONIAL MANAGEMENT ---
async function fetchTestimonialsForAdmin() {
    pendingTestimonialsList.innerHTML = '';
    approvedTestimonialsList.innerHTML = '';

    const q = query(collection(db, 'testimonials'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    let pendingCount = 0;
    let approvedCount = 0;

    snapshot.forEach(doc => {
        const testimonial = doc.data();
        const item = document.createElement('li');
        item.className = 'user-list-item';

        if (testimonial.status === 'pending') {
            pendingCount++;
            item.innerHTML = `
                <div style="flex-grow: 1;">
                    <p><strong>"${testimonial.quote}"</strong></p>
                    <p>- ${testimonial.authorName} <em>(${testimonial.authorDetail || 'N/A'})</em></p>
                </div>
                <div class="testimonial-controls">
                    <button class="action-btn green" data-action="approve-testimonial" data-id="${doc.id}">Approve</button>
                    <button class="action-btn red" data-action="delete-testimonial" data-id="${doc.id}">Delete</button>
                </div>
            `;
            pendingTestimonialsList.appendChild(item);
        } else { // Approved
            approvedCount++;
            item.innerHTML = `
               <div style="flex-grow: 1;">
                    <p><strong>"${testimonial.quote}"</strong></p>
                    <p>- ${testimonial.authorName} <em>(${testimonial.authorDetail || 'N/A'})</em></p>
                    <div style="margin-top: 5px;">
                        Order: <input type="number" value="${testimonial.order || 99}" data-action="update-order" data-id="${doc.id}" style="width: 60px; padding: 5px;">
                    </div>
                </div>
                <div class="testimonial-controls">
                    <button class="action-btn red" data-action="delete-testimonial" data-id="${doc.id}">Delete</button>
                </div>
            `;
            approvedTestimonialsList.appendChild(item);
        }
    });

    if (pendingCount === 0) pendingTestimonialsList.innerHTML = '<li>No pending feedback.</li>';
    if (approvedCount === 0) approvedTestimonialsList.innerHTML = '<li>No approved feedback.</li>';
}

async function approveTestimonial(id) {
    await updateDoc(doc(db, 'testimonials', id), { status: 'approved', order: 99 });
    fetchTestimonialsForAdmin();
}

async function deleteTestimonial(id) {
    if (confirm('Permanently delete this testimonial?')) {
        await deleteDoc(doc(db, 'testimonials', id));
        fetchTestimonialsForAdmin();
    }
}

async function updateTestimonialOrder(id, order) {
    await updateDoc(doc(db, 'testimonials', id), { order: Number(order) });
}

// --- EVENT LISTENER SETUP (EVENT DELEGATION) ---
function setupEventListeners() {
    // Products Grid Listener
    allProductsList.addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (!target) return;
        const { action, id, status, name } = target.dataset;

        if (action === 'toggle-deal') toggleDealStatusAsAdmin(id, status);
        if (action === 'delete-product') deleteProductAsAdmin(id, name);
    });

    // Users List Listener
    userList.addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (!target) return;
        const { action, uid, status } = target.dataset;

        if (action === 'toggle-verify') toggleUserVerification(uid, status);
    });

    // Testimonials Listeners
    pendingTestimonialsList.addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (!target) return;
        const { action, id } = target.dataset;

        if (action === 'approve-testimonial') approveTestimonial(id);
        if (action === 'delete-testimonial') deleteTestimonial(id);
    });

    approvedTestimonialsList.addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (!target) return;
        const { action, id } = target.dataset;

        if (action === 'delete-testimonial') deleteTestimonial(id);
    });

    approvedTestimonialsList.addEventListener('change', (e) => {
        const target = e.target.closest('input');
        if (!target || target.dataset.action !== 'update-order') return;
        
        updateTestimonialOrder(target.dataset.id, target.value);
    });
}
