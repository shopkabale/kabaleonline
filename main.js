import { db, auth } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const productGrid = document.getElementById('product-grid');
const sellerNavLink = document.getElementById('seller-nav-link');

// Check login status and update the navigation link
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Check if the user is an admin
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data().role === 'admin') {
            sellerNavLink.textContent = 'Admin Panel';
            sellerNavLink.href = '/admin/';
        } else {
            sellerNavLink.textContent = 'My Dashboard';
            sellerNavLink.href = '/sell/';
        }
    } else {
        sellerNavLink.textContent = 'Sell on Kabale Online';
        sellerNavLink.href = '/sell/';
    }
});

// Fetch all products and display them in a simplified card format
async function fetchAndDisplayProducts() {
    try {
        const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            productGrid.innerHTML = '<p>No products found. Check back later!</p>';
            return;
        }

        productGrid.innerHTML = '';
        querySnapshot.forEach((doc) => {
            const product = doc.data();
            const productId = doc.id;

            // Create a link that wraps the entire product card
            const productLink = document.createElement('a');
            productLink.href = `product.html?id=${productId}`;
            productLink.className = 'product-card-link';

            // Create the card content
            productLink.innerHTML = `
                <div class="product-card">
                    <img src="${product.imageUrl}" alt="${product.name}">
                    <h3>${product.name}</h3>
                    <p class="price">UGX ${product.price.toLocaleString()}</p>
                </div>
            `;
            productGrid.appendChild(productLink);
        });

    } catch (error) {
        console.error("Error fetching products: ", error);
        productGrid.innerHTML = '<p>Sorry, we could not load the products at this time.</p>';
    }
}

fetchAndDisplayProducts();
