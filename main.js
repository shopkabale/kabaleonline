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
        
        const verifiedBadge = product.sellerIsVerified ? '<span title="Verified Seller" style="color: green; font-weight: bold;">✔️</span>' : '';
        
        const sellerInfo = product.sellerEmail 
            ? `<p class="seller-info" style="font-size: 0.8em; color: grey; margin: 5px 0;">By: <a href="profile.html?sellerId=${product.sellerId}" style="color: grey; text-decoration: underline;">${product.sellerEmail}</a> ${verifiedBadge}</p>`
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
    observeElementsForAnimation();
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

// MODIFICATION: Set the page title based on the filter
if (listingTypeFilter === 'service') {
    listingsTitle.textContent = 'Student Hustles';
} else {
    listingsTitle.textContent = 'All Items';
}
// The active class is now handled by shared.js, so we removed it from here.

fetchProducts(true);

function observeElementsForAnimation() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1
    });

    const elementsToAnimate = document.querySelectorAll('.product-card-link:not(.visible)');
    elementsToAnimate.forEach(el => {
        observer.observe(el);
    });
}
