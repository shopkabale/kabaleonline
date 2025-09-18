/**
 * main.js
 * * Handles fetching and displaying products using an Algolia-backend.
 * Features include infinite scroll, skeleton loaders, and dynamic content sections.
 */

// --- HELPER FUNCTIONS ---

/**
 * Creates an optimized and transformed Cloudinary URL.
 * @param {string} url The original Cloudinary URL.
 * @param {'thumbnail'|'full'} type The desired transformation type.
 * @returns {string} The new, transformed URL.
 */
function getCloudinaryTransformedUrl(url, type) {
    if (!url || !url.includes('res.cloudinary.com')) {
        return url || 'https://placehold.co/400x400/e0e0e0/777?text=No+Image';
    }
    const transformations = {
        thumbnail: 'c_fill,g_auto,w_200,h_200,dpr_auto,f_auto,q_auto:low',
        full: 'c_limit,w_800,h_800,dpr_auto,f_auto,q_auto'
    };
    const transformString = transformations[type] || transformations.thumbnail;
    const urlParts = url.split('/upload/');
    if (urlParts.length !== 2) {
        return url;
    }
    return `${urlParts[0]}/upload/${transformString}/${urlParts[1]}`;
}

// --- FIREBASE IMPORTS (for Deals & Testimonials) ---
import { db } from "./firebase.js";
import { collection, query, where, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- DOM ELEMENT REFERENCES ---
const productGrid = document.getElementById("product-grid");
const listingsTitle = document.getElementById("listings-title");
const searchInput = document.getElementById("search-input");
const searchBtn = document.getElementById("search-btn");
const dealsSection = document.getElementById("deals-section");
const dealsGrid = document.getElementById("deals-grid");
const loader = document.getElementById("loader");

// --- STATE MANAGEMENT ---
const PRODUCTS_PER_PAGE = 12; // Controls how many items to fetch per "page"
let fetching = false;
let lastVisibleProductId = null;
let noMoreProducts = false;
let currentQuery = { searchTerm: "", type: null };

// --- RENDERING FUNCTIONS ---

/**
 * Renders product cards into the grid.
 * @param {Array<Object>} productsToDisplay Array of product objects to render.
 */
function renderProducts(productsToDisplay) {
    const fragment = document.createDocumentFragment();
    productsToDisplay.forEach(product => {
        const thumbnailUrl = getCloudinaryTransformedUrl(product.imageUrls?.[0], 'thumbnail');
        const productLink = document.createElement("a");
        productLink.href = `/product.html?id=${product.id}`;
        productLink.className = "product-card-link";
        productLink.innerHTML = `
          <div class="product-card">
            <img src="${thumbnailUrl}" alt="${product.name}" loading="lazy">
            <h3>${product.name}</h3>
            <p class="price">UGX ${product.price ? product.price.toLocaleString() : "N/A"}</p>
          </div>
        `;
        fragment.appendChild(productLink);
    });
    productGrid.appendChild(fragment);
}

/**
 * Displays skeleton loader cards for a better loading experience.
 * @param {number} count The number of skeleton loaders to show.
 */
function renderSkeletonLoaders(count) {
    productGrid.innerHTML = ''; // Clear previous content
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
        const skeletonCard = document.createElement('div');
        skeletonCard.className = 'skeleton-card';
        skeletonCard.innerHTML = `
            <div class="skeleton-image"></div>
            <div class="skeleton-text">
                <div class="skeleton-line"></div>
                <div class="skeleton-line skeleton-line-short"></div>
            </div>
        `;
        fragment.appendChild(skeletonCard);
    }
    productGrid.appendChild(fragment);
}

// --- DATA FETCHING ---

/**
 * Fetches main product listings from the Algolia-powered serverless function.
 * @param {boolean} isNewQuery If true, resets pagination and clears the grid.
 */
