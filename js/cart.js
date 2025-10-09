import { auth, db } from '../firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { collection, getDocs, doc, deleteDoc, getDoc, query, orderBy, updateDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- DOM ELEMENTS ---
const cartContainer = document.getElementById('cart-container');
const orderSummarySection = document.getElementById('order-summary-section');
const subtotalPriceEl = document.getElementById('summary-subtotal');
const totalPriceEl = document.getElementById('summary-total');
const emptyCartMessage = document.getElementById('empty-cart-message');
const checkoutBtn = document.getElementById('checkout-btn');
const continueShoppingBtn = document.getElementById('continue-shopping-btn');

let cartItemsData = []; // To store the full cart data including stock

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
    cartContainer.style.display = "none";
    orderSummarySection.style.display = "none";
    if (checkoutBtn) checkoutBtn.style.display = 'none';
    if (emptyCartMessage) {
        emptyCartMessage.style.display = 'block';
        emptyCartMessage.innerHTML = `
            <i class="fas fa-shopping-cart"></i>
            <p>${message}</p>
            <a href="${linkUrl || '/shop/'}" class="continue-shopping-btn" style="text-decoration:none; display:inline-block; width:auto;">Start Shopping</a>`;
    }
}

function renderCart() {
    if (cartItemsData.length === 0) {
        showEmptyCartMessage("Your cart is empty.", "/shop/");
        return;
    }

    cartContainer.style.display = 'block';
    orderSummarySection.style.display = 'block';
    if (checkoutBtn) checkoutBtn.style.display = 'block';
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


// --- DATA & CART LOGIC ---

async function loadCart(userId) {
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
        cartContainer.innerHTML = `<p>Could not load cart. Please try again.</p>`;
    }
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

// --- EVENT LISTENERS ---
cartContainer.addEventListener('click', (e) => {
    const target = e.target;
    // Use closest to get the button, then dataset.id from that button
    const button = target.closest('button');
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