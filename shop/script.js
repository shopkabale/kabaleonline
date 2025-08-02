// -------------------------------------------------------------------
//  1. PASTE YOUR AIRTABLE CREDENTIALS HERE
// -------------------------------------------------------------------
const AIRTABLE_PAT = 'patzDYgydGNXIeZI5.0eb7d58cd9de9dc8f6f224a8723aef57282ca03695d136347dfce34563fe8ecb';
const AIRTABLE_BASE_ID = 'app6fysZN2R6mvvXY';
const AIRTABLE_TABLE_NAME = 'Products';

// -------------------------------------------------------------------
//  2. DO NOT EDIT BELOW THIS LINE
// -------------------------------------------------------------------

const productGrid = document.getElementById('product-grid');
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const categoryScroller = document.getElementById('category-scroller');
const districtFilter = document.getElementById('district-filter');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const pageIndicator = document.getElementById('page-indicator');
const placeholderImage = 'https://i.imgur.com/WJ9S92O.png';

const PAGE_SIZE = 12;
let pageOffsets = [null];
let currentPage = 0;
let currentFilters = {
    category: 'All',
    district: 'All',
    searchTerm: ''
};

function buildFilterFormula() {
    let formulas = ["{Status}='Approved'"]; 

    if (currentFilters.category !== 'All') {
        formulas.push(`{Category}='${currentFilters.category}'`);
    }
    if (currentFilters.district !== 'All') {
        formulas.push(`{District}='${currentFilters.district}'`);
    }
    if (currentFilters.searchTerm) {
        formulas.push(`SEARCH('${currentFilters.searchTerm.toLowerCase()}', LOWER({Name}))`);
    }

    return formulas.length === 1 ? formulas[0] : `AND(${formulas.join(', ')})`;
}

async function fetchProductsForPage(offset) {
    productGrid.innerHTML = '<p>Loading products...</p>';
    nextBtn.disabled = true;
    prevBtn.disabled = true;

    const filterFormula = buildFilterFormula();
    let url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}?pageSize=${PAGE_SIZE}&filterByFormula=${encodeURIComponent(filterFormula)}`;
    if (offset) url += `&offset=${offset}`;

    try {
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${AIRTABLE_PAT}` } });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
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
        productGrid.innerHTML = '<p>Sorry, we could not load the products.</p>';
    }
}

function displayProducts(records) {
    productGrid.innerHTML = '';
    if (records.length === 0) {
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

fetchProductsForPage(null);
