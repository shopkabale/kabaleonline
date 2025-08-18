import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// DOM Elements
const productGrid = document.getElementById('product-grid');
const headerActionBtn = document.getElementById('header-action-btn');
const searchInput = document.getElementById('search-input');
const loadMoreBtn = document.getElementById('load-more-btn');

const PRODUCTS_PER_PAGE = 8; // You can change this back to 30 if you like
let lastVisibleProductId = null;
let currentSearchTerm = "";
let fetching = false;

// --- Authentication Check for Header Button ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
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

// --- Fetch Products via our Netlify Function ---
async function fetchProducts(isNewSearch = false) {
    if (fetching) return;
    fetching = true;
    loadMoreBtn.textContent = 'Loading...';

    if (isNewSearch) {
        productGrid.innerHTML = '<p>Loading products...</p>';
        lastVisibleProductId = null;
    }
    
    let url = `/.netlify/functions/search?searchTerm=${encodeURIComponent(currentSearchTerm)}`;
    if (lastVisibleProductId) {
        url += `&lastVisible=${lastVisibleProductId}`;
    }

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok.');
        
        const products = await response.json();

        if (isNewSearch) {
            productGrid.innerHTML = '';
        }
        
        if (products.length === 0 && isNewSearch) {
             productGrid.innerHTML = '<p>No products match your search.</p>';
        }

        if (products.length > 0) {
            lastVisibleProductId = products[products.length - 1].id;
        }

        renderProducts(products);

        if (products.length < PRODUCTS_PER_PAGE) {
            loadMoreBtn.style.display = 'none';
        } else {
            loadMoreBtn.style.display = 'inline-block';
        }

    } catch (error) {
        console.error("Error fetching products:", error);
        productGrid.innerHTML = '<p>Sorry, could not load products.</p>';
    } finally {
        fetching = false;
        loadMoreBtn.textContent = 'Load More';
    }
}

// --- Render Products ---
function renderProducts(productsToDisplay) {
    if (productsToDisplay.length === 0 && productGrid.innerHTML === '') {
        productGrid.innerHTML = '<p>No products found.</p>';
        return;
    }

    productsToDisplay.forEach(product => {
        // Safeguard to handle both new and old image formats
        let primaryImage = '';
        if (product.imageUrls && product.imageUrls.length > 0) {
            primaryImage = product.imageUrls[0]; // Use the first image from the new array
        } else if (product.imageUrl) {
            primaryImage = product.imageUrl; // Fallback for old products
        }

        const productLink = document.createElement('a');
        productLink.href = `product.html?id=${product.id}`;
        productLink.className = 'product-card-link';
        productLink.innerHTML = `
            <div class="product-card">
                <img src="${primaryImage}" alt="${product.name}">
                <h3>${product.name}</h3>
                <p class="price">UGX ${product.price.toLocaleString()}</p>
            </div>
        `;
        productGrid.appendChild(productLink);
    });
}


// --- Event Listeners ---
let searchTimeout;
searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        currentSearchTerm = e.target.value;
        fetchProducts(true); // true indicates it's a new search
    }, 500); // Wait 500ms after user stops typing before searching
});

loadMoreBtn.addEventListener('click', () => fetchProducts(false));

// --- Initial Load ---
fetchProducts(true);
