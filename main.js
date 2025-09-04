import { auth } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";

const productGrid = document.getElementById('product-grid');
const searchInput = document.getElementById('search-input');
const loadMoreBtn = document.getElementById('load-more-btn');
const searchBtn = document.getElementById('search-btn');
const categoryFilter = document.getElementById('category-filter');
const minPriceInput = document.getElementById('min-price');
const maxPriceInput = document.getElementById('max-price');
const applyFiltersBtn = document.getElementById('apply-filters-btn');
const listingsTitle = document.getElementById('listings-title');
const itemsBtn = document.getElementById('items-btn');
const servicesBtn = document.getElementById('services-btn');

const PRODUCTS_PER_PAGE = 30;
let lastVisibleProductId = null;
let fetching = false;
let currentQuery = { searchTerm: "", category: "", minPrice: "", maxPrice: "" };

const urlParams = new URLSearchParams(window.location.search);
const listingTypeFilter = urlParams.get('type');

function showSkeletonLoaders() {
    productGrid.innerHTML = ''; // Clear previous results
    let skeletons = '';
    for (let i = 0; i < 8; i++) { // Show 8 skeletons
        skeletons += `
            <div class="skeleton-card">
                <div class="image"></div>
                <div class="text"></div>
                <div class="text short"></div>
            </div>
        `;
    }
    productGrid.innerHTML = skeletons;
}

async function fetchAndDisplayDeals() {
    const dealsSection = document.getElementById('quick-deals-section');
    if (!dealsSection) return;
    const dealsGrid = document.getElementById('quick-deals-grid');

    try {
        const response = await fetch('/.netlify/functions/fetch-deals');
        if (!response.ok) throw new Error('Failed to fetch deals');
        const deals = await response.json();

        if (deals.length > 0) {
            dealsGrid.innerHTML = '';
            deals.forEach(product => {
                const primaryImage = (product.imageUrls && product.imageUrls.length > 0) ? product.imageUrls[0] : 'placeholder.webp';
                const productLink = document.createElement('a');
                productLink.href = `product.html?id=${product.id}`;
                productLink.className = 'product-card-link';
                productLink.innerHTML = `<div class="product-card"><div class="deal-badge">DEAL</div><img src="${primaryImage}" alt="${product.name}"><h3>${product.name}</h3><p class="price">UGX ${product.price.toLocaleString()}</p></div>`;
                dealsGrid.appendChild(productLink);
            });
            dealsSection.style.display = 'block';
        } else {
            dealsSection.style.display = 'none';
        }
    } catch (error) {
        console.error("Could not fetch featured listings:", error);
        dealsSection.style.display = 'none';
    }
}

async function fetchProducts(isNewSearch = false) {
    if (fetching) return;
    fetching = true;
    loadMoreBtn.textContent = 'Loading...';

    if (isNewSearch) {
        lastVisibleProductId = null;
        showSkeletonLoaders();
    }

    let url = `/.netlify/functions/search?searchTerm=${encodeURIComponent(currentQuery.searchTerm)}`;
    url += `&category=${encodeURIComponent(currentQuery.category)}`;
    url += `&minPrice=${encodeURIComponent(currentQuery.minPrice)}`;
    url += `&maxPrice=${encodeURIComponent(currentQuery.maxPrice)}`;
    if (listingTypeFilter) {
        url += `&type=${listingTypeFilter}`;
    } else {
        url += `&type=item`;
    }
    if (lastVisibleProductId) {
        url += `&lastVisible=${lastVisibleProductId}`;
    }

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok.');
        const products = await response.json();

        if (isNewSearch) productGrid.innerHTML = '';

        if (products.length === 0 && isNewSearch) {
            productGrid.innerHTML = '<p>No listings match your criteria.</p>';
        }

        if (products.length > 0) {
            lastVisibleProductId = products[products.length - 1].id;
        }

        renderProducts(products);
        loadMoreBtn.style.display = products.length < PRODUCTS_PER_PAGE ? 'none' : 'inline-block';
    } catch (error) {
        console.error("Error fetching products:", error);
        productGrid.innerHTML = '<p>Sorry, could not load listings. Please try again later.</p>';
    } finally {
        fetching = false;
        loadMoreBtn.textContent = 'Load More';
    }
}

function renderProducts(productsToDisplay) {
    productsToDisplay.forEach(product => {
        const primaryImage = (product.imageUrls && product.imageUrls.length > 0) ? product.imageUrls[0] : 'placeholder.webp';
        const productLink = document.createElement('a');
        productLink.href = `product.html?id=${product.id}`;
        productLink.className = 'product-card-link';
        productLink.innerHTML = `<div class="product-card"><img src="${primaryImage}" alt="${product.name}"><h3>${product.name}</h3><p class="price">UGX ${product.price.toLocaleString()}</p></div>`;
        productGrid.appendChild(productLink);
    });
}

function handleNewSearch() {
    currentQuery = {
        searchTerm: searchInput.value,
        category: categoryFilter.value,
        minPrice: minPriceInput.value,
        maxPrice: maxPriceInput.value,
    };
    fetchProducts(true);
}

applyFiltersBtn.addEventListener('click', handleNewSearch);
searchBtn.addEventListener('click', handleNewSearch);
searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleNewSearch(); });
loadMoreBtn.addEventListener('click', () => fetchProducts(false));

// --- Initial Page Load Logic ---
if (listingTypeFilter === 'service') {
    listingsTitle.textContent = 'All Services';
    servicesBtn.classList.add('active');
    const dealsSection = document.getElementById('quick-deals-section');
    if (dealsSection) dealsSection.style.display = 'none';
} else {
    listingsTitle.textContent = 'All Items';
    itemsBtn.classList.add('active');
    fetchAndDisplayDeals();
}

fetchProducts(true);

// --- NEW: Dynamic Header Logic ---
const postOrDashboardBtn = document.getElementById('sell-btn'); // Using the ID from your HTML

onAuthStateChanged(auth, user => {
    if (user) {
        // User is signed in
        postOrDashboardBtn.textContent = 'Seller Dashboard';
    } else {
        // User is signed out
        postOrDashboardBtn.textContent = 'Post something';
    }
});
