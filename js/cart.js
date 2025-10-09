import { auth, db } from '../firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { collection, getDocs, doc, deleteDoc, getDoc, query, orderBy, updateDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const cartContainer = document.getElementById('cart-container');
const orderSummary = document.getElementById('order-summary');
const subtotalPriceEl = document.getElementById('subtotal-price');
const totalPriceEl = document.getElementById('total-price');

let cartItems = [];

onAuthStateChanged(auth, user => {
    if (user) {
        loadCart(user.uid);
    } else {
        showEmptyCartMessage("Please log in to view your cart.", "/login/");
    }
});

function showEmptyCartMessage(message, linkUrl) {
    cartContainer.innerHTML = `
        <div class="placeholder-message">
            <h3>${message}</h3>
            <a href="${linkUrl || '/shop/'}">Start Shopping</a>
        </div>`;
    orderSummary.style.display = 'none';
}

async function loadCart(userId) {
    try {
        const cartQuery = query(collection(db, 'users', userId, 'cart'), orderBy('addedAt', 'desc'));
        const cartSnapshot = await getDocs(cartQuery);

        if (cartSnapshot.empty) {
            showEmptyCartMessage("Your cart is empty.", "/shop/");
            return;
        }

        // Fetch all product details in parallel for efficiency
        const itemPromises = cartSnapshot.docs.map(async (cartDoc) => {
            const cartData = cartDoc.data();
            const productRef = doc(db, 'products', cartData.productId);
            const productSnap = await getDoc(productRef);

            if (productSnap.exists()) {
                return {
                    cartId: cartDoc.id,
                    ...cartData,
                    stock: productSnap.data().quantity || 0 // Get available stock
                };
            } else {
                // If product doesn't exist, remove it from the cart
                await deleteDoc(doc(db, 'users', userId, 'cart', cartDoc.id));
                return null;
            }
        });

        cartItems = (await Promise.all(itemPromises)).filter(item => item !== null);
        renderCart();

    } catch (error) {
        console.error("Error loading cart:", error);
        cartContainer.innerHTML = `<div class="placeholder-message"><p>Could not load cart. Please try again.</p></div>`;
    }
}

function renderCart() {
    if (cartItems.length === 0) {
        showEmptyCartMessage("Your cart is empty.", "/shop/");
        return;
    }
    
    cartContainer.innerHTML = '';
    orderSummary.style.display = 'block';
    
    cartItems.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'cart-item';
        itemDiv.dataset.id = item.productId;

        itemDiv.innerHTML = `
            <img src="${item.imageUrl || 'https://placehold.co/80'}" alt="${item.productName}" class="cart-item-image">
            <div class="cart-item-details">
                <h3>${item.productName}</h3>
                <p class="cart-item-price">UGX ${item.price.toLocaleString()}</p>
                <div class="quantity-controls">
                    <button class="minus-btn" data-id="${item.productId}" ${item.quantity <= 1 ? 'disabled' : ''}>-</button>
                    <span class="quantity-display">${item.quantity}</span>
                    <button class="plus-btn" data-id="${item.productId}" ${item.quantity >= item.stock ? 'disabled' : ''}>+</button>
                </div>
            </div>
            <button class="remove-btn" data-id="${item.productId}" title="Remove item"><i class="fa-solid fa-trash-can"></i></button>
        `;
        cartContainer.appendChild(itemDiv);
    });
    updateSummary();
}

function updateSummary() {
    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    subtotalPriceEl.textContent = `UGX ${subtotal.toLocaleString()}`;
    totalPriceEl.textContent = `UGX ${subtotal.toLocaleString()}`; // Assuming no other fees for now
}

async function updateQuantity(productId, change) {
    const item = cartItems.find(i => i.productId === productId);
    if (!item) return;

    const newQuantity = item.quantity + change;

    if (newQuantity > item.stock) {
        alert(`Sorry, only ${item.stock} of this item are available.`);
        return;
    }
    if (newQuantity < 1) {
        return; // Should be handled by disabling the button, but as a safeguard
    }

    item.quantity = newQuantity;
    await updateDoc(doc(db, 'users', auth.currentUser.uid, 'cart', item.cartId), { quantity: newQuantity });
    
    // Re-render the entire cart to update buttons and summary
    renderCart();
}

async function removeItem(productId) {
    const item = cartItems.find(i => i.productId === productId);
    if (!item || !confirm(`Remove "${item.productName}" from cart?`)) return;

    await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'cart', item.cartId));
    cartItems = cartItems.filter(i => i.productId !== productId);
    renderCart();
}

// Event Delegation
cartContainer.addEventListener('click', (e) => {
    const id = e.target.dataset.id;
    if (!id) return;

    if (e.target.matches('.plus-btn')) {
        updateQuantity(id, 1);
    } else if (e.target.matches('.minus-btn')) {
        updateQuantity(id, -1);
    } else if (e.target.closest('.remove-btn')) {
        removeItem(id);
    }
});