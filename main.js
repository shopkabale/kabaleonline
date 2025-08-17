import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const productGrid = document.getElementById('product-grid');
const headerActionBtn = document.getElementById('header-action-btn');
const searchInput = document.getElementById('search-input');
const loadMoreBtn = document.getElementById('load-more-btn');

let lastVisibleProductId = null;
let currentSearchTerm = "";
let fetching = false; // Prevents multiple fetches at once

// --- Authentication Check ---
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

        if (isNewSearch) productGrid.innerHTML = '';
        if (products.length === 0 && isNewSearch) {
             productGrid.innerHTML = '<p>No products match your search.</p>';
        }

        if (products.length > 0) {
            lastVisibleProductId = products[products.length - 1].id;
        }

        products.forEach(product => {
            const productLink = document.createElement('a');
            productLink.href = `product.html?id=${product.id}`;
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

        const PRODUCTS_PER_PAGE = 8;
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

// --- Event Listeners ---
let searchTimeout;
searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        currentSearchTerm = e.target.value;
        fetchProducts(true);
    }, 500);
});

loadMoreBtn.addEventListener('click', () => fetchProducts(false));

// --- Initial Load ---
fetchProducts(true);
