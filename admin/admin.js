// ===========================
// Firebase Imports
// ===========================
import { auth, db } from '../firebase.js';
import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import {
    collection, getDocs, doc, getDoc, deleteDoc, query, orderBy, updateDoc
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// ===========================
// DOM Elements
// ===========================
const adminContent = document.getElementById('admin-content');
const accessDenied = document.getElementById('access-denied');
const allProductsList = document.getElementById('all-products-list');
const userList = document.getElementById('user-list');
const pendingTestimonialsList = document.getElementById('pending-testimonials-list');
const approvedTestimonialsList = document.getElementById('approved-testimonials-list');

// ===========================
// Auth Check
// ===========================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
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

// ===========================
// Init Panel
// ===========================
function initializeAdminPanel() {
    setupGlobalEventListeners();
    fetchAllUsers();
    fetchAllProducts();
    fetchTestimonialsForAdmin();
}

// ===========================
// Fetch All Users
// ===========================
async function fetchAllUsers() {
    userList.innerHTML = '<p>Loading users...</p>';
    try {
        const q = query(collection(db, 'users'), orderBy('email'));
        const snapshot = await getDocs(q);
        userList.innerHTML = '';
        snapshot.forEach(docSnap => {
            const userData = docSnap.data();
            if (userData.role === 'admin') return; // skip admins

            const isVerified = userData.isVerified || false;
            const li = document.createElement('li');
            li.className = 'user-list-item';
            li.innerHTML = `
                <span class="user-info">${userData.email} 
                    ${isVerified ? '<span class="verified-badge">✔️ Verified</span>' : ''}
                </span>
                <button class="action-btn ${isVerified ? 'red' : 'green'}" 
                        data-action="toggle-verify" 
                        data-uid="${docSnap.id}" 
                        data-status="${isVerified}">
                    ${isVerified ? 'Un-verify' : 'Verify'}
                </button>
            `;
            userList.appendChild(li);
        });
    } catch (e) {
        console.error("Error fetching users:", e);
        userList.innerHTML = '<li>Could not load users.</li>';
    }
}

// ===========================
// Fetch All Products
// ===========================
async function fetchAllProducts() {
    allProductsList.innerHTML = '<p>Loading products...</p>';
    try {
        const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);

        allProductsList.innerHTML = '';
        snapshot.forEach(docSnap => {
            const product = docSnap.data();
            const id = docSnap.id;
            const isDeal = product.isDeal || false;
            const verifiedBadge = product.sellerIsVerified ? '✔️' : '';

            const card = document.createElement('div');
            card.className = 'product-card';
            card.innerHTML = `
                <img src="${product.imageUrls?.[0] || 'https://placehold.co/200'}" alt="${product.name}">
                <h3>${product.name}</h3>
                <p class="price">UGX ${product.price?.toLocaleString() || 'N/A'}</p>
                <p style="font-size:0.8em;color:grey;word-break:break-all;">
                    By: ${product.sellerName || 'N/A'} ${verifiedBadge}
                </p>
                <div class="seller-controls">
                    <button class="deal-btn ${isDeal ? 'on-deal' : ''}" 
                            data-action="toggle-deal" 
                            data-id="${id}" 
                            data-status="${isDeal}">
                        ${isDeal ? 'Remove Deal' : 'Make Deal'}
                    </button>
                    <button class="admin-delete" 
                            data-action="delete-product" 
                            data-id="${id}" 
                            data-name="${product.name}">
                        Delete
                    </button>
                </div>
            `;
            allProductsList.appendChild(card);
        });
    } catch (e) {
        console.error("Error fetching products:", e);
        allProductsList.innerHTML = '<p>Could not load products.</p>';
    }
}

// ===========================
// Toggle Deal
// ===========================
async function handleToggleDeal(button) {
    const productId = button.dataset.id;
    const currentStatus = button.dataset.status === 'true';
    const newStatus = !currentStatus;

    button.disabled = true;
    button.textContent = 'Updating...';

    try {
        await updateDoc(doc(db, 'products', productId), { isDeal: newStatus });

        button.dataset.status = newStatus;
        button.textContent = newStatus ? 'Remove Deal' : 'Make Deal';
        button.classList.toggle('on-deal', newStatus);
    } catch (e) {
        console.error("Error updating deal:", e);
        alert("Error updating deal status. Check console for details.");
        button.textContent = currentStatus ? 'Remove Deal' : 'Make Deal';
    } finally {
        button.disabled = false;
    }
}

