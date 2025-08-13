// --- DOM ELEMENTS ---
const productGrid = document.getElementById('product-grid');
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const categoryScroller = document.getElementById('category-scroller');
// Removed 'districtFilter' element
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const pageIndicator = document.getElementById('page-indicator');
const placeholderImage = 'https://i.imgur.com/WJ9S92O.png';
const heroSection = document.querySelector('.hero-section');
const marketplaceSection = document.querySelector('.marketplace-section');
const sponsoredGrid = document.getElementById('sponsored-products-grid');
const verifiedGrid = document.getElementById('verified-products-grid');
const saleGrid = document.getElementById('sale-products-grid');

// --- STATE MANAGEMENT ---
const PAGE_SIZE = 16;
let currentPage = 1;
let currentFilters = {
    category: 'All',
    // Removed 'district' from the state
    searchTerm: ''
};
let isShowingFeatured = true; 

// --- FUNCTIONS ---

function updatePageView(shouldBePaginatedView) {
    if (shouldBePaginatedView) {
        heroSection.classList.add('section-hidden');
        marketplaceSection.scrollIntoView({ behavior: 'smooth' });
    } else {
        heroSection.classList.remove('section-hidden');
    }
}

async function fetchProducts(page = 1) {
    productGrid.innerHTML = '<p>Loading products...</p>';
    nextBtn.disabled = true;
    prevBtn.disabled = true;

    const queryParams = new URLSearchParams({ pageSize: PAGE_SIZE, page: page });
    
    if (!isShowingFeatured) {
        if (currentFilters.category !== 'All') queryParams.set('category', currentFilters.category);
        // Removed 'district' from the query parameters
        if (currentFilters.searchTerm) queryParams.set('searchTerm', currentFilters.searchTerm);
    } else {
        queryParams.set('type', 'featured');
    }

    const url = `/.netlify/functions/get-products?${queryParams.toString()}`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Server error: ${response.status}`);
        
        const data = await response.json();
        displayProducts(data.results, productGrid); 

        nextBtn.disabled = data.next === null;
        prevBtn.disabled = data.previous === null;
        currentPage = page;
        pageIndicator.textContent = `Page ${currentPage}`;
    } catch (error) {
        console.error('Error fetching products:', error);
        productGrid.innerHTML = '<p>Sorry, we could not load the products. Please check your connection and try again.</p>';
    }
}

function displayProducts(results, container) {
    container.innerHTML = '';
    if (!results || results.length === 0) {
        if (container.id === 'product-grid') {
            container.innerHTML = `<p>No products match your filter. Try a different search!</p>`;
        } else {
            container.innerHTML = `<p>No items to show here right now.</p>`;
        }
        return;
    }
    results.forEach(record => {
        if (!record.Name) return;
        const imageUrl = record.Image && record.Image.length > 0 ? record.Image[0].url : placeholderImage;
        const productCardLink = document.createElement('a');
        productCardLink.className = 'product-card-link';
        productCardLink.href = `product/?id=${record.id}`;
        productCardLink.innerHTML = `
            <article class="product-card">
                <img src="${imageUrl}" alt="${record.Name}" loading="lazy">
                <h3>${record.Name}</h3>
                <p class="product-price">UGX ${record.Price ? record.Price.toLocaleString() : 'N/A'}</p>
                <p class="product-description">Seller: ${record.SellerName || 'N/A'}</p>
            </article>`;
        container.appendChild(productCardLink);
    });
}

async function loadCarouselProducts(type, container) {
    try {
        const url = `/.netlify/functions/get-products?type=${type}&pageSize=10`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch ${type} products`);
        const data = await response.json();
        displayProducts(data.results, container);
    } catch (error) {
        console.error(`Error loading ${type} products:`, error);
        container.innerHTML = `<p>Could not load items.</p>`;
    }
}

function handleFilterChange(isPaginatedAction = true) {
    isShowingFeatured = false;
    updatePageView(isPaginatedAction);
    fetchProducts(1);
}

// --- EVENT LISTENERS ---
searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    currentFilters.searchTerm = searchInput.value;
    handleFilterChange();
});

searchInput.addEventListener('input', (event) => {
    if (event.target.value === '') {
        currentFilters.searchTerm = '';
        handleFilterChange(false);
    }
});

categoryScroller.addEventListener('click', (event) => {
    if (event.target.tagName === 'BUTTON') {
        document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
        currentFilters.category = event.target.dataset.category;
        handleFilterChange();
    }
});

// Removed the event listener for 'districtFilter'

nextBtn.addEventListener('click', () => {
    fetchProducts(currentPage + 1);
});

prevBtn.addEventListener('click', () => {
    fetchProducts(currentPage - 1);
});

// --- INITIAL PAGE LOAD ---
loadCarouselProducts('sponsored', sponsoredGrid);
loadCarouselProducts('verified', verifiedGrid);
loadCarouselProducts('sale', saleGrid);
fetchProducts(1);
