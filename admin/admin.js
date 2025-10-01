import { auth, db } from '../js/auth.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { collection, getDocs, doc, getDoc, deleteDoc, query, orderBy, updateDoc, where, serverTimestamp, runTransaction, increment } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- DOM ELEMENTS ---
const adminContent = document.getElementById('admin-content');
const accessDenied = document.getElementById('access-denied');
const userList = document.getElementById('user-list');
const allProductsList = document.getElementById('all-products-list');
const pendingTestimonialsList = document.getElementById('pending-testimonials-list');
const approvedTestimonialsList = document.getElementById('approved-testimonials-list');
const pendingTableBody = document.querySelector('#pending-requests-table tbody');
const completedTableBody = document.querySelector('#completed-requests-table tbody');
const pendingReferralsTableBody = document.querySelector('#pending-referrals-table tbody');

// --- AUTH CHECK ---
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

// --- INIT PANEL & EVENT LISTENERS ---
function initializeAdminPanel() {
    setupGlobalEventListeners();
    fetchPayoutRequests();
    fetchPendingReferrals();
    fetchAllUsers();
    fetchAllProducts();
    fetchTestimonialsForAdmin();
}

function setupGlobalEventListeners() {
    adminContent.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn || !btn.dataset.action) return;
        const action = btn.dataset.action;

        if (action === 'mark-paid') handleMarkAsPaid(btn);
        if (action === 'approve-referral') handleApproveReferral(btn);
        if (action === 'toggle-deal') handleToggleDeal(btn);
        if (action === 'delete-product') handleDeleteProduct(btn);
        if (action === 'toggle-verify') handleToggleVerify(btn);
        if (action === 'approve-testimonial') handleApproveTestimonial(btn);
        if (action === 'delete-testimonial') handleDeleteTestimonial(btn);
    });
}

// --- PAYOUT REQUESTS LOGIC ---
async function fetchPayoutRequests() {
    pendingTableBody.innerHTML = '<tr><td colspan="5">Loading...</td></tr>';
    completedTableBody.innerHTML = '<tr><td colspan="5">Loading...</td></tr>';
    try {
        const q = query(collection(db, "payoutRequests"), orderBy("requestedAt", "desc"));
        const querySnapshot = await getDocs(q);
        let pendingHTML = '';
        let completedHTML = '';

        if (querySnapshot.empty) {
            pendingTableBody.innerHTML = '<tr><td colspan="5">No pending requests found.</td></tr>';
            completedTableBody.innerHTML = '<tr><td colspan="5">No completed requests found.</td></tr>';
            return;
        }

        querySnapshot.forEach(docSnap => {
            const request = docSnap.data();
            const requestDate = request.requestedAt ? request.requestedAt.toDate().toLocaleString() : 'N/A';
            const rowHTML = `
                <tr>
                    <td>${request.userName || 'N/A'}</td>
                    <td>${request.userEmail || 'N/A'}</td>
                    <td>${request.amount.toLocaleString()}</td>
                    <td>${requestDate}</td>
                    ${request.status === 'pending' 
                        ? `<td><button class="action-btn green" data-action="mark-paid" data-id="${docSnap.id}">Mark as Paid</button></td>` 
                        : `<td class="status-paid">Paid</td>`
                    }
                </tr>
            `;
            if (request.status === 'pending') {
                pendingHTML += rowHTML;
            } else {
                completedHTML += rowHTML;
            }
        });
        pendingTableBody.innerHTML = pendingHTML || '<tr><td colspan="5">No pending requests found.</td></tr>';
        completedTableBody.innerHTML = completedHTML || '<tr><td colspan="5">No completed requests found.</td></tr>';
    } catch (e) {
        console.error("Error fetching payout requests:", e);
        pendingTableBody.innerHTML = '<tr><td colspan="5">Error loading requests.</td></tr>';
    }
}

async function handleMarkAsPaid(button) {
    const requestId = button.dataset.id;
    if (!requestId || !confirm("Are you sure you want to mark this request as paid?")) return;

    button.disabled = true;
    button.textContent = 'Updating...';
    try {
        await updateDoc(doc(db, 'payoutRequests', requestId), { status: 'paid' });
        await fetchPayoutRequests();
    } catch (e) {
        console.error("Error marking as paid:", e);
        alert("Could not update the request.");
        button.disabled = false;
        button.textContent = 'Mark as Paid';
    }
}

