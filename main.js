// --- DOM Element References ---
const productGrid = document.getElementById('product-grid');
const searchInput = document.getElementById('search-input');
const listingsTitle = document.getElementById('listings-title');
const searchBtn = document.getElementById('search-btn');
const loadMoreBtn = document.getElementById('load-more-btn');

// --- State Management ---
const PRODUCTS_PER_PAGE = 30;
let currentPage = 0; // Use page number for pagination, not lastVisibleId.
let fetching = false;
let currentSearchTerm = "";

// Read filter from URL.
const urlParams = new URLSearchParams(window.location.search);
const listingTypeFilter = urlParams.get('type');

/**
 * Renders skeleton loaders to indicate that content is being loaded.
 * @param {number} count - The number of skeleton cards to display.
 */
function renderSkeletonLoaders(count) {
    let skeletons = '';
    for (let i = 0; i < count; i++) {
        skeletons += `
            <div class="skeleton-card">
                <div class="skeleton-image"></div>
                <div class="skeleton-text">
                    <div class="skeleton-line"></div>
                    <div class="skeleton-line skeleton-line-short"></div>
                </div>
            </div>
        `;
    }
    productGrid.innerHTML = skeletons;
}

/**
 * Fetches products from the backend API.
 * Handles both new searches and "load more" actions with page-based logic.
 * @param {boolean} isNewSearch - True if this is a new search, false if loading more.
 */
async function fetchProducts(isNewSearch = false) {
    if (fetching) return;
    fetching = true;

    if (isNewSearch) {
        productGrid.innerHTML = ''; // Clear previous results.
        renderSkeletonLoaders(12); // Show skeletons for initial load.
        loadMoreBtn.style.display = 'none'; // Hide button until we know there's more.
    }

    // --- Build the API URL with page and type parameters ---
    let url = `/.netlify/functions/search?searchTerm=${encodeURIComponent(currentSearchTerm)}&page=${currentPage}`;
    // FIXED: Send the 'type' filter to the backend.
    if (listingTypeFilter) {
        url += `&type=${listingTypeFilter}`;
    }

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok.');
        
        // The backend now returns an object with 'products' and 'totalPages'.
        const { products, totalPages } = await response.json();

        // Clear skeletons on first load. For "load more", there are no skeletons.
        if (isNewSearch) {
            document.querySelectorAll('.skeleton-card').forEach(card => card.remove());
        }

        if (products.length === 0 && isNewSearch) {
            productGrid.innerHTML = '<p>No listings match your criteria.</p>';
        } else {
            renderProducts(products);
        }

        // --- FIXED: Pagination Logic ---
        // Show the "Load More" button if the current page is less than the total pages.
        if (currentPage + 1 < totalPages) {
            loadMoreBtn.style.display = 'block';
        } else {
            loadMoreBtn.style.display = 'none';
        }

    } catch (error) {
        console.error("Error fetching products:", error);
        productGrid.innerHTML = '<p>Sorry, could not load listings. Please try again later.</p>';
    } finally {
        fetching = false;
        // FIXED: Reset button text and state after fetch is complete.
        loadMoreBtn.textContent = 'Load More';
        loadMoreBtn.disabled = false;
    }
}

/**
 * Renders an array of product objects into the DOM.
 * @param {Array<Object>} productsToDisplay - The products to render.
 */
function renderProducts(productsToDisplay) {
    const fragment = document.createDocumentFragment();
    productsToDisplay.forEach(product => {
        const primaryImage = (product.imageUrls && product.imageUrls.length > 0) ? product.imageUrls[0] : 'https://placehold.co/400x400/e0e0e0/777?text=No+Image';
        const displayName = product.sellerName || 'A Seller';

        const productLink = document.createElement('a');
        productLink.href = `product.html?id=${product.id}`;
        productLink.className = 'product-card-link';
        productLink.innerHTML = `
            <div class="product-card">
                <img src="${primaryImage}" alt="${product.name}" loading="lazy" onerror="this.src='https://placehold.co/400x400/e0e0e0/777?text=No+Image'">
                <h3>${product.name}</h3>
                <p class="price">UGX ${product.price.toLocaleString()}</p>
                <p class="seller-info">By: ${displayName}</p>
            </div>`;
        fragment.appendChild(productLink);
    });
    productGrid.appendChild(fragment);
}

/**
 * Initiates a new search.
 */
function handleNewSearch() {
    currentPage = 0; // Reset to the first page for every new search.
    currentSearchTerm = searchInput.value;
    fetchProducts(true);
}

// --- Event Listeners ---
searchBtn.addEventListener('click', handleNewSearch);
searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        handleNewSearch();
    }
});

loadMoreBtn.addEventListener('click', () => {
    // FIXED: Add loading feedback to the button.
    loadMoreBtn.textContent = 'Loading more...';
    loadMoreBtn.disabled = true;
    
    currentPage++; // Increment the page number before fetching the next set.
    fetchProducts(false); // 'false' indicates this is not a new search.
});


// --- Initial Page Load ---
// Set title based on filter and trigger the first fetch.
if (listingTypeFilter === 'service') {
    listingsTitle.textContent = 'Services';
    document.title = "Kabale Online | Services"; // Also good to update the page title
} else {
    listingsTitle.textContent = 'All Items';
}
fetchProducts(true);