// Paste this entire code into your script.js file

// This runs when the entire HTML page has been loaded
document.addEventListener('DOMContentLoaded', () => {

  // --- 1. SELECTING ELEMENTS ---
  // We get references to all the important parts of our page
  const productGrid = document.getElementById('product-grid');
  const searchInput = document.getElementById('search-input');
  const searchButton = document.getElementById('search-button');
  const filterPanel = document.getElementById('filter-panel');
  const filterToggleButton = document.getElementById('filter-toggle-button');
  const applyFiltersButton = document.getElementById('apply-filters-button');
  const filterCheckboxes = document.querySelectorAll('.filter-checkbox');

  // --- 2. STATE MANAGEMENT ---
  // A simple object to keep track of the current filters and page
  let state = {
    searchTerm: '',
    category: [],
    sale: false,
    verified: false,
    page: 1,
    isLoading: false
  };

  // --- 3. RENDERING PRODUCTS ---
  // This function takes product data and turns it into HTML
  function renderProducts(products) {
    // Clear the grid of any old products or messages
    productGrid.innerHTML = '';

    if (products.length === 0) {
      productGrid.innerHTML = '<p>Sorry, no products were found matching your criteria.</p>';
      return;
    }

    products.forEach(product => {
      // Create the product card HTML
      const card = document.createElement('article');
      card.className = 'product-card';

      // Safely get the image URL (handles cases with no image)
      const imageUrl = product.Image && product.Image[0] ? product.Image[0].url : '';
      
      // Format the price with commas
      const formattedPrice = new Intl.NumberFormat('en-US').format(product.Price);

      card.innerHTML = `
        ${imageUrl ? `<img src="${imageUrl}" alt="${product.Name}">` : '<div class="product-image-placeholder"></div>'}
        <div class="product-info">
          <h2 class="product-name">${product.Name}</h2>
          <p class="product-price">UGX ${formattedPrice}</p>
          <p class="product-seller">by ${product.SellerName}</p>
        </div>
      `;
      productGrid.appendChild(card);
    });
  }

  // --- 4. FETCHING PRODUCTS ---
  // The main function to talk to our backend
  async function fetchProducts() {
    if (state.isLoading) return; // Prevent multiple requests at the same time
    state.isLoading = true;
    
    // Show a loading message
    productGrid.innerHTML = '<p>Loading products...</p>';

    // Build the query string from our state object
    const params = new URLSearchParams({
      pageSize: 16,
      page: state.page
    });
    if (state.searchTerm) params.append('searchTerm', state.searchTerm);
    if (state.sale) params.append('sale', 'true');
    if (state.verified) params.append('verified', 'true');
    state.category.forEach(cat => params.append('category', cat));
    
    try {
      // Call our Netlify Function
      const response = await fetch(`/.netlify/functions/get-products?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      renderProducts(data.results); // Baserow data is in the 'results' property

    } catch (error) {
      console.error("Failed to fetch products:", error);
      productGrid.innerHTML = '<p>Sorry, we could not load the products. Please try again.</p>';
    } finally {
      state.isLoading = false; // Allow new requests
    }
  }

  // --- 5. EVENT LISTENERS ---
  // This is where we connect user actions to our functions

  // Toggle filter panel on mobile
  filterToggleButton.addEventListener('click', () => {
    filterPanel.classList.toggle('is-open');
  });

  // Handle applying filters
  function applyAllFilters() {
      // Update state from the form
      state.searchTerm = searchInput.value.trim();
      state.page = 1; // Reset to page 1 for any new filter
      
      // Get selected categories
      state.category = [];
      document.querySelectorAll('input[name="category"]:checked').forEach(checkbox => {
          state.category.push(checkbox.value);
      });

      // Get other special offers
      state.sale = document.querySelector('input[name="sale"]').checked;
      state.verified = document.querySelector('input[name="verified"]').checked;

      // Close panel on mobile after applying
      if (window.innerWidth < 768) {
          filterPanel.classList.remove('is-open');
      }

      fetchProducts();
  }

  applyFiltersButton.addEventListener('click', applyAllFilters);
  searchButton.addEventListener('click', applyAllFilters);
  searchInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
          applyAllFilters();
      }
  });


  // --- 6. INITIAL LOAD ---
  // Fetch products for the first time when the page loads
  fetchProducts();

});
