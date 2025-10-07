import { auth, db } from '../firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { collection, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const checkoutFormContainer = document.getElementById('checkout-form-container');
let cartItems = [];
let totalPrice = 0;

onAuthStateChanged(auth, async user => {
    if (user) {
        // First, get the user's profile to pre-fill the form
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.exists() ? userDoc.data() : {};
        // Then, load the cart and render the form
        await loadCartAndRenderForm(user.uid, userData);
    } else {
        checkoutFormContainer.innerHTML = `
            <div class="placeholder-message">
                <h3>Please Log In</h3>
                <p>You need to be logged in to check out.</p>
                <a href="/login/">Go to Login Page</a>
            </div>`;
    }
});

async function loadCartAndRenderForm(userId, userData) {
    try {
        const snapshot = await getDocs(collection(db, 'users', userId, 'cart'));

        if (snapshot.empty) {
            checkoutFormContainer.innerHTML = `
                <div class="placeholder-message">
                    <h3>Your Cart is Empty</h3>
                    <p>You cannot check out with an empty cart.</p>
                    <a href="/">Continue Shopping</a>
                </div>`;
            return;
        }

        snapshot.forEach(doc => {
            cartItems.push({ id: doc.id, ...doc.data() });
            totalPrice += doc.data().price * doc.data().quantity;
        });

        // Now render the form
        checkoutFormContainer.innerHTML = `
            <form id="checkout-form">
                <div class="form-group">
                    <label for="fullName">Full Name</label>
                    <input type="text" id="fullName" value="${userData.fullName || ''}" required>
                </div>
                <div class="form-group">
                    <label for="phone">Phone Number (e.g., 2567...)</label>
                    <input type="tel" id="phone" value="${userData.phone || ''}" required>
                </div>
                <div class="form-group">
                    <label for="location">Delivery Location</label>
                    <textarea id="location" rows="3" placeholder="e.g., Makanga, Hornby High School, your hostel name..." required></textarea>
                </div>
                <div class="form-summary">
                    <div class="total-price">Total: UGX ${totalPrice.toLocaleString()}</div>
                    <button type="submit" id="place-order-btn">
                        <span><i class="fa-solid fa-lock"></i> Confirm Order</span>
                        <i class="fa-solid fa-spinner fa-spin"></i>
                    </button>
                    <p style="text-align: center; font-size: 0.9em; color: var(--text-light); margin-top: 15px;">Payment is made offline upon delivery.</p>
                </div>
            </form>
        `;

        // Add event listener to the newly created form
        const checkoutForm = document.getElementById('checkout-form');
        checkoutForm.addEventListener('submit', handlePlaceOrder);

    } catch (error) {
        console.error("Error loading checkout:", error);
        checkoutFormContainer.innerHTML = `<div class="placeholder-message"><p>Could not load checkout. Please try again.</p></div>`;
    }
}

async function handlePlaceOrder(event) {
    event.preventDefault();
    const placeOrderBtn = document.getElementById('place-order-btn');
    placeOrderBtn.disabled = true;
    placeOrderBtn.querySelector('span').textContent = 'Placing Order...';
    placeOrderBtn.querySelector('.fa-spin').style.display = 'inline-block';

    const orderDetails = {
        buyerInfo: {
            name: document.getElementById('fullName').value,
            phone: document.getElementById('phone').value,
            location: document.getElementById('location').value,
        },
        items: cartItems,
        totalPrice: totalPrice
    };

    try {
        // Get the user's authentication token
        const user = auth.currentUser;
        if (!user) {
            throw new Error("User not logged in.");
        }
        const token = await user.getIdToken();

        // Send the request with the token in the headers
        const response = await fetch('/.netlify/functions/submit-order', {
            method: 'POST',
            body: JSON.stringify(orderDetails),
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // This securely identifies the user
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to place order.');
        }

        // Redirect to a success page
        window.location.href = '/order-success.html';

    } catch (error) {
        console.error("Checkout error:", error);
        alert(`There was a problem placing your order: ${error.message}`);
        placeOrderBtn.disabled = false;
        placeOrderBtn.querySelector('span').textContent = 'Confirm Order';
        placeOrderBtn.querySelector('.fa-spin').style.display = 'none';
    }
}