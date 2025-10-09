import { auth, db } from '../firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { collection, doc, getDoc, getDocs, updateDoc, deleteDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- DOM ELEMENT VARIABLES ---
let cartContainer;
let orderSummarySection;
let subtotalPriceEl;
let totalPriceEl;
let emptyCartMessage;
let checkoutBtn;
let continueShoppingBtn;

let cartItemsData = [];
let currentUser = null;

// --- MAIN INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    // Assign elements ONLY after the DOM is fully loaded
    cartContainer = document.getElementById('cart-items-container');
    orderSummarySection = document.getElementById('order-summary-section');
    subtotalPriceEl = document.getElementById('summary-subtotal');
    totalPriceEl = document.getElementById('summary-total');
    emptyCartMessage = document.getElementById('empty-cart-message');
    checkoutBtn = document.querySelector('.checkout-btn');
    continueShoppingBtn = document.querySelector('.continue-shopping-btn');

    // Attach Event Listeners
    cartContainer.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (!button || !button.dataset.id) return;
        
        const id = button.dataset.id;
    
        if (button.classList.contains('plus-btn')) {
            updateQuantity(id, 1);
        } else if (button.classList.contains('minus-btn')) {
            updateQuantity(id, -1);
        } else if (button.classList.contains('delete-btn')) {
            removeItem(id);
        }
    });

    if (continueShoppingBtn) {
        continueShoppingBtn.addEventListener('click', () => { window.location.href = '/shop/'; });
    }
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => { window.location.href = '/checkout/'; });
    }
    
    // Start Authentication Check
    onAuthStateChanged(auth, user => {
        currentUser = user;
        if (user) {
            loadCart(user.uid);
        } else {
            showEmptyCartMessage("Please log in to view your cart.", "/login/");
        }
    });
});


// --- FUNCTIONS ---

function showEmptyCartMessage(message, linkUrl) {
    if (cartContainer) cartContainer.style.display = "none";
    if (orderSummarySection) orderSummarySection.style.display = "none";
    if (emptyCartMessage) {
        emptyCartMessage.style.display = 'block';
        emptyCartMessage.innerHTML = `
            <div class="empty-cart-message">
                <i class="fas fa-shopping-cart"></i>
                <p>${message}</p>
                <a href="${linkUrl || '/shop/'}" class="continue-shopping-btn" style="text-decoration:none; display:inline-block; width:auto; border: 2px solid var(--primary-color);">Start Shopping</a>
            </div>`;
    }
}

async function loadCart(userId) {
    if (!cartContainer) return;
    cartContainer.innerHTML = `<p class="loading-indicator">Loading cart...</p>`;
    try {
        const cartQuery = query(collection(db, 'users', userId, 'cart'), orderBy('addedAt', 'desc'));
        const cartSnapshot = await getDocs(cartQuery);

        if (cartSnapshot.empty) {
            showEmptyCartMessage("Your cart is empty.", "/shop/");
            return;
        }

        const itemPromises = cartSnapshot.docs.map(async (cartDoc) => {
            const cartData = cartDoc.data();
            
            // FIX: Check if cartData and productId exist before proceeding
            if (!cartData || !cartData.productId) {
                await deleteDoc(doc(db, 'users', userId, 'cart', cartDoc.id)); // Delete bad data
                return null;
            }
            
            const productRef = doc(db, 'products', cartData.productId);
            const productSnap = await getDoc(productRef);

            if (productSnap.exists()) {
                const productData = productSnap.data();
                // FIX: Ensure sellerId exists before grouping
                if (!productData.sellerId) {
                     await deleteDoc(doc(db, 'users', userId, 'cart', cartDoc.id)); // Delete cart item if product is invalid
                     return null;
                }
                return {
                    cartId: cartDoc.id,
                    ...cartData,
                    stock: productData.quantity || 0,
                    sellerId: productData.sellerId // Ensure we get the sellerId from the product
                };
            } else {
                await deleteDoc(doc(db, 'users', userId, 'cart', cartDoc.id));
                return null;
            }
        });

        cartItemsData = (await Promise.all(itemPromises)).filter(item => item !== null);
        renderCart();

    } catch (error) {
        console.error("Error loading cart:", error);
        cartContainer.innerHTML = `<p>Could not load cart. Please try again.</p>`;
    }
}

function renderCart() {
    if (cartItemsData.length === 0) {
        showEmptyCartMessage("Your cart is empty.", "/shop/");
        return;
    }

    cartContainer.style.display = 'block';
    orderSummarySection.style.display = 'block';
    emptyCartMessage.style.display = 'none';
    cartContainer.innerHTML = '';
    
    let subtotal = 0;

    cartItemsData.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'cart-item-card';
        itemDiv.dataset.id = item.productId;
        subtotal += item.price * item.quantity;

        itemDiv.innerHTML = `
            <img src="${item.imageUrl || 'https://placehold.co/80'}" alt="${item.productName}" class="cart-item-image">
            <div class="cart-item-details">
                <h4>${item.productName}</h4>
                <p class="cart-item-price">UGX ${item.price.toLocaleString()}</p>
                <div class="quantity-controls">
                    <button class="minus-btn" data-id="${item.productId}" ${item.quantity <= 1 ? 'disabled' : ''}>-</button>
                    <span class="quantity-display">${item.quantity}</span>
                    <button class="plus-btn" data-id="${item.productId}" ${item.quantity >= item.stock ? 'disabled' : ''}>+</button>
                </div>
            </div>
            <button class="delete-btn" data-id="${item.productId}" title="Remove item"><i class="fa-solid fa-trash-can"></i></button>
        `;
        cartContainer.appendChild(itemDiv);
    });
    
    subtotalPriceEl.textContent = `UGX ${subtotal.toLocaleString()}`;
    totalPriceEl.textContent = `UGX ${subtotal.toLocaleString()}`;
}

async function updateQuantity(productId, change) {
    const item = cartItemsData.find(i => i.productId === productId);
    if (!item) return;

    const newQuantity = item.quantity + change;

    if (newQuantity > item.stock) {
        alert(`Sorry, only ${item.stock} of this item are available.`);
        return;
    }
    if (newQuantity < 1) return;

    try {
        const cartItemRef = doc(db, 'users', auth.currentUser.uid, 'cart', item.cartId);
        await updateDoc(cartItemRef, { quantity: newQuantity });
        item.quantity = newQuantity;
        renderCart();
    } catch (error) {
        console.error("Error updating quantity:", error);
        alert("Could not update quantity. Please try again.");
    }
}

async function removeItem(productId) {
    const item = cartItemsData.find(i => i.productId === productId);
    if (!item || !confirm(`Remove "${item.productName}" from your cart?`)) return;

    try {
        await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'cart', item.cartId));
        cartItemsData = cartItemsData.filter(i => i.productId !== productId);
        renderCart();
    } catch (error) {
        console.error("Error removing item:", error);
        alert("Could not remove item. Please try again.");
    }
}