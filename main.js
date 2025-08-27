import { auth, db } from './firebase.js'; // db is needed by shared.js

// ================== QUICK DEALS LOGIC START ==================
async function fetchAndDisplayDeals() {
    const dealsSection = document.getElementById('quick-deals-section');
    const dealsGrid = document.getElementById('quick-deals-grid');

    try {
        const response = await fetch('/.netlify/functions/fetch-deals');
        if (!response.ok) {
            throw new Error('Network response for deals was not ok.');
        }
        const deals = await response.json();

        if (deals && deals.length > 0) {
            dealsGrid.innerHTML = ''; // Clear any loading message
            deals.forEach(product => {
                const primaryImage = (product.imageUrls && product.imageUrls.length > 0) ? product.imageUrls[0] : '';
                
                const productLink = document.createElement('a');
                productLink.href = `product.html?id=${product.id}`;
                productLink.className = 'product-card-link';
                productLink.innerHTML = `
                    <div class="product-card">
                        <div class="deal-badge">DEAL</div>
                        <img src="${primaryImage}" alt="${product.name}">
                        <h3>${product.name}</h3>
                        <p class="price">UGX ${product.price.toLocaleString()}</p>
                    </div>
                `;
                dealsGrid.appendChild(productLink);
            });
            dealsSection.style.display = 'block'; // Show the whole section
        } else {
            dealsSection.style.display = 'none'; // Keep it hidden if no deals
        }
    } catch (error) {
        console.error("Could not fetch quick deals:", error);
        dealsSection.style.display = 'none'; // Hide section on error
    }
}
// ==================  QUICK DEALS LOGIC END  ==================


const productGrid = document.getElementById('product-grid');
const searchInput = document.getElementById('search-input');
const loadMoreBtn = document.getElementById('load-more-btn');

// Filter elements
const categoryFilter = document.getElementById('category-filter');
const minPriceInput = document.getElementById('min-price');
const maxPriceInput = document.getElementById('max-price');
const applyFiltersBtn = document.getElementById('apply-filters-btn');

const PRODUCTS_PER_PAGE = 40;
let lastVisibleProductId = null;
let fetching = false;

// Store current search and filter state
let currentQuery = {
    searchTerm: "",
    category: "",
    minPrice: "",
    maxPrice: ""
};

async function fetchProducts(isNewSearch = false) {
    if (fetching) return;
    fetching = true;
    loadMoreBtn.textContent = 'Loading...';

    if (isNewSearch) {
        productGrid.innerHTML = '<p>Loading products...</p>';
        lastVisibleProductId = null;
    }

    let url = `/.netlify/functions/search?searchTerm=${encodeURIComponent(currentQuery.searchTerm)}`;
    url += `&category=${encodeURIComponent(currentQuery.category)}`;
    url += `&minPrice=${encodeURIComponent(currentQuery.minPrice)}`;
    url += `&maxPrice=${encodeURIComponent(currentQuery.maxPrice)}`;

    if (lastVisibleProductId) {
        url += `&lastVisible=${lastVisibleProductId}`;
    }

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok.');

        const products = await response.json();

        if (isNewSearch) productGrid.innerHTML = '';
        if (products.length === 0 && isNewSearch) {
            productGrid.innerHTML = '<p>No products match your criteria.</p>';
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

function handleNewSearch() {
    currentQuery.searchTerm = searchInput.value;
    currentQuery.category = categoryFilter.value;
    currentQuery.minPrice = minPriceInput.value;
    currentQuery.maxPrice = maxPriceInput.value;
    fetchProducts(true);
}

// Event Listeners
applyFiltersBtn.addEventListener('click', handleNewSearch);

// Allow pressing Enter in search bar to trigger search
searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        handleNewSearch();
    }
});

loadMoreBtn.addEventListener('click', () => fetchProducts(false));

// Initial load
fetchProducts(true);
fetchAndDisplayDeals(); // <-- This calls the new function to get deals
