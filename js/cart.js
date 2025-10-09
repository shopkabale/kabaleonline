import { auth, db } from '../firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { collection, getDocs, doc, deleteDoc, getDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const cartContainer = document.getElementById('cart-container');

onAuthStateChanged(auth, user => {
    if (user) {
        loadCart(user.uid);
    } else {
        cartContainer.innerHTML = `
            <div class="placeholder-message">
                <h3>Please Log In</h3>
                <p>You need to be logged in to view your cart.</p>
                <a href="/login/">Go to Login Page</a>
            </div>`;
    }
});

async function loadCart(userId) {
    try {
        const cartQuery = query(collection(db, 'users', userId, 'cart'), orderBy('addedAt', 'desc'));
        const snapshot = await getDocs(cartQuery);

        if (snapshot.empty) {
            cartContainer.innerHTML = `
                <div class="placeholder-message">
                    <h3>Your Cart is Empty</h3>
                    <p>Looks like you haven't added any items yet.</p>
                    <a href="/">Start Shopping</a>
                </div>`;
            return;
        }

        const itemsBySeller = {};
        // Group items by seller ID
        snapshot.forEach(doc => {
            const item = { id: doc.id, ...doc.data() };
            if (!itemsBySeller[item.sellerId]) {
                itemsBySeller[item.sellerId] = { sellerName: 'Loading seller...', items: [] };
            }
            itemsBySeller[item.sellerId].items.push(item);
        });

        // Fetch seller names asynchronously
        for (const sellerId in itemsBySeller) {
            const userDoc = await getDoc(doc(db, 'users', sellerId));
            if (userDoc.exists()) {
                itemsBySeller[sellerId].sellerName = userDoc.data().fullName || 'Anonymus Seller';
            }
        }

        renderCart(itemsBySeller);

    } catch (error) {
        console.error("Error loading cart:", error);
        cartContainer.innerHTML = `<div class="placeholder-message"><p>Could not load your cart. Please try again.</p></div>`;
    }
}

function renderCart(itemsBySeller) {
    cartContainer.innerHTML = ''; // Clear loader
    let totalPrice = 0;

    for (const sellerId in itemsBySeller) {
        const group = itemsBySeller[sellerId];
        const sellerGroupDiv = document.createElement('div');
        sellerGroupDiv.className = 'seller-group';

        let itemsHTML = '';
        group.items.forEach(item => {
            itemsHTML += `
                <div class="cart-item" data-item-id="${item.id}">
                    <img src="${item.imageUrl || 'https://placehold.co/70x70'}" alt="${item.productName}" class="cart-item-image">
                    <div class="cart-item-details">
                        <h3>${item.productName}</h3>
                        <p class="cart-item-price">UGX ${item.price.toLocaleString()}</p>
                    </div>
                    <button class="remove-btn" data-item-id="${item.id}" title="Remove item">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            `;
            totalPrice += item.price * item.quantity;
        });

        sellerGroupDiv.innerHTML = `<div class="seller-header">Items from ${group.sellerName}</div>${itemsHTML}`;
        cartContainer.appendChild(sellerGroupDiv);
    }

    // Add summary and checkout button
    const summaryDiv = document.createElement('div');
    summaryDiv.className = 'cart-summary';
    summaryDiv.innerHTML = `
        <div class="total-price">Total: UGX ${totalPrice.toLocaleString()}</div>
        <a href="/checkout.html" class="checkout-btn">Proceed to Checkout</a>
    `;
    cartContainer.appendChild(summaryDiv);
}


// Event Delegation for removing items from the cart
cartContainer.addEventListener('click', async (event) => {
    const removeButton = event.target.closest('.remove-btn');
    if (removeButton) {
        const itemId = removeButton.dataset.itemId;
        const userId = auth.currentUser.uid;

        if (confirm('Are you sure you want to remove this item?')) {
            removeButton.disabled = true;
            try {
                const itemRef = doc(db, 'users', userId, 'cart', itemId);
                await deleteDoc(itemRef);
                loadCart(userId); // Reload the cart to show changes
            } catch (error) {
                console.error("Error removing item:", error);
                alert("Could not remove item. Please try again.");
                removeButton.disabled = false;
            }
        }
    }
});  