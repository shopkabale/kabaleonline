// main.js (Updated)
import { db, auth } from './firebase.js'; // <-- Import auth
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js"; // <-- Import auth function
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const productGrid = document.getElementById('product-grid');
const sellerNavLink = document.getElementById('seller-nav-link'); // <-- Get the nav link

// --- NEW: Check login status and update the navigation link ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is signed in
        sellerNavLink.textContent = 'My Dashboard';
        sellerNavLink.href = '/sell/';
    } else {
        // User is signed out
        sellerNavLink.textContent = 'Sell on Kabale Online';
        sellerNavLink.href = '/sell/';
    }
});


// Fetch all products from Firestore and display them
async function fetchAndDisplayProducts() {
    try {
        const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            productGrid.innerHTML = '<p>No products found. Check back later!</p>';
            return;
        }

        productGrid.innerHTML = ''; // Clear the "Loading..." message
        querySnapshot.forEach((doc) => {
            const product = doc.data();
            const message = encodeURIComponent(`Hello, I'm interested in your product: ${product.name} - Price: UGX ${product.price}`);
            const whatsappLink = `https://wa.me/${product.whatsapp}?text=${message}`;

            const productCard = document.createElement('div');
            productCard.className = 'product-card';
            productCard.innerHTML = `
                <img src="${product.imageUrl}" alt="${product.name}">
                <h3>${product.name}</h3>
                <p class="description">${product.description}</p>
                <p class="price">UGX ${product.price.toLocaleString()}</p>
                <a href="${whatsappLink}" target="_blank" class="whatsapp-btn">
                    Buy on WhatsApp
                </a>
            `;
            productGrid.appendChild(productCard);
        });

    } catch (error) {
        console.error("Error fetching products: ", error);
        productGrid.innerHTML = '<p>Sorry, we could not load the products at this time.</p>';
    }
}

// Initial call to load products when the page loads
fetchAndDisplayProducts();