// The simplest working script.js
document.addEventListener('DOMContentLoaded', () => {

  const productGrid = document.getElementById('product-grid');
  const loadMoreButton = document.getElementById('load-more-button');
  // Remove search elements for now as they require filters
  document.querySelector('.search-bar')?.remove();

  let currentPage = 1;
  let isLoading = false;
  let allProductsLoaded = false;

  function renderProducts(products, append = false) {
    if (!append) {
      productGrid.innerHTML = '';
    }
    
    if (products.length === 0 && currentPage === 1) {
        productGrid.innerHTML = '<p>There are no products to display.</p>';
    }

    if (products.length < 16) {
        allProductsLoaded = true;
        loadMoreButton.style.display = 'none';
    } else {
        loadMoreButton.style.display = 'block';
    }

    products.forEach(product => {
      const card = document.createElement('article');
      card.className = 'product-card';
      const imageUrl = product.Image && product.Image[0] ? product.Image[0].url : '';
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

  async function fetchProducts(page = 1, append = false) {
    if (isLoading || allProductsLoaded) return;
    isLoading = true;
    loadMoreButton.textContent = 'Loading...';

    const params = new URLSearchParams({
      pageSize: 16,
      page: page
    });
    
    try {
      const response = await fetch(`/.netlify/functions/get-products?${params.toString()}`);
      if (!response.ok) throw new Error('Network response was not ok');
      
      const data = await response.json();
      renderProducts(data.results, append);
      currentPage = page;

    } catch (error) {
      console.error("Failed to fetch products:", error);
      productGrid.innerHTML = '<p>Sorry, we could not load the products. Please try again.</p>';
    } finally {
      isLoading = false;
      loadMoreButton.textContent = 'Load More';
    }
  }

  loadMoreButton.addEventListener('click', () => {
    fetchProducts(currentPage + 1, true);
  });

  // Initial load
  fetchProducts(1, false);
});
