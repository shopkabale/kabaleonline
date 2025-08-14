// The Final script.js for your homepage
document.addEventListener('DOMContentLoaded', () => {

    // --- ELEMENT SELECTORS ---
    const mainGrid = document.getElementById('product-grid');
    const sponsoredGrid = document.getElementById('sponsored-products-grid');
    const verifiedGrid = document.getElementById('verified-products-grid');
    const saleGrid = document.getElementById('sale-products-grid');
    
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    const categoryScroller = document.getElementById('category-scroller');
    
    const paginationControls = document.getElementById('pagination-controls');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const pageIndicator = document.getElementById('page-indicator');

    // --- STATE MANAGEMENT ---
    const state = {
        searchTerm: '',
        category: 'All',
        page: 1,
        isLoading: false,
    };

    // --- API & RENDERING FUNCTIONS ---
    function renderProductCard(product, container) {
        const card = document.createElement('article');
        card.className = 'product-card';
        
        // THIS IS THE FIX: We now get the URL directly from the 'ImageURL' column.
        const imageUrl = product.ImageURL || '';
        
        const formattedPrice = new Intl.NumberFormat('en-US').format(product.Price);

        card.innerHTML = `
            <a href="shop/product.html?id=${product.id}" style="text-decoration:none; color:inherit;">
                ${imageUrl ? `<img src="${imageUrl}" alt="${product.Name}" loading="lazy">` : '<div class="product-image-placeholder"></div>'}
                <div class="product-info">
                    <h2 class="product-name">${product.Name}</h2>
                    <p class="product-price">UGX ${formattedPrice}</p>
                    <p class="product-seller">by ${product.SellerName}</p>
                </div>
            </a>
        `;
        container.appendChild(card);
    }

    async function loadCarousel(type, container) {
        // This function will need the full backend to work. For now, it might not load.
        if (!container) return;
        const params = new URLSearchParams({ type: type, pageSize: 10 });
        try {
            const response = await fetch(`/.netlify/functions/get-products?${params.toString()}`);
            if (!response.ok) throw new Error('Carousel fetch failed');
            const data = await response.json();
            container.innerHTML = '';
            data.results.forEach(product => renderProductCard(product, container));
        } catch (error) {
            container.innerHTML = '<p>Could not load items.</p>';
        }
    }
    
    async function fetchMainGridProducts() {
        if (state.isLoading) return;
        state.isLoading = true;
        mainGrid.innerHTML = '<p>Loading products...</p>';
        
        const params = new URLSearchParams({ page: state.page, pageSize: 12 });
        // NOTE: Filters like searchTerm and category will only work after the backend supports them again.
        
        try {
            const response = await fetch(`/.netlify/functions/get-products?${params.toString()}`);
            if (!response.ok) throw new Error('Main grid fetch failed');
            const data = await response.json();
            
            mainGrid.innerHTML = '';
            if (data.results.length > 0) {
                data.results.forEach(product => renderProductCard(product, mainGrid));
            } else {
                mainGrid.innerHTML = '<p>No products found.</p>';
            }
            // Pagination logic would go here once we add it back
        } catch (error) {
            mainGrid.innerHTML = '<p>Sorry, we could not load the products. Please try again.</p>';
        } finally {
            state.isLoading = false;
        }
    }

    // --- INITIAL PAGE LOAD ---
    function initialLoad() {
        // For now, let's just load the main grid since the carousels need filtering
        fetchMainGridProducts();
        // loadCarousel('sponsored', sponsoredGrid);
        // loadCarousel('verified', verifiedGrid);
        // loadCarousel('sale', saleGrid);
    }

    initialLoad();
});
