const productGrid = document.getElementById('product-grid');
const searchInput = document.getElementById('search-input');
const loadMoreBtn = document.getElementById('load-more-btn');
const searchBtn = document.getElementById('search-btn');
const categoryFilter = document.getElementById('category-filter');
const minPriceInput = document.getElementById('min-price');
const maxPriceInput = document.getElementById('max-price');
const applyFiltersBtn = document.getElementById('apply-filters-btn');
const listingsTitle = document.getElementById('listings-title');

const PRODUCTS_PER_PAGE = 30;
let lastVisibleProductId = null;
let fetching = false;
let currentQuery = { searchTerm: "", category: "", minPrice: "", maxPrice: "" };

const urlParams = new URLSearchParams(window.location.search);
const listingTypeFilter = urlParams.get('type');

async function fetchProducts(isNewSearch = false) {
    if (fetching) return;
    fetching = true;
    loadMoreBtn.textContent = 'Loading...';

    if (isNewSearch) {
        lastVisibleProductId = null;
        productGrid.innerHTML = '<p>Loading listings...</p>';
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
        // In main.js -> renderProducts function
const verifiedBadge = product.sellerIsVerified 
    ? `<svg class="verified-badge-svg" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"></path></svg>` 
    : '';

        const displayName = product.sellerName || 'A Seller';

        const sellerInfo = product.sellerId 
            ? `<p class="seller-info">By: <a href="profile.html?sellerId=${product.sellerId}">${displayName}</a> ${verifiedBadge}</p>`
            : '';

        const productLink = document.createElement('a');
        productLink.href = `product.html?id=${product.id}`;
        productLink.className = 'product-card-link';
        productLink.innerHTML = `
            <div class="product-card">
                <img src="${primaryImage}" alt="${product.name}">
                <h3>${product.name}</h3>
                <p class="price">UGX ${product.price.toLocaleString()}</p>
                ${sellerInfo}
            </div>`;
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

if (listingTypeFilter === 'service') {
    listingsTitle.textContent = 'Services';
} else {
    listingsTitle.textContent = 'All Items';
}

fetchProducts(true);
