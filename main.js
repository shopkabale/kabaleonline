import { db, auth } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { doc, getDoc, collection, query, orderBy, limit, startAfter, getDocs } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// DOM Elements
const productGrid = document.getElementById('product-grid');
const headerActionBtn = document.getElementById('header-action-btn');
const loadMoreBtn = document.getElementById('load-more-btn');
const loadMoreContainer = document.getElementById('load-more-container');

const PRODUCTS_PER_PAGE = 20;
let lastVisibleProduct = null; // This will act as our "cursor" for the next page

// --- Authentication Check for Header Button ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data().role === 'admin') {
            headerActionBtn.textContent = 'Admin Panel';
            headerActionBtn.href = '/admin/';
        } else {
            headerActionBtn.textContent = 'My Dashboard';
            headerActionBtn.href = '/sell/';
        }
    } else {
        headerActionBtn.textContent = 'Sell an Item';
        headerActionBtn.href = '/sell/';
    }
});

// --- New Function to Fetch Products in Batches ---
async function fetchProducts() {
    try {
        // Create the base query
        let q = query(
            collection(db, "products"),
            orderBy("createdAt", "desc"),
            limit(PRODUCTS_PER_PAGE)
        );

        // If we have a "cursor", fetch the next page starting after the last product
        if (lastVisibleProduct) {
            q = query(
                collection(db, "products"),
                orderBy("createdAt", "desc"),
                startAfter(lastVisibleProduct),
                limit(PRODUCTS_PER_PAGE)
            );
        }

        const querySnapshot = await getDocs(q);

        // Remove the initial "Loading..." text if it's there
        const loadingText = productGrid.querySelector('p');
        if (loadingText) loadingText.remove();
        
        if (querySnapshot.empty && !lastVisibleProduct) {
             productGrid.innerHTML = '<p>No products found. Check back later!</p>';
        }

        // Get the last document to use as the cursor for the next fetch
        lastVisibleProduct = querySnapshot.docs[querySnapshot.docs.length - 1];

        // Render the fetched products
        querySnapshot.forEach((doc) => {
            const product = doc.data();
            const productId = doc.id;
            const productLink = document.createElement('a');
            productLink.href = `product.html?id=${productId}`;
            productLink.className = 'product-card-link';
            productLink.innerHTML = `
                <div class="product-card">
                    <img src="${product.imageUrl}" alt="${product.name}">
                    <h3>${product.name}</h3>
                    <p class="price">UGX ${product.price.toLocaleString()}</p>
                </div>
            `;
            productGrid.appendChild(productLink);
        });

        // Show or hide the "Load More" button based on if we got a full page of results
        if (querySnapshot.docs.length < PRODUCTS_PER_PAGE) {
            loadMoreBtn.style.display = 'none'; // No more products to load
        } else {
            loadMoreBtn.style.display = 'inline-block';
        }

    } catch (error) {
        console.error("Error fetching products: ", error);
        productGrid.innerHTML = '<p>Sorry, could not load products at this time.</p>';
    }
}

// Event listener for the "Load More" button
loadMoreBtn.addEventListener('click', fetchProducts);

// Initial Load
fetchProducts();
