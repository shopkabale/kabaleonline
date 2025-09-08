const productGrid = document.getElementById('product-grid');
const searchInput = document.getElementById('search-input');
const listingsTitle = document.getElementById('listings-title');
const searchBtn = document.getElementById('search-btn');
const loadMoreBtn = document.getElementById('load-more-btn');

const PRODUCTS_PER_PAGE = 30;
let lastVisibleProductId = null;
let fetching = false;
let currentQuery = { searchTerm: "" };

const urlParams = new URLSearchParams(window.location.search);
const listingTypeFilter = urlParams.get('type');

function renderSkeletonLoaders(count) {
    productGrid.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const skeletonCard = document.createElement('div');
        skeletonCard.className = 'skeleton-card';
        skeletonCard.innerHTML = `
            <div class="skeleton-image"></div>
            <div class="skeleton-text">
                <div class="skeleton-line"></div>
                <div class="skeleton-line skeleton-line-short"></div>
            </div>
        `;
        productGrid.appendChild(skeletonCard);
    }
}

async function fetchProducts(isNewSearch = false) {
    if (fetching) return;
    fetching = true;

    if (isNewSearch) {
        lastVisibleProductId = null;
        renderSkeletonLoaders(12);
        loadMoreBtn.style.display = 'none'; // Hide button on new search
    }

    let url = `/.netlify/functions/search?searchTerm=${encodeURIComponent(currentQuery.searchTerm)}`;
    if (listingTypeFilter) {
        url += `&type=${listingTypeFilter}`;
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
            loadMoreBtn.style.display = 'none';
        }

        if (products.length > 0) {
            lastVisibleProductId = products[products.length - 1].id;
            if (products.length === PRODUCTS_PER_PAGE) {
                loadMoreBtn.style.display = 'block'; // Show if a full page was returned
            } else {
                loadMoreBtn.style.display = 'none'; // Hide if last page has been reached
            }
        }

        renderProducts(products);
    } catch (error) {
        console.error("Error fetching products:", error);
        productGrid.innerHTML = '<p>Sorry, could not load listings. Please try again later.</p>';
        loadMoreBtn.style.display = 'none';
    } finally {
        fetching = false;
    }
}

function renderProducts(productsToDisplay) {
    productsToDisplay.forEach(product => {
        const primaryImage = (product.imageUrls && product.imageUrls.length > 0) ? product.imageUrls[0] : 'placeholder.webp';

        const verifiedBadge = product.sellerBadges?.includes('verified')
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
                <img src="${primaryImage}" alt="${product.name}" loading="lazy">
                <h3>${product.name}</h3>
                <p class="price">UGX ${product.price.toLocaleString()}</p>
                ${sellerInfo}
            </div>`;
        productGrid.appendChild(productLink);
    });
}

function handleNewSearch() {
    currentQuery = {
        searchTerm: searchInput.value
    };
    fetchProducts(true);
}

searchBtn.addEventListener('click', handleNewSearch);

searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        handleNewSearch();
    }
});

// Load more products when button is clicked
loadMoreBtn.addEventListener('click', () => {
    fetchProducts(false);
});

// Handle the floating CTA button
const ctaFloatingContainer = document.querySelector('.cta-floating-container');
ctaFloatingContainer.addEventListener('click', () => {
    ctaFloatingContainer.classList.toggle('expanded');
});

if (listingTypeFilter === 'service') {
    listingsTitle.textContent = 'Services';
} else {
    listingsTitle.textContent = 'All Items';
}

fetchProducts(true);
