// Add this to the top of your script.js file

// This code block will run on every page that includes script.js
document.addEventListener('DOMContentLoaded', () => {
    const nav = document.getElementById('main-nav');
    const user = netlifyIdentity.currentUser();

    if (user) {
        // If the user is logged in, show Dashboard and Logout buttons
        nav.innerHTML = `
            <a href="/dashboard.html" class="nav-btn-login">My Dashboard</a>
            <button id="logout-button-main" class="nav-btn-sell">Log Out</button>
        `;
        const logoutButton = document.getElementById('logout-button-main');
        if (logoutButton) {
            logoutButton.addEventListener('click', () => {
                netlifyIdentity.logout();
            });
        }
        netlifyIdentity.on('logout', () => {
            window.location.href = '/';
        });
    } else {
        // If the user is logged out, show the default Login and Sell buttons
        nav.innerHTML = `
            <a href="/login.html" class="nav-btn-login">Login / Sign Up</a>
            <a href="/sell/index.html" class="nav-btn-sell">Sell an Item</a>
        `;
    }
});

// The rest of your existing script.js code follows below...

// FINAL version of script.js
document.addEventListener('DOMContentLoaded', () => {
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

    const state = {
        searchTerm: '',
        category: 'All',
        page: 1,
        isLoading: false,
    };

    function renderProductCard(product, container) {
        const card = document.createElement('article');
        card.className = 'product-card';
        const imageUrl = product.ImageURL || '';
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

    async function loadCarousel(type, container) {
        if (!container) return;
        // The 'type' parameter is a custom name we give it.
        // We'll create a special query for each carousel type.
        let params;
        if (type === 'sponsored') params = new URLSearchParams({ sponsored: 'true', pageSize: 10 });
        else if (type === 'verified') params = new URLSearchParams({ verified: 'true', pageSize: 10 });
        else if (type === 'sale') params = new URLSearchParams({ sale: 'true', pageSize: 10 });

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
        updatePagination(null);

        const params = new URLSearchParams({ page: state.page, pageSize: 12 });
        if (state.searchTerm) params.append('searchTerm', state.searchTerm);
        if (state.category && state.category !== 'All') params.append('category', state.category);

        try {
            const response = await fetch(`/.netlify/functions/get-products?${params.toString()}`);
            if (!response.ok) throw new Error('Main grid fetch failed');
            const data = await response.json();
            mainGrid.innerHTML = '';
            if (data.results.length > 0) {
                data.results.forEach(product => renderProductCard(product, mainGrid));
            } else {
                mainGrid.innerHTML = '<p>No products found matching your criteria.</p>';
            }
            updatePagination(data.page, data.has_next_page);
        } catch (error) {
            mainGrid.innerHTML = '<p>Sorry, we could not load the products. Please try again.</p>';
        } finally {
            state.isLoading = false;
        }
    }

    function updatePagination(currentPage, hasNext) {
        if (currentPage === null) {
            paginationControls.style.display = 'none';
            return;
        }
        paginationControls.style.display = 'flex';
        pageIndicator.textContent = `Page ${currentPage}`;
        prevBtn.disabled = currentPage <= 1;
        nextBtn.disabled = !hasNext;
    }

    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        state.searchTerm = searchInput.value.trim();
        state.page = 1;
        fetchMainGridProducts();
    });

    categoryScroller.addEventListener('click', (e) => {
        if (e.target.classList.contains('category-btn')) {
            categoryScroller.querySelector('.active').classList.remove('active');
            e.target.classList.add('active');
            state.category = e.target.dataset.category;
            state.page = 1;
            state.searchTerm = '';
            searchInput.value = '';
            fetchMainGridProducts();
        }
    });

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

    function initialLoad() {
        fetchMainGridProducts();
        loadCarousel('sponsored', sponsoredGrid);
        loadCarousel('verified', verifiedGrid);
        loadCarousel('sale', saleGrid);
    }

    initialLoad();
});