async function fetchMainProducts(isNewQuery = false) {
    if (fetching || noMoreProducts) return;

    fetching = true;
    if (loader) loader.style.display = 'block';

    if (isNewQuery) {
        lastVisibleProductId = null;
        noMoreProducts = false;
        renderSkeletonLoaders(PRODUCTS_PER_PAGE);
    }

    // Construct the search URL
    let url = `/.netlify/functions/search?searchTerm=${encodeURIComponent(currentQuery.searchTerm)}`;
    url += `&type=${currentQuery.type || 'item'}`; // Default to 'item' if no type is specified
    if (lastVisibleProductId) {
        url += `&lastVisible=${lastVisibleProductId}`;
    }

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
        
        const products = await response.json();

        if (isNewQuery) {
            productGrid.innerHTML = ''; // Clear skeletons before rendering real content
        }

        if (products.length > 0) {
            renderProducts(products);
            lastVisibleProductId = products[products.length - 1].id;
        }

        if (products.length < PRODUCTS_PER_PAGE) {
            noMoreProducts = true;
            if (loader) loader.style.display = 'none';
        }

        if (productGrid.innerHTML === '') {
            productGrid.innerHTML = '<p class="info-message">No listings match your criteria.</p>';
        }

    } catch (error) {
        console.error("Error fetching products:", error);
        productGrid.innerHTML = '<p class="error-message">Sorry, could not load listings. Please try again later.</p>';
    } finally {
        fetching = false;
        if (loader && !noMoreProducts) loader.style.display = 'none';
    }
}

/**
 * Fetches special deals from Firestore to display in a dedicated section.
 */
async function fetchDeals() {
    if (!dealsGrid || !dealsSection) return;
    try {
        const dealsQuery = query(
            collection(db, 'products'),
            where('isDeal', '==', true),
            where('isSold', '==', false),
            orderBy('createdAt', 'desc'),
            limit(8)
        );
        const snapshot = await getDocs(dealsQuery);

        if (snapshot.empty) {
            dealsSection.style.display = 'none';
            return;
        }

        const deals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        dealsGrid.innerHTML = ''; // Clear any existing content
        const fragment = document.createDocumentFragment();
        deals.forEach(deal => {
            const thumbnailUrl = getCloudinaryTransformedUrl(deal.imageUrls?.[0], 'thumbnail');
            const dealLink = document.createElement("a");
            dealLink.href = `/product.html?id=${deal.id}`;
            dealLink.className = "product-card-link";
            dealLink.innerHTML = `
              <div class="product-card">
                <img src="${thumbnailUrl}" alt="${deal.name}" loading="lazy">
                <h3>${deal.name}</h3>
                <p class="price">UGX ${deal.price ? deal.price.toLocaleString() : "N/A"}</p>
              </div>
            `;
            fragment.appendChild(dealLink);
        });
        dealsGrid.appendChild(fragment);
        dealsSection.style.display = 'block';

    } catch (error) {
        console.error("Error fetching deals:", error);
        dealsSection.style.display = 'none';
    }
}

// --- EVENT HANDLERS & INITIALIZATION ---

/**
 * Resets the state and triggers a new search.
 */
function handleSearch() {
    const searchTerm = searchInput.value.trim();
    if (currentQuery.searchTerm === searchTerm) return; // Avoid re-searching the same term

    currentQuery.searchTerm = searchTerm;
    listingsTitle.textContent = searchTerm ? `Results for "${searchTerm}"` : 'All Items';
    fetchMainProducts(true);
}

/**
 * Sets up the Intersection Observer for infinite scrolling.
 */
function setupInfiniteScroll() {
    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
            fetchMainProducts();
        }
    }, { rootMargin: '200px' });

    if (loader) observer.observe(loader);
}

/**
 * Initializes the page on DOMContentLoaded.
 */
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    currentQuery.type = urlParams.get('type');
    const isHomePage = !currentQuery.type && !currentQuery.searchTerm;

    // Set page title
    if (currentQuery.type === 'service') {
        listingsTitle.textContent = 'Services';
    } else {
        listingsTitle.textContent = 'All Items';
    }

    // Only show featured sections on the main homepage
    if (isHomePage) {
        fetchDeals();
        // fetchTestimonials(); // You can add this back if you have the element
    } else {
       if(dealsSection) dealsSection.style.display = 'none';
    }

    // Setup search event listeners
    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSearch();
        }
    });

    // Initial fetch and setup scrolling
    fetchMainProducts(true);
    setupInfiniteScroll();
});
