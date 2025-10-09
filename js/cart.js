import { auth, db } from '../firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { collection, doc, getDoc, getDocs, updateDoc, deleteDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { showModal } from '../shared.js'; // Assuming shared.js is in the root js folder

// --- DOM ELEMENT VARIABLES (DECLARED) ---
let cartItemsContainer, emptyCartMessage, orderSummarySection, summarySubtotal, summaryTotal, checkoutBtn, continueShoppingBtn;

// --- STATE ---
let currentUser = null;
let cartItems = [];

// --- UTILITY & RENDER FUNCTIONS ---
function formatPrice(price) { return `UGX ${price.toLocaleString()}`; }

function renderCart() {
    if (cartItems.length === 0) {
        emptyCartMessage.style.display = 'block';
        orderSummarySection.style.display = 'none';
        checkoutBtn.style.display = 'none';
        cartItemsContainer.innerHTML = '';
        emptyCartMessage.innerHTML = `
            <div class="empty-cart-message">
                <i class="fas fa-shopping-cart"></i>
                <p>Your cart is empty.</p>
                <a href="/shop/" class="continue-shopping-btn" style="text-decoration:none; display:inline-block; width:auto; border-width: 2px;">Start Shopping</a>
            </div>`;
        return;
    }

    emptyCartMessage.style.display = 'none';
    orderSummarySection.style.display = 'block';
    checkoutBtn.style.display = 'block';
    cartItemsContainer.innerHTML = '';
    
    let subtotal = 0;

    cartItems.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'cart-item-card';
        itemDiv.dataset.productId = item.productId;
        subtotal += item.price * item.quantity;

        itemDiv.innerHTML = `
            <img src="${item.imageUrl || 'https://placehold.co/80'}" alt="${item.productName}" class="cart-item-image">
            <div class="cart-item-details">
                <h4>${item.productName}</h4>
                <p class="cart-item-price">${formatPrice(item.price)}</p>
                <div class="quantity-controls">
                    <button class="minus-btn" data-product-id="${item.productId}" ${item.quantity <= 1 ? 'disabled' : ''}>-</button>
                    <span class="item-quantity-display">${item.quantity}</span>
                    <button class="plus-btn" data-product-id="${item.productId}" ${item.quantity >= item.stockQuantity ? 'disabled' : ''}>+</button>
                </div>
            </div>
            <button class="delete-btn" data-product-id="${item.productId}" aria-label="Remove item">
                <i class="fas fa-trash-alt"></i>
            </button>
        `;
        cartItemsContainer.appendChild(itemDiv);
    });
    
    summarySubtotal.textContent = formatPrice(subtotal);
    summaryTotal.textContent = formatPrice(subtotal);
}

// --- CART ACTIONS ---
async function fetchCartItems(uid) {
    cartItemsContainer.innerHTML = '<p class="loading-indicator">Loading cart...</p>';
    if (!uid) { renderCart(); return; }

    try {
        const cartCollectionRef = collection(db, 'users', uid, 'cart');
        const cartSnapshot = await getDocs(query(cartCollectionRef, orderBy('addedAt', 'desc')));
        
        const fetchedItemsPromises = cartSnapshot.docs.map(async (cartDoc) => {
            const cartData = cartDoc.data();
            const productRef = doc(db, 'products', cartData.productId);
            const productSnap = await getDoc(productRef);
            if (productSnap.exists()) {
                const productData = productSnap.data();
                return {
                    cartItemId: cartDoc.id,
                    productId: cartData.productId,
                    name: productData.name,
                    price: productData.price,
                    imageUrl: productData.imageUrls?.[0],
                    sellerName: productData.sellerName,
                    quantity: cartData.quantity,
                    stockQuantity: productData.quantity || 0,
                };
            } else {
                await deleteDoc(doc(db, 'users', uid, 'cart', cartDoc.id));
                return null;
            }
        });
        cartItems = (await Promise.all(fetchedItemsPromises)).filter(Boolean);
        renderCart();
    } catch (error) {
        console.error("Error fetching cart items:", error);
        cartItemsContainer.innerHTML = '<p class="error-message">Failed to load cart. Please try again.</p>';
    }
}

async function updateItemQuantity(productId, newQuantity) {
    if (!currentUser) return;
    const itemToUpdate = cartItems.find(item => item.productId === productId);
    if (!itemToUpdate) return;
    
    if (newQuantity > itemToUpdate.stockQuantity) {
        alert(`Only ${itemToUpdate.stockQuantity} of "${itemToUpdate.name}" are available.`);
        return;
    }
    if (newQuantity < 1) newQuantity = 1;

    try {
        const cartItemDocRef = doc(db, 'users', currentUser.uid, 'cart', itemToUpdate.cartItemId);
        await updateDoc(cartItemDocRef, { quantity: newQuantity });
        itemToUpdate.quantity = newQuantity;
        renderCart();
    } catch (error) { console.error("Error updating quantity:", error); }
}

async function removeCartItem(productId) {
    if (!currentUser) return;
    const itemToRemove = cartItems.find(item => item.productId === productId);
    if (!itemToRemove) return;

    if (confirm(`Are you sure you want to remove "${itemToRemove.name}"?`)) {
        try {
            await deleteDoc(doc(db, 'users', currentUser.uid, 'cart', itemToRemove.cartItemId));
            cartItems = cartItems.filter(item => item.productId !== productId);
            renderCart();
        } catch (error) { console.error("Error removing item:", error); }
    }
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    // Assign DOM Elements once the page is loaded
    cartItemsContainer = document.getElementById('cart-items-container');
    emptyCartMessage = document.getElementById('empty-cart-message');
    orderSummarySection = document.getElementById('order-summary-section');
    summarySubtotal = document.getElementById('summary-subtotal');
    summaryTotal = document.getElementById('summary-total');
    checkoutBtn = document.querySelector('.checkout-btn');
    continueShoppingBtn = document.querySelector('.continue-shopping-btn');

    // Attach Event Listeners
    cartItemsContainer.addEventListener('click', (event) => {
        const targetButton = event.target.closest('button');
        if (!targetButton) return;
        
        const productId = targetButton.dataset.productId;
        if (!productId) return;
        
        const item = cartItems.find(i => i.productId === productId);
        if (!item) return;

        if (targetButton.classList.contains('minus-btn')) {
            updateItemQuantity(productId, item.quantity - 1);
        } else if (targetButton.classList.contains('plus-btn')) {
            updateItemQuantity(productId, item.quantity + 1);
        } else if (targetButton.classList.contains('delete-btn')) {
            removeCartItem(productId);
        }
    });
    
    if (checkoutBtn) checkoutBtn.addEventListener('click', () => window.location.href = '/checkout/');
    if (continueShoppingBtn) continueShoppingBtn.addEventListener('click', () => window.location.href = '/shop/');
    
    // Start Authentication Check
    onAuthStateChanged(auth, async (user) => {
        currentUser = user;
        await fetchCartItems(user?.uid);
    });
});