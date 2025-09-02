import { auth, db } from './firebase.js';
// NEW: We need to import the firebase functions to use them
import { collection, query, where, getDocs, orderBy, limit } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// ================== FEATURED LISTINGS LOGIC (BROWSER-BASED) START ==================
async function fetchAndDisplayDeals() {
    const dealsSection = document.getElementById('quick-deals-section');
    const dealsGrid = document.getElementById('quick-deals-grid');

    try {
        const productsRef = collection(db, 'products');
        // This is the direct query to Firebase. It looks for the 'isDeal' field.
        const q = query(
            productsRef, 
            where('isDeal', '==', true), 
            orderBy('createdAt', 'desc'),
            limit(8)
        );
        const querySnapshot = await getDocs(q);
        
        const deals = [];
        querySnapshot.forEach(doc => {
            deals.push({ id: doc.id, ...doc.data() });
        });

        if (deals.length > 0) {
            dealsGrid.innerHTML = '';
            deals.forEach(product => {
                const primaryImage = (product.imageUrls && product.imageUrls.length > 0) ? product.imageUrls[0] : 'placeholder.webp';
                const productLink = document.createElement('a');
                productLink.href = `product.html?id=${product.id}`;
                productLink.className = 'product-card-link';
                // We add the "DEAL" badge back here for clarity
                productLink.innerHTML = `
                    <div class="product-card">
                        <div class="deal-badge">DEAL</div>
                        <img src="${primaryImage}" alt="${product.name}">
                        <h3>${product.name}</h3>
                        <p class="price">UGX ${product.price.toLocaleString()}</p>
                    </div>
                `;
                dealsGrid.appendChild(productLink);
            });
            dealsSection.style.display = 'block';
        } else {
            dealsSection.style.display = 'none';
        }
    } catch (error) {
        console.error("Could not fetch featured listings:", error);
        dealsSection.style.display = 'none';
    }
}
// ================== FEATURED LISTINGS LOGIC (BROWSER-BASED) END ==================


// This is your full, original code for search and all listings. It remains unchanged.
const productGrid = document.getElementById('product-grid');
const searchInput = document.getElementById('search-input');
const loadMoreBtn = document.getElementById('load-more-btn');
const searchBtn = document.getElementById('search-btn');
const categoryFilter = document.getElementById('category-filter');
const minPriceInput = document.getElementById('min-price');
const maxPriceInput = document.getElementById('max-price');
const applyFiltersBtn = document.getElementById('apply-filters-btn');
const PRODUCTS_PER_PAGE = 30;
let lastVisibleProductId = null;
let fetching = false;
let currentQuery = { searchTerm: "", category: "", minPrice: "", maxPrice: "" };

async function fetchProducts(isNewSearch = false) {
    // This function remains exactly as it was, as it uses your original search function which we know works.
    if (fetching) return;
    fetching = true;
    loadMoreBtn.textContent = 'Loading...';
    if (isNewSearch) {
        productGrid.innerHTML = ''; // Clear grid for new search
        lastVisibleProductId = null;
    }
    let url = `/.netlify/functions/search?searchTerm=${encodeURIComponent(currentQuery.searchTerm)}`;
    url += `&category=${encodeURIComponent(currentQuery.category)}`;
    url += `&minPrice=${encodeURIComponent(currentQuery.minPrice)}`;
    url += `&maxPrice=${encodeURIComponent(currentQuery.maxPrice)}`;
    if (lastVisibleProductId) {
        url += `&lastVisible=${lastVisibleProductId}`;
    }
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok.');
        const products = await response.json();
        if (products.length === 0 && isNewSearch) {
            productGrid.innerHTML = '<p>No listings match your criteria.</p>';
        }
        if (products.length > 0) {
            lastVisibleProductId = products[products.length - 1].id;
        }
        renderProducts(products);
        if (products.length < PRODUCTS_PER_PAGE) {
            loadMoreBtn.style.display = 'none';
        } else {
            loadMoreBtn.style.display = 'inline-block';
        }
    } catch (error) {
        console.error("Error fetching products:", error);
        productGrid.innerHTML = '<p>Sorry, could not load listings.</p>';
    } finally {
        fetching = false;
        loadMoreBtn.textContent = 'Load More';
    }
}
function renderProducts(productsToDisplay) {
    productsToDisplay.forEach(product => {
        let primaryImage = (product.imageUrls && product.imageUrls.length > 0) ? product.imageUrls[0] : '';
        const productLink = document.createElement('a');
        productLink.href = `product.html?id=${product.id}`;
        productLink.className = 'product-card-link';
        productLink.innerHTML = `<div class="product-card"><img src="${primaryImage}" alt="${product.name}"><h3>${product.name}</h3><p class="price">UGX ${product.price.toLocaleString()}</p></div>`;
        productGrid.appendChild(productLink);
    });
}
function handleNewSearch() {
    currentQuery.searchTerm = searchInput.value;
    currentQuery.category = categoryFilter.value;
    currentQuery.minPrice = minPriceInput.value;
    currentQuery.maxPrice = maxPriceInput.value;
    fetchProducts(true);
}
applyFiltersBtn.addEventListener('click', handleNewSearch);
searchBtn.addEventListener('click', handleNewSearch);
searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleNewSearch(); });
loadMoreBtn.addEventListener('click', () => fetchProducts(false));
fetchAndDisplayDeals();
fetchProducts(true);
