import { auth, db } from '../js/auth.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { collection, getDocs, doc, getDoc, deleteDoc, query, orderBy, updateDoc, where, serverTimestamp, getCountFromServer } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- DOM ELEMENTS ---
const adminContent = document.getElementById('admin-content');
const accessDenied = document.getElementById('access-denied');
const userList = document.getElementById('user-list');
const allProductsList = document.getElementById('all-products-list');
const pendingTestimonialsList = document.getElementById('pending-testimonials-list');
const approvedTestimonialsList = document.getElementById('approved-testimonials-list');

// --- AUTH CHECK ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists() && userDoc.data().role === 'admin') {
                adminContent.style.display = 'block';
                accessDenied.style.display = 'none';
                initializeAdminPanel();
            } else {
                showAccessDenied();
            }
        } catch (error) {
            console.error("Auth check failed:", error);
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
    fetchAllUsers();
    fetchAllProducts();
    fetchTestimonialsForAdmin();
}

function setupGlobalEventListeners() {
    adminContent.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn || !btn.dataset.action) return;
        
        const action = btn.dataset.action;
        const handlers = {
            'toggle-deal': handleToggleDeal,
            'delete-product': handleDeleteProduct,
            'toggle-verify': handleToggleVerify,
            'approve-testimonial': handleApproveTestimonial,
            'delete-testimonial': handleDeleteTestimonial,
            'toggle-hero': handleToggleHero,
            'toggle-save': handleToggleSaveOnMore, // NEW
            'toggle-sponsor': handleToggleSponsor    // NEW
        };

        if (handlers[action]) {
            handlers[action](btn);
        }
    });
}

// --- HELPER FUNCTION FOR TOGGLES ---
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

// --- NEW TOGGLE HANDLERS ---
function handleToggleSaveOnMore(button) {
    handleGenericToggle(button, 'isSaveOnMore', 'Save');
}

function handleToggleSponsor(button) {
    handleGenericToggle(button, 'isSponsored', 'Sponsor');
}

function handleToggleDeal(button) {
    handleGenericToggle(button, 'isDeal', 'Deal');
}


// --- EXISTING LOGIC (UNCHANGED) ---

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
                fetchAllProducts(); 
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
            li.innerHTML = `<span class="user-info">${userData.email} ${isVerified ? '<span class="verified-badge">✔️ Verified</span>' : ''}</span><button class="action-btn ${isVerified ? 'red' : 'green'}" data-action="toggle-verify" data-uid="${docSnap.id}" data-status="${isVerified}">${isVerified ? 'Un-verify' : 'Verify'}</button>`; 
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
    button.disabled = true; button.textContent = 'Updating...'; 
    try { 
        await updateDoc(doc(db, 'users', userId), { isVerified: newStatus }); 
        await fetchAllUsers(); 
    } catch(e) { 
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
            card.innerHTML = `
                <img src="${product.imageUrls?.[0] || 'https://placehold.co/200'}" alt="${product.name}" loading="lazy" width="200" height="200">
                <h3>${product.name}</h3>
                <p class="price">UGX ${product.price?.toLocaleString() || 'N/A'}</p>
                <p style="font-size:0.8em;color:grey;word-break:break-all;">By: ${product.sellerName || 'N/A'} ${verifiedBadge}</p>
                <div class="seller-controls">
                    <button class="deal-btn ${isDeal ? 'on-deal' : ''}" data-action="toggle-deal" data-id="${id}" data-status="${isDeal}">
                        ${isDeal ? 'Remove Deal' : 'Make Deal'}
                    </button>
                    <button class="save-btn ${isSaveOnMore ? 'on-save' : ''}" data-action="toggle-save" data-id="${id}" data-status="${isSaveOnMore}">
                        ${isSaveOnMore ? 'Remove Save' : 'Add to Save'}
                    </button>
                    <button class="sponsor-btn ${isSponsored ? 'on-sponsor' : ''}" data-action="toggle-sponsor" data-id="${id}" data-status="${isSponsored}">
                        ${isSponsored ? 'Remove Sponsor' : 'Sponsor Item'}
                    </button>
                    <button class="action-btn ${isHero ? 'red' : 'blue'}" data-action="toggle-hero" data-id="${id}" data-is-hero="${isHero}">
                        ${isHero ? 'Remove Hero' : 'Add to Hero'}
                    </button>
                    <button class="admin-delete" data-action="delete-product" data-id="${id}" data-name="${product.name.replace(/"/g, '&quot;')}">Delete</button>
                </div>
            `;
            allProductsList.appendChild(card);
        });
    } catch (e) {
        console.error("Error fetching products:", e);
        allProductsList.innerHTML = '<p>Could not load products.</p>';
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
            const itemHTML = `<li class="user-list-item"><div><p><strong>"${t.quote}"</strong></p><p>- ${t.authorName}</p></div><div class="testimonial-controls">${t.status === 'pending' ? `<button class="action-btn green" data-action="approve-testimonial" data-id="${id}">Approve</button>` : ''}<button class="action-btn red" data-action="delete-testimonial" data-id="${id}">Delete</button></div></li>`; 
            if (t.status === 'pending') { pending += itemHTML; } else { approved += itemHTML; } 
        }); 
        pendingTestimonialsList.innerHTML = pending || '<li>No pending testimonials</li>'; 
        approvedTestimonialsList.innerHTML = approved || '<li>No approved testimonials</li>'; 
    } catch (e) { 
        console.error("Error fetching testimonials:", e); 
    } 
}

async function handleApproveTestimonial(button) { 
    const testimonialId = button.dataset.id; 
    button.disabled = true; button.textContent = 'Approving...'; 
    try { 
        await updateDoc(doc(db, 'testimonials', testimonialId), { status: 'approved', order: Date.now() }); 
        fetchTestimonialsForAdmin(); 
    } catch (e) { 
        console.error("Error approving testimonial:", e); 
        alert("Could not approve."); 
    } 
}

async function handleDeleteTestimonial(button) { 
    const testimonialId = button.dataset.id; 
    if (!confirm("Delete this testimonial?")) return; 
    button.disabled = true; 
    button.textContent = 'Deleting...'; 
    try { 
        await deleteDoc(doc(db, 'testimonials', testimonialId)); 
        fetchTestimonialsForAdmin(); 
    } catch (e) { 
        console.error("Error deleting testimonial:", e); 
        alert("Could not delete."); 
    } 
}