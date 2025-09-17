/**
 * Creates an optimized and transformed Cloudinary URL.
 * @param {string} url The original Cloudinary URL.
 * @param {'thumbnail'|'full'} type The desired transformation type.
 * @returns {string} The new, transformed URL.
 */
function getCloudinaryTransformedUrl(url, type) {
    if (!url || !url.includes('res.cloudinary.com')) {
        return url || 'https://placehold.co/400x400/e0e0e0/777?text=No+Image';
    }
    const transformations = { thumbnail: 'c_fill,g_auto,w_250,h_250,f_auto,q_auto', full: 'c_limit,w_800,h_800,f_auto,q_auto' };
    const transformString = transformations[type] || transformations.thumbnail;
    const urlParts = url.split('/upload/');
    return urlParts.length !== 2 ? url : `${urlParts[0]}/upload/${transformString}/${urlParts[1]}`;
}

import { auth, db } from '../firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { collection, getDocs, doc, getDoc, deleteDoc, query, orderBy, updateDoc, where, writeBatch } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const adminContent = document.getElementById('admin-content');
const accessDenied = document.getElementById('access-denied');
const allProductsList = document.getElementById('all-products-list');
const userList = document.getElementById('user-list');
const pendingTestimonialsList = document.getElementById('pending-testimonials-list');
const approvedTestimonialsList = document.getElementById('approved-testimonials-list');

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists() && userDoc.data().role === 'admin') {
            accessDenied.style.display = 'none';
            adminContent.style.display = 'block';
            fetchAllProducts();
            fetchAllUsers();
            fetchTestimonialsForAdmin(); // Fetch testimonials
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

// ... your existing fetchAllUsers and toggleUserVerification functions ...
async function fetchAllUsers() { /* Your existing code here */ }
async function toggleUserVerification(uid, newStatus) { /* Your existing code here */ }


// --- NEW TESTIMONIAL MANAGEMENT FUNCTIONS ---

async function fetchTestimonialsForAdmin() {
    pendingTestimonialsList.innerHTML = '';
    approvedTestimonialsList.innerHTML = '';

    try {
        const q = query(collection(db, 'testimonials'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);

        let pendingCount = 0;
        let approvedCount = 0;

        snapshot.forEach(doc => {
            const testimonial = doc.data();
            const id = doc.id;
            const item = document.createElement('li');
            item.className = 'user-list-item';

            if (testimonial.status === 'pending') {
                pendingCount++;
                item.innerHTML = `
                    <div style="flex-grow: 1;">
                        <p><strong>"${testimonial.quote}"</strong></p>
                        <p>- ${testimonial.authorName} <em>(${testimonial.authorDetail || 'N/A'})</em></p>
                    </div>
                    <div>
                        <button class="verify-btn not-verified" data-id="${id}">Approve</button>
                        <button class="verify-btn verified" data-id="${id}">Delete</button>
                    </div>
                `;
                item.querySelector('.not-verified').addEventListener('click', () => approveTestimonial(id));
                item.querySelector('.verified').addEventListener('click', () => deleteTestimonial(id));
                pendingTestimonialsList.appendChild(item);
            } else { // Approved
                approvedCount++;
                item.innerHTML = `
                   <div style="flex-grow: 1;">
                        <p><strong>"${testimonial.quote}"</strong></p>
                        <p>- ${testimonial.authorName} <em>(${testimonial.authorDetail || 'N/A'})</em></p>
                        <div style="margin-top: 5px;">
                            Order: <input type="number" value="${testimonial.order || 99}" data-id="${id}" style="width: 60px; padding: 5px;">
                        </div>
                    </div>
                    <div>
                        <button class="verify-btn verified" data-id="${id}">Delete</button>
                    </div>
                `;
                item.querySelector('.verified').addEventListener('click', () => deleteTestimonial(id));
                item.querySelector('input').addEventListener('change', (e) => updateTestimonialOrder(e.target.dataset.id, e.target.value));
                approvedTestimonialsList.appendChild(item);
            }
        });

        if (pendingCount === 0) pendingTestimonialsList.innerHTML = '<li>No pending feedback.</li>';
        if (approvedCount === 0) approvedTestimonialsList.innerHTML = '<li>No approved feedback.</li>';
        
    } catch (error) {
        console.error("Error fetching testimonials for admin:", error);
    }
}

async function approveTestimonial(id) {
    if (!confirm('Are you sure you want to approve this testimonial? It will go live.')) return;
    const docRef = doc(db, 'testimonials', id);
    await updateDoc(docRef, { status: 'approved', order: 99 });
    fetchTestimonialsForAdmin();
}

async function deleteTestimonial(id) {
    if (!confirm('Are you sure you want to PERMANENTLY delete this testimonial?')) return;
    await deleteDoc(doc(db, 'testimonials', id));
    fetchTestimonialsForAdmin();
}

async function updateTestimonialOrder(id, order) {
    const docRef = doc(db, 'testimonials', id);
    await updateDoc(docRef, { order: Number(order) });
    alert("Order updated.");
    fetchTestimonialsForAdmin(); // Refresh to see the new order in action
}


// --- EXISTING PRODUCT MANAGEMENT FUNCTIONS ---

async function fetchAllProducts() {
    allProductsList.innerHTML = '';
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        allProductsList.innerHTML = "<p>No products found on the site.</p>";
        return;
    }

    querySnapshot.forEach((doc) => {
        const product = doc.data();
        const productId = doc.id;
        const isDeal = product.isDeal || false;
        const thumbnailUrl = getCloudinaryTransformedUrl(product.imageUrls?.[0], 'thumbnail');
        const verifiedBadge = product.sellerIsVerified ? '<span title="Verified Seller">✔️</span>' : '';
        const sellerName = product.sellerName || product.sellerEmail;

        const productCard = document.createElement('div');
        productCard.className = 'product-card';

        productCard.innerHTML = `
            <img src="${thumbnailUrl}" alt="${product.name}" loading="lazy">
            <h3>${product.name}</h3>
            <p class="price">UGX ${product.price.toLocaleString()}</p>
            <p style="font-size: 0.8em; color: grey; padding: 0 10px; word-break: break-all;">
                By: ${sellerName} ${verifiedBadge}
            </p>
            <div class="seller-controls">
                <button class="deal-btn ${isDeal ? 'on-deal' : ''}" data-id="${productId}">
                    ${isDeal ? 'Remove from Deals' : 'Add to Deals'}
                </button>
                <button class="delete-btn admin-delete" data-id="${productId}" data-name="${product.name}">Delete (Admin)</button>
            </div>
        `;

        productCard.querySelector('.deal-btn').addEventListener('click', () => toggleDealStatusAsAdmin(productId, isDeal));
        productCard.querySelector('.admin-delete').addEventListener('click', (e) => deleteProductAsAdmin(e.target.dataset.id, e.target.dataset.name));
        allProductsList.appendChild(productCard);
    });
}

async function toggleDealStatusAsAdmin(productId, currentStatus) {
    const productRef = doc(db, 'products', productId);
    try {
        await updateDoc(productRef, { isDeal: !currentStatus });
        fetchAllProducts();
    } catch (error) {
        alert("Failed to update deal status.");
    }
}

async function deleteProductAsAdmin(productId, productName) {
    if (confirm(`ADMIN: Are you sure you want to delete "${productName}"? This cannot be undone.`)) {
        try {
            await deleteDoc(doc(db, 'products', productId));
            alert('Product deleted by admin.');
            fetchAllProducts();
        } catch (error) {
            alert("Failed to delete product.");
        }
    }
}