// --- REFERRAL APPROVAL LOGIC ---
async function fetchPendingReferrals() {
    if (!pendingReferralsTableBody) return;
    pendingReferralsTableBody.innerHTML = '<tr><td colspan="4">Loading...</td></tr>';
    try {
        const q = query(collection(db, "referralValidationRequests"), where("status", "==", "pending"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            pendingReferralsTableBody.innerHTML = '<tr><td colspan="4">No pending referrals to approve.</td></tr>';
            return;
        }
        let html = '';
        snapshot.forEach(doc => {
            const request = doc.data();
            html += `
                <tr>
                    <td>${request.referrerEmail}</td>
                    <td>${request.referredUserName}</td>
                    <td>${request.createdAt.toDate().toLocaleDateString()}</td>
                    <td><button class="action-btn green" data-action="approve-referral" data-id="${doc.id}" data-referrer-id="${request.referrerId}">Approve</button></td>
                </tr>
            `;
        });
        pendingReferralsTableBody.innerHTML = html;
    } catch (e) {
        console.error("Error fetching pending referrals:", e);
        pendingReferralsTableBody.innerHTML = '<tr><td colspan="4">Error loading referrals. Check console.</td></tr>';
    }
}

async function handleApproveReferral(button) {
    const { id, referrerId } = button.dataset;
    if (!id || !referrerId || !confirm("Approve this referral for 250 UGX?")) return;

    button.disabled = true;
    button.textContent = 'Approving...';
    try {
        const requestRef = doc(db, "referralValidationRequests", id);
        const referrerRef = doc(db, "users", referrerId);
        await runTransaction(db, async (transaction) => {
            transaction.update(requestRef, { status: "approved", approvedAt: serverTimestamp() });
            transaction.update(referrerRef, { referralBalanceUGX: increment(250) });
        });
        await fetchPendingReferrals();
    } catch (e) {
        console.error("Error approving referral:", e);
        alert("Could not approve referral.");
        button.disabled = false;
        button.textContent = 'Approve';
    }
}


// --- USER MANAGEMENT LOGIC ---
async function fetchAllUsers() {
    userList.innerHTML = '<p>Loading users...</p>';
    try {
        const q = query(collection(db, 'users'), orderBy('email'));
        const snapshot = await getDocs(q);
        userList.innerHTML = '';
        snapshot.forEach(docSnap => {
            const userData = docSnap.data();
            if (userData.role === 'admin') return;
            const isVerified = userData.isVerified || false;
            const li = document.createElement('li');
            li.className = 'user-list-item';
            li.innerHTML = `
                <span class="user-info">${userData.email} 
                    ${isVerified ? '<span class="verified-badge">✔️ Verified</span>' : ''}
                </span>
                <button class="action-btn ${isVerified ? 'red' : 'green'}" data-action="toggle-verify" data-uid="${docSnap.id}" data-status="${isVerified}">
                    ${isVerified ? 'Un-verify' : 'Verify'}
                </button>
            `;
            userList.appendChild(li);
        });
    } catch (e) {
        console.error("Error fetching users:", e);
        userList.innerHTML = '<li>Could not load users. Check console for errors.</li>';
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
        await fetchAllUsers();
    } catch(e) {
        console.error("Error toggling user verification:", e);
        alert("Failed to update user verification status.");
        button.disabled = false;
        button.textContent = currentStatus ? 'Un-verify' : 'Verify';
    }
}

// --- PRODUCT MANAGEMENT LOGIC ---
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
                <img src="${product.imageUrls?.[0] || 'https://placehold.co/200'}" alt="${product.name}" loading="lazy" width="200" height="200">
                <h3>${product.name}</h3>
                <p class="price">UGX ${product.price?.toLocaleString() || 'N/A'}</p>
                <p style="font-size:0.8em;color:grey;word-break:break-all;">By: ${product.sellerName || 'N/A'} ${verifiedBadge}</p>
                <div class="seller-controls">
                    <button class="deal-btn ${isDeal ? 'on-deal' : ''}" data-action="toggle-deal" data-id="${id}" data-status="${isDeal}">
                        ${isDeal ? 'Remove Deal' : 'Make Deal'}
                    </button>
                    <button class="admin-delete" data-action="delete-product" data-id="${id}" data-name="${product.name}">Delete</button>
                </div>
            `;
            allProductsList.appendChild(card);
        });
    } catch (e) {
        console.error("Error fetching products:", e);
        allProductsList.innerHTML = '<p>Could not load products.</p>';
    }
}

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
        alert("Error updating deal status.");
    } finally {
        button.disabled = false;
    }
}

async function handleDeleteProduct(button) {
    const id = button.dataset.id;
    if (!confirm(`Delete product "${button.dataset.name}"?`)) return;
    try {
        await deleteDoc(doc(db, 'products', id));
        fetchAllProducts();
    } catch (e) {
        console.error("Error deleting product:", e);
        alert("Could not delete product.");
    }
}

// --- TESTIMONIAL MANAGEMENT LOGIC ---
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
                    <div><p><strong>"${t.quote}"</strong></p><p>- ${t.authorName}</p></div>
                    <div class="testimonial-controls">
                        ${t.status === 'pending' ? `<button class="action-btn green" data-action="approve-testimonial" data-id="${id}">Approve</button>` : ''}
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

async function handleApproveTestimonial(button) {
    const testimonialId = button.dataset.id;
    button.disabled = true;
    button.textContent = 'Approving...';
    try {
        await updateDoc(doc(db, 'testimonials', testimonialId), { status: 'approved', order: Date.now() });
        fetchTestimonialsForAdmin();
    } catch (e) {
        console.error("Error approving testimonial:", e);
        alert("Could not approve testimonial.");
    }
}

async function handleDeleteTestimonial(button) {
    const testimonialId = button.dataset.id;
    if (!confirm("Are you sure you want to delete this testimonial?")) return;
    button.disabled = true;
    button.textContent = 'Deleting...';
    try {
        await deleteDoc(doc(db, 'testimonials', testimonialId));
        fetchTestimonialsForAdmin();
    } catch (e) {
        console.error("Error deleting testimonial:", e);
        alert("Could not delete testimonial.");
    }
}