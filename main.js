// --- DOM Element References ---
const productGrid = document.getElementById('product-grid');
const searchInput = document.getElementById('search-input');
const listingsTitle = document.getElementById('listings-title');
const searchBtn = document.getElementById('search-btn');
const loadMoreBtn = document.getElementById('load-more-btn');

// --- State Management ---
let currentPage = 0;
let fetching = false;
let currentSearchTerm = "";
let totalPages = 0;

const urlParams = new URLSearchParams(window.location.search);
const listingTypeFilter = urlParams.get('type');

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

async function fetchProducts(isNewSearch = false) {
    if (fetching) return;
    fetching = true;
    loadMoreBtn.disabled = true;

    if (isNewSearch) {
        renderSkeletonLoaders(12);
        loadMoreBtn.style.display = 'none';
    } else {
        loadMoreBtn.textContent = 'Loading more...';
    }

    let url = `/.netlify/functions/search?searchTerm=${encodeURIComponent(currentSearchTerm)}&page=${currentPage}`;
    if (listingTypeFilter) {
        url += `&type=${listingTypeFilter}`;
    }

    try {
        const response = await fetch(url);
        if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(`Network response was not ok. Status: ${response.status}. Message: ${errorBody.error}`);
        }

        const data = await response.json();
        const { products } = data;
        totalPages = data.totalPages;

        if (isNewSearch) {
            productGrid.innerHTML = '';
        }

        if (products.length === 0 && isNewSearch) {
            productGrid.innerHTML = '<p>No listings match your criteria.</p>';
        } else {
            renderProducts(products);
        }

        if (currentPage + 1 < totalPages) {
            loadMoreBtn.style.display = 'block';
        } else {
            loadMoreBtn.style.display = 'none';
        }

    } catch (error) {
        console.error("--- DETAILED FETCH ERROR ---", error);
        if(isNewSearch) {
            productGrid.innerHTML = `<p>Sorry, could not load listings. Please check the browser console (F12 or right-click -> Inspect -> Console) for detailed errors and try again.</p>`;
        }
    } finally {
        fetching = false;
        loadMoreBtn.textContent = 'Load More';
        loadMoreBtn.disabled = false;
    }
}

function renderProducts(productsToDisplay) {
    const fragment = document.createDocumentFragment();
    productsToDisplay.forEach(product => {
        const primaryImage = (product.imageUrls && product.imageUrls.length > 0) ? product.imageUrls[0] : 'https://placehold.co/400x400/e0e0e0/777?text=No+Image';
        const isSold = product.isSold || false;

        // --- THIS IS THE MODIFIED LOGIC ---
        // Conditionally create the seller info HTML.
        // If product.sellerName exists, the HTML is created. Otherwise, sellerInfoHtml remains an empty string.
        let sellerInfoHtml = '';
        if (product.sellerName) {
            sellerInfoHtml = `<p class="seller-info">By: ${product.sellerName}</p>`;
        }
        // --- END OF MODIFIED LOGIC ---

        const productLink = document.createElement('a');
        if (isSold) {
            productLink.href = 'javascript:void(0)';
            productLink.style.cursor = 'default';
        } else {
            productLink.href = `product.html?id=${product.id}`;
        }
        productLink.className = 'product-card-link';

        // The sellerInfoHtml variable is now used here. It will be blank if there's no name.
        productLink.innerHTML = `
            <div class="product-card ${isSold ? 'is-sold' : ''}">
                ${isSold ? '<div class="sold-out-tag">SOLD</div>' : ''}
                <img src="${primaryImage}" alt="${product.name}" loading="lazy" onerror="this.src='https://placehold.co/400x400/e0e0e0/777?text=Error'">
                <h3>${product.name}</h3>
                <p class="price">UGX ${product.price.toLocaleString()}</p>
                ${sellerInfoHtml}
            </div>`;
        fragment.appendChild(productLink);
    });
    productGrid.appendChild(fragment);
}

function handleNewSearch() {
    currentPage = 0;
    currentSearchTerm = searchInput.value;
    fetchProducts(true);
}

searchBtn.addEventListener('click', handleNewSearch);
searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        handleNewSearch();
    }
});

loadMoreBtn.addEventListener('click', () => {
    currentPage++;
    fetchProducts(false);
});

if (listingTypeFilter === 'service') {
    listingsTitle.textContent = 'Services';
    document.title = "Kabale Online | Services";
} else {
    listingsTitle.textContent = 'All Items';
}
fetchProducts(true);