// ===========================
// Delete Product
// ===========================
async function handleDeleteProduct(button) {
    const id = button.dataset.id;
    if (!confirm(`Delete product "${button.dataset.name}"?`)) return;

    try {
        await deleteDoc(doc(db, 'products', id));
        fetchAllProducts(); // Refresh the list
    } catch (e) {
        console.error("Error deleting product:", e);
        alert("Could not delete product.");
    }
}

// ===========================
// Fetch Testimonials
// ===========================
async function fetchTestimonialsForAdmin() {
    pendingTestimonialsList.innerHTML = '<p>Loading...</p>';
    approvedTestimonialsList.innerHTML = '<p>Loading...</p>';

    try {
        const q = query(collection(db, 'testimonials'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);

        let pending = '';
        let approved = '';

        snapshot.forEach(docSnap => {
            const t = docSnap.data();
            const id = docSnap.id;

            const itemHTML = `
                <li class="user-list-item">
                    <div><p><strong>"${t.quote}"</strong></p>
                    <p>- ${t.authorName}</p></div>
                    <div class="testimonial-controls">
                        ${t.status === 'pending' ? 
                            `<button class="action-btn green" data-action="approve-testimonial" data-id="${id}">Approve</button>` : ''
                        }
                        <button class="action-btn red" data-action="delete-testimonial" data-id="${id}">Delete</button>
                    </div>
                </li>`;

            if (t.status === 'pending') {
                pending += itemHTML;
            } else {
                approved += itemHTML;
            }
        });

        pendingTestimonialsList.innerHTML = pending || '<li>No pending testimonials</li>';
        approvedTestimonialsList.innerHTML = approved || '<li>No approved testimonials</li>';
    } catch (e) {
        console.error("Error fetching testimonials:", e);
    }
}


// --- NEW FUNCTION START ---
// ===========================
// Approve Testimonial
// ===========================
async function handleApproveTestimonial(button) {
    const testimonialId = button.dataset.id;
    if (!testimonialId) return;

    button.disabled = true;
    button.textContent = 'Approving...';

    try {
        await updateDoc(doc(db, 'testimonials', testimonialId), {
            status: 'approved',
            order: Date.now()
        });
        fetchTestimonialsForAdmin(); // Refresh the lists
    } catch (e) {
        console.error("Error approving testimonial:", e);
        alert("Could not approve testimonial.");
        button.textContent = 'Approve';
        button.disabled = false;
    }
}
// --- NEW FUNCTION END ---


// --- NEW FUNCTION START ---
// ===========================
// Delete Testimonial
// ===========================
async function handleDeleteTestimonial(button) {
    const testimonialId = button.dataset.id;
    if (!testimonialId) return;

    if (!confirm("Are you sure you want to delete this testimonial permanently?")) {
        return;
    }

    button.disabled = true;
    button.textContent = 'Deleting...';

    try {
        await deleteDoc(doc(db, 'testimonials', testimonialId));
        fetchTestimonialsForAdmin(); // Refresh the lists
    } catch (e) {
        console.error("Error deleting testimonial:", e);
        alert("Could not delete testimonial.");
    }
}
// --- NEW FUNCTION END ---


// ===========================
// Global Event Listeners (NOW CORRECTED)
// ===========================
function setupGlobalEventListeners() {
    allProductsList.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        if (btn.dataset.action === 'toggle-deal') handleToggleDeal(btn);
        if (btn.dataset.action === 'delete-product') handleDeleteProduct(btn);
    });

    userList.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        if (btn.dataset.action === 'toggle-verify') {
            alert('User verification function has not been implemented yet.');
        }
    });

    pendingTestimonialsList.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        if (btn.dataset.action === 'approve-testimonial') {
            handleApproveTestimonial(btn);
        }
        if (btn.dataset.action === 'delete-testimonial') {
            handleDeleteTestimonial(btn);
        }
    });

    approvedTestimonialsList.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        if (btn.dataset.action === 'delete-testimonial') {
            handleDeleteTestimonial(btn);
        }
    });
}
