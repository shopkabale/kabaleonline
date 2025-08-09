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

// --- STATE MANAGEMENT ---
const PAGE_SIZE = 16;
let pageOffsets = [null]; // Stores the 'offset' for each page to enable pagination
let currentPage = 0;
let currentFilters = {
    category: 'All',
    district: 'All',
    searchTerm: ''
};
// A flag to know if we are showing "Featured" items or user-filtered items
let isShowingFeatured = true; 

// --- FUNCTIONS ---

/**
 * Builds the Airtable filter formula based on current state.
 * @param {boolean} isInitialLoad - If true, it fetches only featured items.
 * @returns {string} The Airtable filter formula.
 */
function buildFilterFormula(isInitialLoad = false) {
    let formulas = ["{Status}='Approved'"];
    
    // On the very first page load, we only show featured items.
    if (isInitialLoad) {
        formulas.push("{IsFeatured}=1");
        return `AND(${formulas.join(', ')})`;
    }
    
    // For all subsequent fetches (searches, category clicks, etc.), use the user's filters.
    if (currentFilters.category !== 'All') formulas.push(`{Category}='${currentFilters.category}'`);
    if (currentFilters.district !== 'All') formulas.push(`{District}='${currentFilters.district}'`);
    if (currentFilters.searchTerm) {
        // Airtable search is case-insensitive, but we lowercase for safety
        const searchTerm = currentFilters.searchTerm.replace(/'/g, "\\'"); // Sanitize single quotes
        formulas.push(`SEARCH('${searchTerm.toLowerCase()}', LOWER({Name}))`);
    }
    
    return formulas.length === 1 ? formulas[0] : `AND(${formulas.join(', ')})`;
}

/**
 * Fetches products from our Netlify function based on the current page and filters.
 * @param {string} filterFormula - The Airtable formula to filter by.
 * @param {string|null} offset - The offset for pagination, if any.
 */
async function fetchProducts(filterFormula, offset) {
    productGrid.innerHTML = '<p>Loading products...</p>';
    nextBtn.disabled = true;
    prevBtn.disabled = true;

    const queryParams = new URLSearchParams({
        pageSize: PAGE_SIZE,
        filterByFormula: filterFormula
    });

    if (offset) {
        queryParams.set('offset', offset);
    }
    
    const url = `/.netlify/functions/get-products?${queryParams.toString()}`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Server error: ${response.status}`);
        
        const data = await response.json();
        displayProducts(data.records);

        // Manage pagination state
        if (data.offset) {
            nextBtn.disabled = false;
            // Only add the new offset if we are moving forward
            if (currentPage === pageOffsets.length - 1) {
                pageOffsets.push(data.offset);
            }
        } else {
            nextBtn.disabled = true;
        }

        prevBtn.disabled = (currentPage === 0);
        pageIndicator.textContent = `Page ${currentPage + 1}`;

    } catch (error) {
        console.error('Error fetching products:', error);
        productGrid.innerHTML = '<p>Sorry, we could not load the products. Please check your connection and try again.</p>';
    }
}

/**
 * Renders the product cards to the grid.
 * @param {Array} records - An array of product records from Airtable.
 */
function displayProducts(records) {
    productGrid.innerHTML = '';
    if (!records || records.length === 0) {
        let message = isShowingFeatured ? 
            'No featured products found. Showing all products instead...' : 
            'No products match your filter. Try a different search!';
        productGrid.innerHTML = `<p>${message}</p>`;
        
        // If the initial "Featured" search returns nothing, fall back to showing all products.
        if (isShowingFeatured) {
            isShowingFeatured = false;
            handleFilterChange();
        }
        return;
    }
    records.forEach(record => {
        const fields = record.fields;
        if (!fields.Name) return;

        const imageUrl = fields.Image && fields.Image.length > 0 ? fields.Image[0].url : placeholderImage;
        const productCardLink = document.createElement('a');
        productCardLink.className = 'product-card-link';
        productCardLink.href = `product/?id=${record.id}`;
        productCardLink.innerHTML = `
            <article class="product-card">
                <img src="${imageUrl}" alt="${fields.Name}" loading="lazy">
                <h3>${fields.Name}</h3>
                <p class="product-price">UGX ${fields.Price ? fields.Price.toLocaleString() : 'N/A'}</p>
                <p class="product-description">Seller: ${fields.SellerName || 'N/A'}</p>
            </article>`;
        productGrid.appendChild(productCardLink);
    });
}

/**
 * A central function to handle any change in filters. Resets pagination and fetches new data.
 */
function handleFilterChange() {
    isShowingFeatured = false; // Any filter change means we are no longer showing just "featured"
    currentPage = 0;
    pageOffsets = [null];
    const formula = buildFilterFormula();
    fetchProducts(formula, null);
}

// --- EVENT LISTENERS ---
searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    currentFilters.searchTerm = searchInput.value;
    handleFilterChange();
});

categoryScroller.addEventListener('click', (event) => {
    if (event.target.tagName === 'BUTTON') {
        document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
        currentFilters.category = event.target.dataset.category;
        handleFilterChange();
    }
});

districtFilter.addEventListener('change', () => {
    currentFilters.district = districtFilter.value;
    handleFilterChange();
});

nextBtn.addEventListener('click', () => {
    currentPage++;
    const formula = buildFilterFormula();
    fetchProducts(formula, pageOffsets[currentPage]);
});

prevBtn.addEventListener('click', () => {
    if (currentPage > 0) {
        currentPage--;
        const formula = buildFilterFormula();
        fetchProducts(formula, pageOffsets[currentPage]);
    }
});

// --- INITIAL PAGE LOAD ---
// On first load, we fetch only the "Featured" products.
fetchProducts(buildFilterFormula(true), null);
