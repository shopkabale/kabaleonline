import { auth, db } from './firebase.js'; // db is needed by shared.js

// ================== ELEMENT SELECTORS ==================
const dealsSection = document.getElementById('quick-deals-section');
const dealsGrid = document.getElementById('quick-deals-grid');
const productGrid = document.getElementById('product-grid');
const searchInput = document.getElementById('search-input');
const loadMoreBtn = document.getElementById('load-more-btn');
const categoryFilter = document.getElementById('category-filter');
const minPriceInput = document.getElementById('min-price');
const maxPriceInput = document.getElementById('max-price');
const applyFiltersBtn = document.getElementById('apply-filters-btn');
const productCountContainer = document.getElementById('product-count-container');

// NEW elements for added features
const sortByFilter = document.getElementById('sort-by');
const clearFiltersBtn = document.getElementById('clear-filters-btn');
const gridViewBtn = document.getElementById('grid-view-btn');
const listViewBtn = document.getElementById('list-view-btn');
const scrollToTopBtn = document.getElementById('scroll-to-top-btn');

// ================== STATE MANAGEMENT ==================
const PRODUCTS_PER_PAGE = 40;
let lastVisibleProductId = null;
let fetching = false;

// Store current search and filter state
let currentQuery = {
    searchTerm: "",
    category: "",
    minPrice: "",
    maxPrice: "",
    sortBy: "default" // Added for sorting
};

// ================== REUSABLE FUNCTIONS ==================

/**
 * Creates a product card HTML element.
 * @param {object} product The product data.
 * @returns {HTMLAnchorElement} The product card element.
 */
function createProductCard(product) {
    const wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
    const isFavorited = wishlist.includes(product.id);
    const primaryImage = (product.imageUrls && product.imageUrls.length > 0) ? product.imageUrls[0] : '';
    
    const productLink = document.createElement('a');
    productLink.href = `product.html?id=${product.id}`;
    productLink.className = 'product-card-link';

    const dealBadgeHTML = product.isDeal ? '<div class="deal-badge">DEAL</div>' : '';

    productLink.innerHTML = `
        <div class="product-card">
            ${dealBadgeHTML}
            <button class="wishlist-btn ${isFavorited ? 'active' : ''}" data-product-id="${product.id}" title="Add to Wishlist">
                <i class="fas fa-heart"></i>
            </button>
            <img src="${primaryImage}" alt="${product.name}" loading="lazy">
            <h3>${product.name}</h3>
            <p class="price">UGX ${product.price.toLocaleString()}</p>
        </div>
    `;
    return productLink;
}

/**
 * Renders skeleton loaders for a better loading experience.
 * @param {number} count The number of skeletons to render.
 */
function renderSkeletonLoaders(count) {
    let skeletonsHTML = '';
    for (let i = 0; i < count; i++) {
        skeletonsHTML += `
            <div class="skeleton-card">
                <div class="skeleton skeleton-image"></div>
                <div class="skeleton skeleton-title"></div>
                <div class="skeleton skeleton-price"></div>
            </div>
        `;
    }
    productGrid.innerHTML = skeletonsHTML;
}

// ================== DATA FETCHING & RENDERING ==================

async function fetchAndDisplayDeals() {
    try {
        const response = await fetch('/.netlify/functions/fetch-deals');
        if (!response.ok) throw new Error('Network response for deals was not ok.');
        
        const deals = await response.json();
        dealsGrid.innerHTML = '';
        if (deals && deals.length > 0) {
            deals.forEach(product => {
                product.isDeal = true;
                const card = createProductCard(product);
                dealsGrid.appendChild(card);
            });
            dealsSection.style.display = 'block';
        } else {
            dealsSection.style.display = 'none';
        }
    } catch (error) {
        console.error("Could not fetch quick deals:", error);
        dealsSection.style.display = 'none';
    }
}

