// This is the new script.js for your homepage
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

    /**
     * Renders a single product card into a given container.
     * @param {object} product - The product data from Baserow.
     * @param {HTMLElement} container - The container to append the card to.
     */
    function renderProductCard(product, container) {
        const card = document.createElement('article');
        card.className = 'product-card';
        const imageUrl = product.Image && product.Image[0] ? product.Image[0].url : '';
        const formattedPrice = new Intl.NumberFormat('en-US').format(product.Price);

        card.innerHTML = `
            <a href="shop/product.html?id=${product.id}" style="text-decoration:none; color:inherit;">
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

    /**
     * Fetches products for the carousels (sponsored, sale, etc.)
     * @param {string} type - The filter type (e.g., 'sponsored', 'sale').
     * @param {HTMLElement} container - The carousel container element.
     */
    async function loadCarousel(type, container) {
        if (!container) return;
        const params = new URLSearchParams({ type: type, pageSize: 10 });
        try {
            const response = await fetch(`/.netlify/functions/get-products?${params.toString()}`);
            if (!response.ok) throw new Error('Carousel fetch failed');
            const data = await response.json();
            container.innerHTML = ''; // Clear "Loading..."
            data.results.forEach(product => renderProductCard(product, container));
        } catch (error) {
            container.innerHTML = '<p>Could not load items.</p>';
            console.error(`Failed to load ${type} carousel:`, error);
        }
    }
    
    /**
     * Fetches products for the main marketplace grid based on the current state.
     */
    async function fetchMainGridProducts() {
        if (state.isLoading) return;
        state.isLoading = true;
        mainGrid.innerHTML = '<p>Loading products...</p>';
        updatePagination(null); // Disable buttons while loading

        const params = new URLSearchParams({
            page: state.page,
            pageSize: 12,
        });

        if (state.searchTerm) {
            params.append('searchTerm', state.searchTerm);
        }
        if (state.category && state.category !== 'All') {
            params.append('category', state.category);
        }

        try {
            const response = await fetch(`/.netlify/functions/get-products?${params.toString()}`);
            if (!response.ok) throw new Error('Main grid fetch failed');
            const data = await response.json();
            
            mainGrid.innerHTML = ''; // Clear "Loading..."
            if (data.results.length > 0) {
                data.results.forEach(product => renderProductCard(product, mainGrid));
            } else {
                mainGrid.innerHTML = '<p>No products found matching your criteria.</p>';
            }
            updatePagination(data.page, data.has_next_page);
        } catch (error) {
            mainGrid.innerHTML = '<p>Sorry, we could not load the products. Please try again.</p>';
            console.error('Failed to load main grid:', error);
        } finally {
            state.isLoading = false;
        }
    }

    /**
     * Updates the pagination buttons and page indicator.
     * @param {number|null} currentPage - The current page number.
     * @param {boolean} hasNext - Whether there is a next page.
     */
    function updatePagination(currentPage, hasNext) {
        if (currentPage === null) { // Loading state
            prevBtn.disabled = true;
            nextBtn.disabled = true;
            paginationControls.style.display = 'none';
            return;
        }

        paginationControls.style.display = 'block';
        pageIndicator.textContent = `Page ${currentPage}`;
        prevBtn.disabled = currentPage <= 1;
        nextBtn.disabled = !hasNext;
    }

    // --- EVENT LISTENERS ---

    // Search form submission
    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        state.searchTerm = searchInput.value.trim();
        state.page = 1;
        fetchMainGridProducts();
    });

    // Category button clicks
    categoryScroller.addEventListener('click', (e) => {
        if (e.target.classList.contains('category-btn')) {
            // Update active button style
            categoryScroller.querySelector('.active').classList.remove('active');
            e.target.classList.add('active');
            
            // Update state and fetch products
            state.category = e.target.dataset.category;
            state.page = 1;
            state.searchTerm = ''; // Clear search when changing category
            searchInput.value = '';
            fetchMainGridProducts();
        }
    });

    // Pagination button clicks
    prevBtn.addEventListener('click', () => {
        if (state.page > 1) {
            state.page--;
            fetchMainGridProducts();
        }
    });

    nextBtn.addEventListener('click', () => {
        state.page++;
        fetchMainGridProducts();
    });

    // --- INITIAL PAGE LOAD ---
    function initialLoad() {
        loadCarousel('sponsored', sponsoredGrid);
        loadCarousel('verified', verifiedGrid);
        loadCarousel('sale', saleGrid);
        fetchMainGridProducts();
    }

    initialLoad();
});
