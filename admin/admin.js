import { auth, db } from '../js/auth.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { collection, getDocs, doc, getDoc, deleteDoc, query, orderBy, updateDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// DOM Elements
const adminContent = document.getElementById('admin-content');
const accessDenied = document.getElementById('access-denied');
const userList = document.getElementById('user-list');
const allProductsList = document.getElementById('all-products-list');
const pendingTestimonialsList = document.getElementById('pending-testimonials-list');
const approvedTestimonialsList = document.getElementById('approved-testimonials-list');
// NEW Payout Elements
const pendingTableBody = document.querySelector('#pending-requests-table tbody');
const completedTableBody = document.querySelector('#completed-requests-table tbody');

// Auth Check
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

// Init Panel
function initializeAdminPanel() {
    setupGlobalEventListeners();
    fetchPayoutRequests(); // NEW
    fetchAllUsers();
    fetchAllProducts();
    fetchTestimonialsForAdmin();
}

// ===================================
// NEW: Fetch and Display Payout Requests
// ===================================
async function fetchPayoutRequests() {
    pendingTableBody.innerHTML = '';
    completedTableBody.innerHTML = '';
    const q = query(collection(db, "payoutRequests"), orderBy("requestedAt", "desc"));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        pendingTableBody.innerHTML = '<tr><td colspan="5">No pending requests found.</td></tr>';
    }

    querySnapshot.forEach(docSnap => {
        const request = docSnap.data();
        const row = document.createElement('tr');
        const requestDate = request.requestedAt.toDate().toLocaleString();
        
        if (request.status === 'pending') {
            row.innerHTML = `
                <td>${request.userName}</td>
                <td>${request.userEmail}</td>
                <td>${request.amount.toLocaleString()}</td>
                <td>${requestDate}</td>
                <td><button class="action-btn green" data-action="mark-paid" data-id="${docSnap.id}">Mark as Paid</button></td>
            `;
            pendingTableBody.appendChild(row);
        } else {
            row.innerHTML = `
                <td>${request.userName}</td>
                <td>${request.userEmail}</td>
                <td>${request.amount.toLocaleString()}</td>
                <td>${requestDate}</td>
                <td class="status-paid">Paid</td>
            `;
            completedTableBody.appendChild(row);
        }
    });
}

async function handleMarkAsPaid(button) {
    const requestId = button.dataset.id;
    if (!requestId || !confirm("Are you sure you want to mark this request as paid?")) return;

    button.disabled = true;
    button.textContent = 'Updating...';
    try {
        await updateDoc(doc(db, 'payoutRequests', requestId), { status: 'paid' });
        await fetchPayoutRequests(); // Refresh the lists
    } catch (e) {
        console.error("Error marking as paid:", e);
        alert("Could not update the request.");
        button.disabled = false;
        button.textContent = 'Mark as Paid';
    }
}

// --- Your existing functions below ---
async function fetchAllUsers() { /* ... your code ... */ }
async function fetchAllProducts() { /* ... your code ... */ }
async function handleToggleDeal(button) { /* ... your code ... */ }
async function handleDeleteProduct(button) { /* ... your code ... */ }
async function fetchTestimonialsForAdmin() { /* ... your code ... */ }
async function handleApproveTestimonial(button) { /* ... your code ... */ }
async function handleDeleteTestimonial(button) { /* ... your code ... */ }

function setupGlobalEventListeners() {
    // NEW: Listener for Payout tables
    adminContent.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const action = btn.dataset.action;

        if (action === 'mark-paid') handleMarkAsPaid(btn);
        if (action === 'toggle-deal') handleToggleDeal(btn);
        if (action === 'delete-product') handleDeleteProduct(btn);
        if (action === 'toggle-verify') alert('User verification not implemented yet.');
        if (action === 'approve-testimonial') handleApproveTestimonial(btn);
        if (action === 'delete-testimonial') handleDeleteTestimonial(btn);
    });
}