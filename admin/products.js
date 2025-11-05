// products.js
import { db } from '../firebase.js';
import { checkAdminAuth, setupHeader } from './admin-common.js';
// Import all necessary functions from your original file
import { collection, getDocs, doc, deleteDoc, query, orderBy, updateDoc, where, serverTimestamp, getCountFromServer } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- DOM ELEMENTS (for this page) ---
const adminContent = document.getElementById('admin-content');
const loader = document.getElementById('loader');
const allProductsList = document.getElementById('all-products-list');
const pendingProductsList = document.getElementById('pending-products-list');

/**
 * Main initialization function.
 */
function initializeProductManagement() {
    checkAdminAuth((adminData) => {
        setupHeader(adminData.name); 
        adminContent.style.display = 'block';
        loader.style.display = 'none';

        // Call your original function to fetch products
        fetchAllProducts();
        // Set up the event listener for this page
        setupEventListeners();
    });
}

/**
 * This event listener is adapted for the product-only actions
 */
function setupEventListeners() {
    adminContent.addEventListener('click', (e) => {
        const button = e.target.closest('button[data-action]');
        if (!button) return;
        
        const action = button.dataset.action;
        
        switch(action) {
            // Product Toggles (Copied from your original)
            case 'toggle-deal': handleToggleDeal(button); break;
            case 'toggle-hero': handleToggleHero(button); break;
            case 'toggle-save': handleToggleSaveOnMore(button); break;
            case 'toggle-sponsor': handleToggleSponsor(button); break;
            case 'delete-product': handleDeleteProduct(button); break;

            // New action for this page's layout
            case 'approve-product': handleApproveProduct(button); break;
        }
    });
}


// --- ALL PRODUCT FUNCTIONS COPIED FROM YOUR admin.js ---

/**
 * Generic helper function to toggle a boolean field on a product.
 * (Copied from your file)
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

// --- TOGGLE HANDLERS (Copied from your file) ---
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
                return; // This line is from your original
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


/**
 * fetchAllProducts - Adapted for the new page layout
 * It now splits products into 'pending' and 'all'
 * The logic for creating the card (card.innerHTML) is COPIED EXACTLY from your file.
 */
async function fetchAllProducts() {
    allProductsList.innerHTML = '<p>Loading products...</p>';
    pendingProductsList.innerHTML = '<p>Loading products...</p>'; // Added for the new list
    
    try {
        const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) { 
            allProductsList.innerHTML = '<p>No products found.</p>'; 
            pendingProductsList.innerHTML = '<p>No pending products.</p>';
            return; 
        }
        
        // Use HTML strings for pending/all lists
        let allProductsHTML = '';
        let pendingProductsHTML = '';

        snapshot.forEach(docSnap => {
            const product = docSnap.data();
            const id = docSnap.id;
            const isDeal = product.isDeal || false;
            const isHero = product.isHero || false;
            const isSaveOnMore = product.isSaveOnMore || false; 
            const isSponsored = product.isSponsored || false; 
            const verifiedBadge = product.sellerIsVerified ? '✔️' : '';

            // Check if product is pending
            const isPending = product.status === 'pending';
            
            // Add approve button if pending
            const approveButton = isPending 
                ? `<button class="action-btn green" data-action="approve-product" data-id="${id}">Approve</button>` 
                : '';

            // This is YOUR EXACT card.innerHTML logic
            const cardHTML = `
                <div class="product-card ${isPending ? 'pending-card' : ''}">
                    <img src="${product.imageUrls?.[0] || 'https://placehold.co/200'}" alt="${product.name}" loading="lazy" width="200" height="200">
                    <h3>${product.name}</h3>
                    <p class="price">UGX ${product.price?.toLocaleString() || 'N/A'}</p>
                    <p style="font-size:0.8em;color:grey;word-break:break-all;">By: ${product.sellerName || 'N/A'} ${verifiedBadge}</p>
                    <div class="seller-controls">
                        ${approveButton}
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
                </div>
            `;
            
            // Add the card HTML to the correct list
            if (isPending) {
                pendingProductsHTML += cardHTML;
            } else {
                allProductsHTML += cardHTML;
            }
        });
        
        // Render the lists
        allProductsList.innerHTML = allProductsHTML || '<p>No approved products found.</p>';
        pendingProductsList.innerHTML = pendingProductsHTML || '<p>No products pending approval.</p>';

    } catch (e) {
        console.error("Error fetching products:", e);
        allProductsList.innerHTML = '<p>Could not load products. Your original code may have failed on a product with missing data. Check the console (F12).</p>';
    }
}

/**
 * handleDeleteProduct - Copied from your file
 */
async function handleDeleteProduct(button) { 
    const id = button.dataset.id; 
    const name = button.dataset.name;
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    try { 
        await deleteDoc(doc(db, 'products', id)); 
        await fetchAllProducts(); 
        
        // --- NOTE ---
        // This is the "commented out" part you asked about.
        // The following lines from your original file were removed
        // because 'totalProductsStat' does not exist on this page
        // and would cause a crash.
        
        // const productCount = await getCountFromServer(collection(db, 'products'));
        // totalProductsStat.textContent = productCount.data().count;

    } catch (e) { 
        console.error("Error deleting product:", e); 
        alert("Could not delete product."); 
    } 
}

/**
 * handleApproveProduct - This function is new, but
 * required for the "Pending" list to work.
 */
async function handleApproveProduct(button) {
    const productId = button.dataset.id;
    if (!confirm('Are you sure you want to approve this product?')) return;

    button.disabled = true;
    button.textContent = 'Approving...';
    try {
        await updateDoc(doc(db, 'products', productId), { status: 'approved' });
        await fetchAllProducts(); // Refresh both lists
    } catch (e) {
        console.error("Error approving product:", e);
        alert('Error approving product.');
    }
}


// --- START THE APP ---
document.addEventListener('DOMContentLoaded', initializeProductManagement);