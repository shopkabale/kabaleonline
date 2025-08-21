import { auth, db } from './firebase.js'; // db is needed by shared.js
const productGrid = document.getElementById('product-grid');
const searchInput = document.getElementById('search-input');
const loadMoreBtn = document.getElementById('load-more-btn');

const PRODUCTS_PER_PAGE = 40; // <-- Set to 40
let lastVisibleProductId = null;
let currentSearchTerm = "";
let fetching = false;

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

function renderProducts(productsToDisplay) {
    productsToDisplay.forEach(product => {
        let primaryImage = '';
        if (product.imageUrls && product.imageUrls.length > 0) {
            primaryImage = product.imageUrls[0];
        } else if (product.imageUrl) {
            primaryImage = product.imageUrl;
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

let searchTimeout;
searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        currentSearchTerm = e.target.value;
        fetchProducts(true);
    }, 500);
});

loadMoreBtn.addEventListener('click', () => fetchProducts(false));

fetchProducts(true);
