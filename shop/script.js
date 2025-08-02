// -------------------------------------------------------------------
//  1. PASTE YOUR AIRTABLE CREDENTIALS HERE
// -------------------------------------------------------------------
const AIRTABLE_PAT = 'patzDYgydGNXIeZI5.0eb7d58cd9de9dc8f6f224a8723aef57282ca03695d136347dfce34563fe8ecb';
const AIRTABLE_BASE_ID = 'app6fysZN2R6mvvXY';
const AIRTABLE_TABLE_NAME = 'Products';

// -------------------------------------------------------------------
//  2. DO NOT EDIT BELOW THIS LINE
// -------------------------------------------------------------------

// --- DOM ELEMENTS ---
const productGrid = document.getElementById('product-grid');
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const categoryScroller = document.getElementById('category-scroller');
const locationFilter = document.getElementById('location-filter');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const pageIndicator = document.getElementById('page-indicator');
const placeholderImage = 'https://i.imgur.com/WJ9S92O.png';

// --- STATE MANAGEMENT ---
const PAGE_SIZE = 12;
let pageOffsets = [null]; // History of page offsets, page 1 has a null offset
let currentPage = 0;    // Index of the current page in the pageOffsets array
let currentFilters = {  // Object to hold the current state of all filters
    category: 'All',
    location: 'All',
    searchTerm: ''
};

/**
 * Builds the Airtable filterByFormula string based on current filters
 */
function buildFilterFormula() {
    let formulas = ["{Status}='Approved'"]; // Base formula

    if (currentFilters.category !== 'All') {
        formulas.push(`{Category}='${currentFilters.category}'`);
    }
    if (currentFilters.location !== 'All') {
        formulas.push(`{Location}='${currentFilters.location}'`);
    }
    if (currentFilters.searchTerm) {
        // Airtable's SEARCH function is case-insensitive
        formulas.push(`SEARCH('${currentFilters.searchTerm.toLowerCase()}', LOWER({Name}))`);
    }

    if (formulas.length === 1) {
        return formulas[0]; // Only the status filter
    } else {
        return `AND(${formulas.join(', ')})`; // Combine all filters with AND
    }
}

/**
 * Fetches products for a specific page using an offset and current filters
 */
async function fetchProductsForPage(offset) {
    productGrid.innerHTML = '<p>Loading products from Kabale...</p>';
    nextBtn.disabled = true;
    prevBtn.disabled = true;

    const filterFormula = buildFilterFormula();
    let url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}?pageSize=${PAGE_SIZE}&filterByFormula=${encodeURIComponent(filterFormula)}`;
    
    if (offset) {
        url += `&offset=${offset}`;
    }

    try {
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${AIRTABLE_PAT}` } });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        displayProducts(data.records);

        // Update pagination state
        if (data.offset) {
            nextBtn.disabled = false;
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
        productGrid.innerHTML = '<p>Sorry, we could not load the products.</p>';
    }
}

/**
 * Renders a list of products to the grid
 */
function displayProducts(records) {
    productGrid.innerHTML = '';
    if (records.length === 0) {
        productGrid.innerHTML = '<p>No products match your search or filter. Try again!</p>';
        return;
    }
    records.forEach(record => {
        const fields = record.fields;
        if (!fields.Name) return;

        const imageUrl = fields.Image && fields.Image.length > 0 ? fields.Image[0].url : placeholderImage;
        const productCardLink = document.createElement('a');
        productCardLink.className = 'product-card-link';
        productCardLink.href = `../product/?id=${record.id}`;
        productCardLink.innerHTML = `
            <article class="product-card">
                <img src="${imageUrl}" alt="${fields.Name}">
                <h3>${fields.Name}</h3>
                <p class="product-price">UGX ${fields.Price ? fields.Price.toLocaleString() : 'N/A'}</p>
                <p class="product-description">Seller: ${fields.SellerName || 'N/A'}</p>
            </article>`;
        productGrid.appendChild(productCardLink);
    });
}

// --- EVENT LISTENERS ---

function handleFilterChange() {
    // When any filter changes, we reset pagination and fetch from page 1
    currentPage = 0;
    pageOffsets = [null];
    fetchProductsForPage(null);
}

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

locationFilter.addEventListener('change', () => {
    currentFilters.location = locationFilter.value;
    handleFilterChange();
});

nextBtn.addEventListener('click', () => {
    currentPage++;
    fetchProductsForPage(pageOffsets[currentPage]);
});

prevBtn.addEventListener('click', () => {
    if (currentPage > 0) {
        currentPage--;
        fetchProductsForPage(pageOffsets[currentPage]);
    }
});

// --- INITIAL PAGE LOAD ---
fetchProductsForPage(null);
