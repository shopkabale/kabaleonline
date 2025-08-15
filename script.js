// The final, "smart" script.js with client-side filtering
document.addEventListener('DOMContentLoaded', () => {
    
    // --- ELEMENT SELECTORS ---
    const mainGrid = document.getElementById('product-grid');
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    const categoryScroller = document.getElementById('category-scroller');
    // We remove pagination as we will show all results
    document.getElementById('pagination-controls')?.remove();

    // --- STATE & DATA STORAGE ---
    let allProducts = []; // This will store all products from the sheet
    const state = {
        searchTerm: '',
        category: 'All',
    };

    // --- RENDERING FUNCTION ---
    function renderGrid(productsToDisplay) {
        mainGrid.innerHTML = ''; // Clear the grid

        if (productsToDisplay.length === 0) {
            mainGrid.innerHTML = '<p>No products found matching your criteria.</p>';
            return;
        }

        productsToDisplay.forEach(product => {
            if (!product || !product.Name || !product.Price) return;
            
            const card = document.createElement('article');
            card.className = 'product-card';
            const imageUrl = product.ImageURL || '';
            const formattedPrice = new Intl.NumberFormat('en-US').format(product.Price);

            card.innerHTML = `
                <a href="/Product/index.html?id=${product.id}" style="text-decoration:none; color:inherit;">
                    <img src="${imageUrl}" alt="${product.Name}" loading="lazy">
                    <div class="product-info">
                        <h2 class="product-name">${product.Name}</h2>
                        <p class="product-price">UGX ${formattedPrice}</p>
                        <p class="product-seller">by ${product.SellerName}</p>
                    </div>
                </a>
            `;
            mainGrid.appendChild(card);
        });
    }

    // --- FILTERING FUNCTION ---
    function applyFilters() {
        let filteredProducts = allProducts;

        // 1. Filter by category
        if (state.category && state.category !== 'All') {
            filteredProducts = filteredProducts.filter(p => p.Category === state.category);
        }

        // 2. Filter by search term
        if (state.searchTerm) {
            filteredProducts = filteredProducts.filter(p => p.Name && p.Name.toLowerCase().includes(state.searchTerm.toLowerCase()));
        }

        renderGrid(filteredProducts);
    }
    
    // --- EVENT LISTENERS ---
    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        state.searchTerm = searchInput.value.trim();
        applyFilters();
    });

    categoryScroller.addEventListener('click', (e) => {
        if (e.target.classList.contains('category-btn')) {
            categoryScroller.querySelector('.active').classList.remove('active');
            e.target.classList.add('active');
            state.category = e.target.dataset.category;
            applyFilters();
        }
    });

    // --- INITIAL PAGE LOAD ---
    async function initialLoad() {
        try {
            mainGrid.innerHTML = '<p>Loading products...</p>';
            const response = await fetch(`/.netlify/functions/get-products`);
            if (!response.ok) throw new Error('Main grid fetch failed');
            
            allProducts = await response.json(); // Store all products in our variable
            renderGrid(allProducts); // Render them for the first time
            
        } catch (error) {
            mainGrid.innerHTML = '<p>Sorry, we could not load the products. Please try again.</p>';
            console.error('Failed to load main grid:', error);
        }
    }

    initialLoad();

    // We no longer need the carousel logic or dynamic header here,
    // as this script is for the main marketplace grid.
});
