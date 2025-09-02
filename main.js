import { auth, db } from './firebase.js'; // db is needed by shared.js

// ================== FEATURED SERVICES LOGIC START ==================
async function fetchAndDisplayServices() {
    const servicesSection = document.getElementById('services-section');
    const servicesGrid = document.getElementById('services-grid');

    try {
        const response = await fetch('/.netlify/functions/fetch-services');
        if (!response.ok) {
            throw new Error('Network response for services was not ok.');
        }
        const services = await response.json();

        if (services && services.length > 0) {
            servicesGrid.innerHTML = ''; // Clear any loading message
            services.forEach(product => {
                const primaryImage = (product.imageUrls && product.imageUrls.length > 0) ? product.imageUrls[0] : 'placeholder.webp';
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
                servicesGrid.appendChild(productLink);
            });
            servicesSection.style.display = 'block';
        } else {
            servicesSection.style.display = 'none';
        }
    } catch (error) {
        console.error("Could not fetch services:", error);
        servicesSection.style.display = 'none';
    }
}
// ================== FEATURED SERVICES LOGIC END ==================

const productGrid = document.getElementById('product-grid');
const searchInput = document.getElementById('search-input');
const loadMoreBtn = document.getElementById('load-more-btn');
const searchBtn = document.getElementById('search-btn');

const categoryFilter = document.getElementById('category-filter');
const minPriceInput = document.getElementById('min-price');
const maxPriceInput = document.getElementById('max-price');
const applyFiltersBtn = document.getElementById('apply-filters-btn');

const PRODUCTS_PER_PAGE = 30;
let lastVisibleProductId = null;
let fetching = false;

let currentQuery = {
    searchTerm: "",
    category: "",
    minPrice: "",
    maxPrice: ""
};

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

async function fetchProducts(isNewSearch = false) {
    if (fetching) return;
    fetching = true;
    loadMoreBtn.textContent = 'Loading...';

    if (isNewSearch) {
        renderSkeletonLoaders(8);
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
            productGrid.innerHTML = '<p>No listings match your criteria.</p>';
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
        productGrid.innerHTML = '<p>Sorry, could not load listings.</p>';
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
searchBtn.addEventListener('click', handleNewSearch);

searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        handleNewSearch();
    }
});

loadMoreBtn.addEventListener('click', () => fetchProducts(false));

// Initial Load
fetchAndDisplayServices();
fetchProducts(true);
