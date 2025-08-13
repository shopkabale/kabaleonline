// --- DOM ELEMENTS ---
const productGrid = document.getElementById('product-grid');
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const categoryScroller = document.getElementById('category-scroller');
const districtFilter = document.getElementById('district-filter');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const pageIndicator = document.getElementById('page-indicator');
const placeholderImage = 'https://i.imgur.com/WJ9S92O.png';

// Sections to hide/show dynamically
const heroSection = document.querySelector('.hero-section');
const marketplaceSection = document.querySelector('.marketplace-section');

// Selectors for the new carousel containers
const sponsoredGrid = document.getElementById('sponsored-products-grid');
const verifiedGrid = document.getElementById('verified-products-grid');
const saleGrid = document.getElementById('sale-products-grid');


// --- STATE MANAGEMENT ---
const PAGE_SIZE = 16;
let currentPage = 1; // Baserow uses page numbers starting from 1
let currentFilters = {
    category: 'All',
    district: 'All',
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

// ** MODIFIED **: Main function to fetch products from our new Baserow-compatible function
async function fetchProducts(page = 1) {
    productGrid.innerHTML = '<p>Loading products...</p>';
    nextBtn.disabled = true;
    prevBtn.disabled = true;

    // This now builds a simple query string with parameters our new function understands
    const queryParams = new URLSearchParams({ pageSize: PAGE_SIZE, page: page });
    
    // Add filters if we are not on the initial "Featured" load
    if (!isShowingFeatured) {
        if (currentFilters.category !== 'All') queryParams.set('category', currentFilters.category);
        if (currentFilters.district !== 'All') queryParams.set('district', currentFilters.district);
        if (currentFilters.searchTerm) queryParams.set('searchTerm', currentFilters.searchTerm);
    } else {
        // On first load, we tell the function we just want the 'featured' type
        queryParams.set('type', 'featured');
    }

    const url = `/.netlify/functions/get-products?${queryParams.toString()}`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Server error: ${response.status}`);
        
        const data = await response.json();
        
        // ** CRITICAL CHANGE **: Baserow's data is in a `results` array, not `records`
        displayProducts(data.results, productGrid); 

        // Baserow pagination works with 'next' and 'previous' links being null or not
        nextBtn.disabled = data.next === null;
        prevBtn.disabled = data.previous === null;
        currentPage = page;
        pageIndicator.textContent = `Page ${currentPage}`;
    } catch (error) {
        console.error('Error fetching products:', error);
        productGrid.innerHTML = '<p>Sorry, we could not load the products. Please check your connection and try again.</p>';
    }
}

// ** MODIFIED **: Reusable function to display products from Baserow's data structure
function displayProducts(results, container) {
    container.innerHTML = '';
    if (!results || results.length === 0) {
        if (container.id === 'product-grid') {
            let message = isShowingFeatured 
                ? 'No featured products found.' 
                : 'No products match your filter. Try a different search!';
            container.innerHTML = `<p>${message}</p>`;
        } else {
            container.innerHTML = `<p>No items to show here right now.</p>`;
        }
        return;
    }
    // ** CRITICAL CHANGE **: Baserow data is flat. We access `record.Name` directly, not `record.fields.Name`
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

// ** MODIFIED **: Carousel loader to use Baserow's `results`
async function loadCarouselProducts(type, container) {
    try {
        const url = `/.netlify/functions/get-products?type=${type}&pageSize=10`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch ${type} products`);
        const data = await response.json();
        displayProducts(data.results, container); // Use results
    } catch (error) {
        console.error(`Error loading ${type} products:`, error);
        container.innerHTML = `<p>Could not load items.</p>`;
    }
}

function handleFilterChange(isPaginatedAction = true) {
    isShowingFeatured = false;
    updatePageView(isPaginatedAction);
    fetchProducts(1); // For any new filter, always reset to page 1
}