async function fetchProducts(isNewSearch = false) {
    if (fetching) return;
    fetching = true;
    loadMoreBtn.textContent = 'Loading...';

    if (isNewSearch) {
        renderSkeletonLoaders(8);
        lastVisibleProductId = null;
    }

    let url = new URL('/.netlify/functions/search', window.location.origin);
    url.searchParams.set('searchTerm', currentQuery.searchTerm);
    url.searchParams.set('category', currentQuery.category);
    url.searchParams.set('minPrice', currentQuery.minPrice);
    url.searchParams.set('maxPrice', currentQuery.maxPrice);
    url.searchParams.set('sortBy', currentQuery.sortBy);
    
    if (lastVisibleProductId) {
        url.searchParams.set('lastVisible', lastVisibleProductId);
    }

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok.');
        
        const products = await response.json();

        if (isNewSearch) {
            productGrid.innerHTML = '';
        }

        if (products.length === 0 && isNewSearch) {
            productGrid.innerHTML = '<p>No products match your criteria.</p>';
        }

        if (products.length > 0) {
            lastVisibleProductId = products[products.length - 1].id;
        }

        products.forEach(product => {
            product.isDeal = false;
            const card = createProductCard(product);
            productGrid.appendChild(card);
        });

        const currentProductCount = productGrid.querySelectorAll('.product-card-link').length;
        productCountContainer.textContent = currentProductCount > 0 ? `Showing ${currentProductCount} products` : '';

        loadMoreBtn.style.display = (products.length < PRODUCTS_PER_PAGE) ? 'none' : 'inline-block';
        
    } catch (error) {
        console.error("Error fetching products:", error);
        productGrid.innerHTML = '<p>Sorry, could not load products.</p>';
    } finally {
        fetching = false;
        loadMoreBtn.textContent = 'Load More';
    }
}

// ================== EVENT HANDLERS ==================

function handleNewSearch() {
    currentQuery.searchTerm = searchInput.value.trim();
    currentQuery.category = categoryFilter.value;
    currentQuery.minPrice = minPriceInput.value;
    currentQuery.maxPrice = maxPriceInput.value;
    currentQuery.sortBy = sortByFilter.value;

    const isSearchOrFilterActive = currentQuery.searchTerm || currentQuery.category || currentQuery.minPrice || currentQuery.maxPrice;

    if (isSearchOrFilterActive) {
        dealsSection.style.display = 'none';
    } else {
        fetchAndDisplayDeals();
    }
    
    fetchProducts(true);
}

function handleWishlistClick(e) {
    const wishlistBtn = e.target.closest('.wishlist-btn');
    if (!wishlistBtn) return;

    e.preventDefault(); // Stop link navigation
    e.stopPropagation(); // Stop event bubbling

    const productId = wishlistBtn.dataset.productId;
    let wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];

    if (wishlist.includes(productId)) {
        wishlist = wishlist.filter(id => id !== productId);
        wishlistBtn.classList.remove('active');
    } else {
        wishlist.push(productId);
        wishlistBtn.classList.add('active');
    }
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
}

// ================== EVENT LISTENERS ==================

// Search and filter listeners
applyFiltersBtn.addEventListener('click', handleNewSearch);
searchInput.addEventListener('keydown', (e) => e.key === 'Enter' && handleNewSearch());
sortByFilter.addEventListener('change', handleNewSearch);

// Clear filters listener
clearFiltersBtn.addEventListener('click', () => {
    searchInput.value = '';
    categoryFilter.value = '';
    minPriceInput.value = '';
    maxPriceInput.value = '';
    sortByFilter.value = 'default';
    handleNewSearch();
});

// Load more listener
loadMoreBtn.addEventListener('click', () => fetchProducts(false));

// View toggle listeners
gridViewBtn.addEventListener('click', () => {
    productGrid.classList.remove('list-view');
    gridViewBtn.classList.add('active');
    listViewBtn.classList.remove('active');
});

listViewBtn.addEventListener('click', () => {
    productGrid.classList.add('list-view');
    listViewBtn.classList.add('active');
    gridViewBtn.classList.remove('active');
});

// Wishlist click listener (delegated)
productGrid.addEventListener('click', handleWishlistClick);
dealsGrid.addEventListener('click', handleWishlistClick);

// Scroll to top listener
window.onscroll = () => {
    const showButton = document.body.scrollTop > 100 || document.documentElement.scrollTop > 100;
    scrollToTopBtn.style.display = showButton ? "block" : "none";
};
scrollToTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ================== INITIAL LOAD ==================
handleNewSearch();

