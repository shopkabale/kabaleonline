// The final script.js with client-side filtering
document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENT SELECTORS ---
    const mainGrid = document.getElementById('product-grid');
    const sponsoredGrid = document.getElementById('sponsored-products-grid');
    const verifiedGrid = document.getElementById('verified-products-grid');
    const saleGrid = document.getElementById('sale-products-grid');
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    const categoryScroller = document.getElementById('category-scroller');
    document.getElementById('pagination-controls')?.remove(); // Remove pagination

    // --- STATE & DATA STORAGE ---
    let allProducts = [];
    const state = { searchTerm: '', category: 'All' };

    // --- RENDERING FUNCTION ---
    function renderProductCard(product, container) {
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
        container.appendChild(card);
    }

    function renderGrids() {
        let filteredProducts = allProducts;
        if (state.category !== 'All') {
            filteredProducts = filteredProducts.filter(p => p.Category === state.category);
        }
        if (state.searchTerm) {
            filteredProducts = filteredProducts.filter(p => p.Name && p.Name.toLowerCase().includes(state.searchTerm.toLowerCase()));
        }

        mainGrid.innerHTML = '';
        if (filteredProducts.length === 0) {
            mainGrid.innerHTML = '<p>No products found matching your criteria.</p>';
        } else {
            filteredProducts.forEach(product => renderProductCard(product, mainGrid));
        }
    }

    // --- EVENT LISTENERS ---
    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        state.searchTerm = searchInput.value.trim();
        renderGrids();
    });

    categoryScroller.addEventListener('click', (e) => {
        if (e.target.classList.contains('category-btn')) {
            categoryScroller.querySelector('.active').classList.remove('active');
            e.target.classList.add('active');
            state.category = e.target.dataset.category;
            renderGrids();
        }
    });

    // --- INITIAL PAGE LOAD ---
    async function initialLoad() {
        try {
            mainGrid.innerHTML = '<p>Loading products...</p>';
            sponsoredGrid.innerHTML = '<p>Loading...</p>';
            verifiedGrid.innerHTML = '<p>Loading...</p>';
            saleGrid.innerHTML = '<p>Loading...</p>';

            const response = await fetch(`/.netlify/functions/get-products`);
            if (!response.ok) throw new Error('Fetch failed');
            
            allProducts = await response.json();
            
            // Render the main grid with all products
            renderGrids();
            
            // Render the carousels by filtering the main list
            sponsoredGrid.innerHTML = '';
            allProducts.filter(p => p.IsSponsored === 'TRUE').slice(0, 10).forEach(p => renderProductCard(p, sponsoredGrid));
            
            verifiedGrid.innerHTML = '';
            allProducts.filter(p => p.IsVerified === 'TRUE').slice(0, 10).forEach(p => renderProductCard(p, verifiedGrid));

            saleGrid.innerHTML = '';
            allProducts.filter(p => p.IsOnSale === 'TRUE').slice(0, 10).forEach(p => renderProductCard(p, saleGrid));

        } catch (error) {
            mainGrid.innerHTML = '<p>Sorry, we could not load the products.</p>';
            sponsoredGrid.innerHTML = '<p>Could not load items.</p>';
            verifiedGrid.innerHTML = '<p>Could not load items.</p>';
            saleGrid.innerHTML = '<p>Could not load items.</p>';
            console.error('Failed to load initial data:', error);
        }
    }

    initialLoad();
});
