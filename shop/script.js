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
const placeholderImage = 'https://i.imgur.com/WJ9S92O.png';

let allProducts = []; // This will store all products fetched from Airtable

/**
 * Reusable function to display products on the page
 * @param {Array} productsToDisplay - An array of product objects
 */
function displayProducts(productsToDisplay) {
    productGrid.innerHTML = ''; // Clear existing products

    if (productsToDisplay.length === 0) {
        productGrid.innerHTML = '<p>No products match your search. Try another category or search term!</p>';
        return;
    }

    productsToDisplay.forEach(record => {
        const fields = record.fields;

        // Skip if essential fields are missing
        if (!fields.Name || !fields.Status || fields.Status !== 'Approved') {
            return;
        }

        const imageUrl = fields.Image && fields.Image.length > 0 ? fields.Image[0].url : placeholderImage;
        
        // The entire card is now a link to the product detail page
        const productCardLink = document.createElement('a');
        productCardLink.className = 'product-card-link'; // You can use this class for styling if you want
        productCardLink.href = `../product/?id=${record.id}`; // The magic link to the detail page!

        // The HTML for the card itself. Notice the "Contact Seller" button is removed
        // because users will now click the card to see details and contact info.
        productCardLink.innerHTML = `
            <article class="product-card">
                <img src="${imageUrl}" alt="${fields.Name}">
                <h3>${fields.Name}</h3>
                <p class="product-price">UGX ${fields.Price ? fields.Price.toLocaleString() : 'N/A'}</p>
                <p class="product-description">Seller: ${fields.SellerName || 'N/A'}</p>
            </article>
        `;
        productGrid.appendChild(productCardLink);
    });
}

/**
 * Fetches all products from Airtable and stores them
 */
async function fetchAllProducts() {
    productGrid.innerHTML = '<p>Loading products from Kabale...</p>';
    try {
        const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}?filterByFormula=AND({Status}!='Pending Approval', {Status}!='Sold')`;

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${AIRTABLE_PAT}` }
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        allProducts = data.records; // Store all fetched products
        displayProducts(allProducts); // Display all products initially

    } catch (error) {
        console.error('Error fetching products:', error);
        productGrid.innerHTML = '<p>Sorry, we could not load the products. Please try refreshing the page.</p>';
    }
}

// --- Event Listeners for Filtering and Searching ---

// 1. Search functionality
searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const searchTerm = searchInput.value.toLowerCase();
    const filteredProducts = allProducts.filter(record => {
        return record.fields.Name && record.fields.Name.toLowerCase().includes(searchTerm);
    });
    displayProducts(filteredProducts);
});

// 2. Category filtering functionality
categoryScroller.addEventListener('click', (event) => {
    if (event.target.tagName === 'BUTTON') {
        // Handle the 'active' class for styling
        document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');

        const category = event.target.dataset.category;
        
        if (category === 'All') {
            displayProducts(allProducts); // Show all products
        } else {
            const filteredProducts = allProducts.filter(record => {
                return record.fields.Category && record.fields.Category === category;
            });
            displayProducts(filteredProducts);
        }
    }
});


// --- Initial Page Load ---
fetchAllProducts();
