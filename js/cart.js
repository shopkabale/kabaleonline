import { auth, db } from '../firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { collection, getDocs, doc, deleteDoc, getDoc, query, orderBy, updateDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- CORRECTED DOM ELEMENT REFERENCE ---
const cartItemsContainer = document.getElementById('cart-items-container'); // Corrected from 'cart-container'
const orderSummarySection = document.getElementById('order-summary-section');
const subtotalPriceEl = document.getElementById('summary-subtotal');
const totalPriceEl = document.getElementById('summary-total');
const emptyCartMessage = document.getElementById('empty-cart-message');
const checkoutBtn = document.querySelector('.checkout-btn');
const continueShoppingBtn = document.querySelector('.continue-shopping-btn');

let cartItemsData = [];

// --- AUTHENTICATION ---
onAuthStateChanged(auth, user => {
    if (user) {
        loadCart(user.uid);
    } else {
        showEmptyCartMessage("Please log in to view your cart.", "/login/");
    }
});

// --- RENDER & DISPLAY FUNCTIONS ---

function showEmptyCartMessage(message, linkUrl) {
    cartItemsContainer.style.display = "none";
    if(orderSummarySection) orderSummarySection.style.display = "none";
    if (checkoutBtn) checkoutBtn.style.display = 'none';
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
    cartItemsContainer.innerHTML = `<p class="loading-indicator">Loading cart...</p>`;
    try {
        const cartQuery = query(collection(db, 'users', userId, 'cart'), orderBy('addedAt', 'desc'));
        const cartSnapshot = await getDocs(cartQuery);

        if (cartSnapshot.empty) {
            showEmptyCartMessage("Your cart is empty.", "/shop/");
            return;
        }

        const itemPromises = cartSnapshot.docs.map(async (cartDoc) => {
            const cartData = cartDoc.data();
            const productRef = doc(db, 'products', cartData.productId);
            const productSnap = await getDoc(productRef);

            if (productSnap.exists()) {
                return {
                    cartId: cartDoc.id,
                    ...cartData,
                    stock: productSnap.data().quantity || 0
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
        cartItemsContainer.innerHTML = `<p>Could not load cart. Please try again.</p>`;
    }
}

function renderCart() {
    if (cartItemsData.length === 0) {
        showEmptyCartMessage("Your cart is empty.", "/shop/");
        return;
    }

    cartItemsContainer.style.display = 'block';
    if(orderSummarySection) orderSummarySection.style.display = 'block';
    if(checkoutBtn) checkoutBtn.style.display = 'block';
    if(emptyCartMessage) emptyCartMessage.style.display = 'none';
    cartItemsContainer.innerHTML = '';
    
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
        cartItemsContainer.appendChild(itemDiv);
    });
    
    if(subtotalPriceEl) subtotalPriceEl.textContent = `UGX ${subtotal.toLocaleString()}`;
    if(totalPriceEl) totalPriceEl.textContent = `UGX ${subtotal.toLocaleString()}`;
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
        alert(`Quantity for "${item.productName}" updated to ${newQuantity}.`);
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

// --- EVENT LISTENERS ---
cartItemsContainer.addEventListener('click', (e) => {
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