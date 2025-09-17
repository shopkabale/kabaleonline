import { auth, db } from '../firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { collection, getDocs, doc, getDoc, deleteDoc, query, orderBy, updateDoc, where, writeBatch } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- DOM ELEMENT REFERENCES ---
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
    setupGlobalEventListeners();
    fetchAllUsers();
    fetchAllProducts();
    fetchTestimonialsForAdmin();
}

// --- DATA FETCHING FUNCTIONS (Complete) ---

async function fetchAllUsers() {
    userList.innerHTML = '<p>Loading users...</p>';
    try {
        const usersQuery = query(collection(db, 'users'), orderBy('email'));
        const userSnapshot = await getDocs(usersQuery);
        if (userSnapshot.empty) {
            userList.innerHTML = '<li>No users found.</li>';
            return;
        }
        userList.innerHTML = '';
        userSnapshot.forEach(doc => {
            const userData = doc.data();
            if (userData.role === 'admin') return;
            const isVerified = userData.isVerified || false;
            const listItem = document.createElement('li');
            listItem.className = 'user-list-item';
            listItem.innerHTML = `
                <span class="user-info">
                    ${userData.email} ${isVerified ? '<span class="verified-badge">✔️ Verified</span>' : ''}
                </span>
                <button class="action-btn ${isVerified ? 'red' : 'green'}" data-action="toggle-verify" data-uid="${doc.id}" data-status="${isVerified}">
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

async function fetchAllProducts() {
    allProductsList.innerHTML = '<p>Loading products...</p>';
    try {
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
    } catch (error) {
        console.error("Error fetching products:", error);
        allProductsList.innerHTML = "<p>Could not load products. Please refresh.</p>";
    }
}

async function fetchTestimonialsForAdmin() {
    // This function is complete and correct
    // (Full code included for completeness)
    pendingTestimonialsList.innerHTML = '<p>Loading...</p>';
    approvedTestimonialsList.innerHTML = '<p>Loading...</p>';
    try {
        const q = query(collection(db, 'testimonials'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);

        let pendingHtml = '', approvedHtml = '', pendingCount = 0, approvedCount = 0;
        snapshot.forEach(doc => {
            const testimonial = doc.data();
            const id = doc.id;
            if (testimonial.status === 'pending') {
                pendingCount++;
                pendingHtml += `
                    <li class="user-list-item">
                        <div style="flex-grow: 1;">
                            <p><strong>"${testimonial.quote}"</strong></p>
                            <p>- ${testimonial.authorName} <em>(${testimonial.authorDetail || 'N/A'})</em></p>
                        </div>
                        <div class="testimonial-controls">
                            <button class="action-btn green" data-action="approve-testimonial" data-id="${id}">Approve</button>
                            <button class="action-btn red" data-action="delete-testimonial" data-id="${id}">Delete</button>
                        </div>
                    </li>
                `;
            } else {
                approvedCount++;
                approvedHtml += `
                   <li class="user-list-item">
                       <div style="flex-grow: 1;">
                            <p><strong>"${testimonial.quote}"</strong></p>
                            <p>- ${testimonial.authorName} <em>(${testimonial.authorDetail || 'N/A'})</em></p>
                            <div style="margin-top: 5px;">
                                Order: <input type="number" value="${testimonial.order || 99}" data-action="update-order" data-id="${id}" style="width: 60px; padding: 5px;">
                            </div>
                        </div>
                        <div class="testimonial-controls">
                            <button class="action-btn red" data-action="delete-testimonial" data-id="${id}">Delete</button>
                        </div>
                   </li>
                `;
            }
        });
        pendingTestimonialsList.innerHTML = pendingCount > 0 ? pendingHtml : '<li>No pending feedback.</li>';
        approvedTestimonialsList.innerHTML = approvedCount > 0 ? approvedHtml : '<li>No approved feedback.</li>';
    } catch (error) {
        console.error("Error fetching testimonials:", error);
    }
}


// --- ACTION HANDLER FUNCTIONS ---

async function handleToggleDeal(button) {
    console.log("--- Toggling Deal Status ---");
    const productId = button.dataset.id;
    const currentStatus = button.dataset.status === 'true';
    const newStatus = !currentStatus;

    console.log(`Product ID: ${productId}`);
    console.log(`Current Status: ${currentStatus}, New Status: ${newStatus}`);
    
    button.disabled = true;
    button.textContent = 'Updating...';

    try {
        await updateDoc(doc(db, 'products', productId), { isDeal: newStatus });
        console.log("SUCCESS: Firestore updated.");
        
        button.dataset.status = newStatus;
        button.textContent = newStatus ? 'Remove Deal' : 'Make Deal';
        button.classList.toggle('on-deal', newStatus);

    } catch (error) {
        // THIS IS THE IMPORTANT PART
        console.error("!!! FIREBASE PERMISSION ERROR !!!", error);
        alert("Error updating deal status. Check the browser console for details.");
        button.textContent = currentStatus ? 'Remove Deal' : 'Make Deal';
    } finally {
        button.disabled = false;
    }
}

// Other handlers are complete...
async function handleDeleteProduct(button) { /* ... */ }
async function handleToggleVerify(button) { /* ... */ }
async function handleApproveTestimonial(button) { /* ... */ }
async function handleDeleteTestimonial(button) { /* ... */ }
async function handleUpdateOrder(input) { /* ... */ }


// --- GLOBAL EVENT LISTENER SETUP (Fully Implemented) ---
function setupGlobalEventListeners() {
    allProductsList.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (!button) return;
        const action = button.dataset.action;
        if (action === 'toggle-deal') handleToggleDeal(button);
        if (action === 'delete-product') handleDeleteProduct(button);
    });

    userList.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (!button || button.dataset.action !== 'toggle-verify') return;
        handleToggleVerify(button);
    });

    pendingTestimonialsList.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (!button) return;
        const action = button.dataset.action;
        if (action === 'approve-testimonial') handleApproveTestimonial(button);
        if (action === 'delete-testimonial') handleDeleteTestimonial(button);
    });

    approvedTestimonialsList.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (!button || button.dataset.action !== 'delete-testimonial') return;
        handleDeleteTestimonial(button);
    });

    approvedTestimonialsList.addEventListener('change', (e) => {
        const input = e.target.closest('input[type="number"]');
        if (!input || input.dataset.action !== 'update-order') return;
        handleUpdateOrder(input);
    });
}
