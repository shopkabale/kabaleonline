// NOTE: Your Airtable credentials are no longer needed in this file.

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
const PAGE_SIZE = 20;
let pageOffsets = [null];
let currentPage = 0;
let currentFilters = {
    category: 'All',
    district: 'All',
    searchTerm: ''
};

function buildFilterFormula() {
    let formulas = ["{Status}='Approved'"];
    if (currentFilters.category !== 'All') formulas.push(`{Category}='${currentFilters.category}'`);
    if (currentFilters.district !== 'All') formulas.push(`{District}='${currentFilters.district}'`);
    if (currentFilters.searchTerm) formulas.push(`SEARCH('${currentFilters.searchTerm.toLowerCase()}', LOWER({Name}))`);
    return formulas.length === 1 ? formulas[0] : `AND(${formulas.join(', ')})`;
}

async function fetchProductsForPage(offset) {
    productGrid.innerHTML = '<p>Loading products...</p>';
    nextBtn.disabled = true;
    prevBtn.disabled = true;

    const filterFormula = buildFilterFormula();
    
    const queryParams = new URLSearchParams({
        pageSize: PAGE_SIZE,
        filterByFormula: filterFormula
    });
    if (offset) {
        queryParams.set('offset', offset);
    }
    
    // This now calls your own backend caching function
    const url = `/.netlify/functions/get-products?${queryParams.toString()}`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Server error: ${response.status}`);
        
        const data = await response.json();
        displayProducts(data.records);

        if (data.offset) {
            nextBtn.disabled = false;
            if (currentPage === pageOffsets.length - 1) pageOffsets.push(data.offset);
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

function displayProducts(records) {
    productGrid.innerHTML = '';
    if (!records || records.length === 0) {
        productGrid.innerHTML = '<p>No products match your filter. Try again!</p>';
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

function handleFilterChange() {
    currentPage = 0;
    pageOffsets = [null];
    fetchProductsForPage(null);
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
