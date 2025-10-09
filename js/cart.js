import { auth, db } from '../firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { collection, doc, getDoc, getDocs, updateDoc, deleteDoc, runTransaction, query, orderBy } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { showModal, getCloudinaryTransformedUrl, toggleLoading } from '../shared.js';

// --- DOM Elements ---
const cartItemsContainer = document.getElementById('cart-items-container');
const emptyCartMessage = document.getElementById('empty-cart-message');
const orderSummarySection = document.getElementById('order-summary-section');
const summaryItemsCount = document.getElementById('summary-items-count');
const summarySubtotal = document.getElementById('summary-subtotal');
const summaryDiscount = document.getElementById('summary-discount');
const summaryDelivery = document.getElementById('summary-delivery');
const summaryTotal = document.getElementById('summary-total');
const checkoutBtn = document.getElementById('checkout-btn');
const continueShoppingBtn = document.getElementById('continue-shopping-btn');

// --- State ---
let currentUser = null;
let cartItems = [];

// --- Utility & Render Functions ---
function formatPrice(price) {
    return `UGX ${price.toLocaleString()}`;
}

function renderCartItems() {
    cartItemsContainer.innerHTML = '';
    if (cartItems.length === 0) {
        emptyCartMessage.style.display = 'block';
        orderSummarySection.style.display = 'none';
        checkoutBtn.style.display = 'none';
        return;
    }

    emptyCartMessage.style.display = 'none';
    orderSummarySection.style.display = 'block';
    checkoutBtn.style.display = 'block';

    cartItems.forEach(item => {
        const thumbnailUrl = getCloudinaryTransformedUrl(item.imageUrl, 'thumbnail');
        const cartItemCard = document.createElement('div');
        cartItemCard.className = 'cart-item-card';
        cartItemCard.dataset.productId = item.productId;
        cartItemCard.innerHTML = `
            <img src="${thumbnailUrl}" alt="${item.name}">
            <div class="cart-item-details">
                <h4>${item.name}</h4>
                <p>by ${item.sellerName}</p>
                <p class="cart-item-price">${formatPrice(item.price)}</p>
            </div>
            <div class="cart-item-actions">
                <div class="quantity-control">
                    <button class="minus-btn" data-product-id="${item.productId}" ${item.quantity <= 1 ? 'disabled' : ''}>-</button>
                    <span class="item-quantity-display">${item.quantity}</span>
                    <button class="plus-btn" data-product-id="${item.productId}" ${item.quantity >= item.stockQuantity ? 'disabled' : ''}>+</button>
                </div>
                <button class="delete-btn" data-product-id="${item.productId}" aria-label="Remove item">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        `;
        cartItemsContainer.appendChild(cartItemCard);
    });
    updateOrderSummary();
}

function updateOrderSummary() {
    let totalItems = 0;
    let subtotal = 0;
    cartItems.forEach(item => {
        totalItems += item.quantity;
        subtotal += item.price * item.quantity;
    });
    const total = subtotal; // Assuming no other fees for now

    if(summaryItemsCount) summaryItemsCount.textContent = totalItems;
    if(summarySubtotal) summarySubtotal.textContent = formatPrice(subtotal);
    if(summaryTotal) summaryTotal.textContent = formatPrice(total);
}

// --- Cart Actions ---

async function fetchCartItems(uid) {
    cartItemsContainer.innerHTML = '<p class="loading-indicator">Loading cart...</p>';
    if (!uid) {
        cartItemsContainer.innerHTML = '';
        emptyCartMessage.style.display = 'block';
        emptyCartMessage.innerHTML = `<i class="fas fa-shopping-cart"></i><p>Please log in to view your cart.</p>`;
        orderSummarySection.style.display = 'none';
        checkoutBtn.style.display = 'none';
        return;
    }

    try {
        const cartCollectionRef = collection(db, 'users', uid, 'cart');
        const cartSnapshot = await getDocs(cartCollectionRef);
        
        const fetchedItems = [];
        for (const cartDoc of cartSnapshot.docs) {
            const cartData = cartDoc.data();
            const productId = cartData.productId;

            const productDocRef = doc(db, 'products', productId);
            const productSnapshot = await getDoc(productDocRef);

            if (productSnapshot.exists()) {
                const productData = productSnapshot.data();
                fetchedItems.push({
                    cartItemId: cartDoc.id,
                    productId: productId,
                    name: productData.name,
                    price: productData.price,
                    imageUrl: productData.imageUrls?.[0],
                    sellerName: productData.sellerName,
                    quantity: cartData.quantity,
                    stockQuantity: productData.quantity || 0,
                    isSold: productData.isSold || false,
                });
            } else {
                await deleteDoc(doc(db, 'users', uid, 'cart', cartDoc.id));
            }
        }
        cartItems = fetchedItems;
        renderCartItems();
    } catch (error) {
        console.error("Error fetching cart items:", error);
        cartItemsContainer.innerHTML = '<p class="error-message">Failed to load cart. Please try again.</p>';
    }
}

async function updateItemQuantity(productId, newQuantity) {
    if (!currentUser) return;
    const itemIndex = cartItems.findIndex(item => item.productId === productId);
    if (itemIndex === -1) return;

    const itemToUpdate = cartItems[itemIndex];
    
    if (newQuantity > itemToUpdate.stockQuantity) {
        showModal({
            icon: '⚠️', title: 'Not Enough Stock',
            message: `Only ${itemToUpdate.stockQuantity} of "${itemToUpdate.name}" are available.`,
            theme: 'warning', buttons: [{ text: 'Got It', class: 'primary', onClick: hideModal }]
        });
        return;
    }
    if (newQuantity < 1) newQuantity = 1;

    try {
        const cartItemDocRef = doc(db, 'users', currentUser.uid, 'cart', itemToUpdate.cartItemId);
        await updateDoc(cartItemDocRef, { quantity: newQuantity });
        itemToUpdate.quantity = newQuantity;
        renderCartItems();
    } catch (error) {
        console.error("Error updating quantity:", error);
    }
}

async function removeCartItem(productId) {
    if (!currentUser) return;
    const itemToRemove = cartItems.find(item => item.productId === productId);
    if (!itemToRemove) return;
    
    if (confirm(`Are you sure you want to remove "${itemToRemove.name}" from your cart?`)) {
        try {
            await deleteDoc(doc(db, 'users', currentUser.uid, 'cart', itemToRemove.cartItemId));
            cartItems = cartItems.filter(item => item.productId !== productId);
            renderCartItems();
        } catch (error) {
            console.error("Error removing item:", error);
        }
    }
}

async function handleCheckout() {
    // This is a placeholder. Final checkout logic would be more complex.
    window.location.href = '/checkout/';
}

// --- Event Listeners and Initialization ---
cartItemsContainer.addEventListener('click', (event) => {
    const productId = event.target.closest('.cart-item-card')?.dataset.productId;
    if (!productId) return;

    const item = cartItems.find(i => i.productId === productId);
    if (!item) return;

    if (event.target.classList.contains('minus-btn')) {
        updateItemQuantity(productId, item.quantity - 1);
    } else if (event.target.classList.contains('plus-btn')) {
        updateItemQuantity(productId, item.quantity + 1);
    } else if (event.target.closest('.delete-btn')) {
        removeCartItem(productId);
    }
});

if (continueShoppingBtn) {
    continueShoppingBtn.addEventListener('click', () => { window.location.href = '/'; });
}
if (checkoutBtn) {
    checkoutBtn.addEventListener('click', handleCheckout);
}

onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    await fetchCartItems(user?.uid);
});