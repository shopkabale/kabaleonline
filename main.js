// Filename: main.js

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
        thumbnail: 'c_fill,g_auto,w_400,h_400,f_auto,q_auto',
        full: 'c_limit,w_800,h_800,f_auto,q_auto'
    };
    const transformString = transformations[type] || transformations.thumbnail;
    const urlParts = url.split('/upload/');
    if (urlParts.length !== 2) {
        return url;
    }
    return `${urlParts[0]}/upload/${transformString}/${urlParts[1]}`;
}

// --- FIREBASE IMPORTS ---
import { db } from "./firebase.js";
import { collection, query, where, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- DOM ELEMENT REFERENCES ---
const productGrid = document.getElementById("product-grid");
const listingsTitle = document.getElementById("listings-title");
const dealsSection = document.getElementById("deals-section");
const dealsGrid = document.getElementById("deals-grid");
const searchInput = document.getElementById("search-input");
const searchBtn = document.getElementById("search-btn");
const mobileNav = document.querySelector(".mobile-nav");
const categoryGrid = document.querySelector(".category-grid");
const loadMoreBtn = document.getElementById("load-more-btn");

// --- APPLICATION STATE ---
const state = {
    currentPage: 0,
    totalPages: 1,
    isFetching: false,
    searchTerm: '',
    filters: {
        type: '',
        category: ''
    }
};

// --- UI & RENDER FUNCTIONS ---

/**
 * Renders skeleton placeholders in the product grid.
 * @param {number} count The number of skeletons to render. Defaults to 6.
 */
function renderSkeletons(count = 6) {
    let skeletons = '';
    for (let i = 0; i < count; i++) {
        skeletons += `
            <div class="product-card skeleton">
                <div class="skeleton-img"></div>
                <div class="skeleton-text"></div>
                <div class="skeleton-text short"></div>
            </div>
        `;
    }
    productGrid.innerHTML += skeletons;
}

/**
 * Renders the actual product cards in the grid.
 * @param {Array} productsToDisplay Array of product objects.
 */
function renderProducts(productsToDisplay) {
    const skeletons = productGrid.querySelectorAll('.skeleton');
    skeletons.forEach(s => s.remove());

    if (productsToDisplay.length === 0 && state.currentPage === 0) {
        productGrid.innerHTML = `<p class="loading-indicator">No listings found matching your criteria.</p>`;
        return;
    }
    
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
 * Updates the visibility of the "Load More" button based on the current page state.
 */
function updateLoadMoreButton() {
    if (state.currentPage < state.totalPages - 1) {
        loadMoreBtn.style.display = 'block';
    } else {
        loadMoreBtn.style.display = 'none';
    }
}

/**
 * Updates the main listing title based on current filters or search terms.
 */
function updateListingsTitle() {
    let title = "Recent Items";
    if (state.filters.category) {
        title = state.filters.category;
    } else if (state.filters.type) {
        title = `${state.filters.type.charAt(0).toUpperCase() + state.filters.type.slice(1)}s`;
    }
    if (state.searchTerm) {
        title = `Results for "${state.searchTerm}"`;
    }
    listingsTitle.textContent = title;
}


// --- DATA FETCHING ---

/**
 * Fetches products from the backend (Algolia via Netlify function) and renders them.
 * @param {boolean} isLoadMore Indicates if the fetch is from a "Load More" click.
 */
async function fetchAndRenderProducts(isLoadMore = false) {
    if (state.isFetching) return;
    state.isFetching = true;

    if (!isLoadMore) {
        productGrid.innerHTML = "";
    }
    
    renderSkeletons(isLoadMore ? 3 : 6); 
    loadMoreBtn.style.display = 'none';

    updateListingsTitle();

    try {
        const params = new URLSearchParams({ page: state.currentPage });
        if (state.searchTerm) params.append('searchTerm', state.searchTerm);
        if (state.filters.type) params.append('type', state.filters.type);
        if (state.filters.category) params.append('category', state.filters.category);

        const response = await fetch(`/.netlify/functions/search?${params.toString()}`);
        if (!response.ok) throw new Error(`Server error: ${response.statusText}`);

        const { products, totalPages } = await response.json();
        state.totalPages = totalPages;
        renderProducts(products);

    } catch (error) {
        console.error("Error fetching from Algolia:", error);
        productGrid.innerHTML = `<p class="loading-indicator">Sorry, could not load listings. Please try again.</p>`;
    } finally {
        state.isFetching = false;
        updateLoadMoreButton();
        if (!isLoadMore) {
           window.scrollTo({ top: productGrid.offsetTop - 150, behavior: 'smooth' });
        }
    }
}

/**
 * Fetches special deal items from Firestore.
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

        dealsGrid.innerHTML = "";
        const fragment = document.createDocumentFragment();
        snapshot.docs.forEach(doc => {
            const product = { id: doc.id, ...doc.data() };
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
        dealsGrid.appendChild(fragment);
        dealsSection.style.display = 'block';

    } catch (error) {
        console.error("Error fetching deals:", error);
        dealsSection.style.display = 'none';
    }
}

/**
 * Fetches approved testimonials from Firestore.
 */
async function fetchTestimonials() {
    const testimonialGrid = document.getElementById('testimonial-grid');
    if (!testimonialGrid) return;
    try {
        const testimonialsQuery = query(
            collection(db, 'testimonials'), 
            where('status', '==', 'approved'),
            orderBy('order', 'asc'), 
            limit(2)
        );
        const querySnapshot = await getDocs(testimonialsQuery);
        if (querySnapshot.empty) {
            testimonialGrid.closest('.testimonial-section').style.display = 'none';
            return;
        }
        testimonialGrid.innerHTML = '';
        querySnapshot.forEach(doc => {
            const testimonial = doc.data();
            const card = document.createElement('div');
            card.className = 'testimonial-card';
            card.innerHTML = `
                <p class="testimonial-text">"${testimonial.quote}"</p>
                <p class="testimonial-author">&ndash; ${testimonial.authorName} <span>${testimonial.authorDetail || ''}</span></p>
            `;
            testimonialGrid.appendChild(card);
        });
    } catch (error) {
        console.error("Error fetching testimonials:", error);
    }
}


// --- EVENT HANDLERS & INITIALIZATION ---

/**
 * Handles the search action.
 */
function handleSearch() {
    const term = searchInput.value.trim();
    if (state.searchTerm === term) return;

    state.searchTerm = term;
    state.currentPage = 0;
    state.filters.type = '';
    state.filters.category = '';
    fetchAndRenderProducts(false);
}

/**
 * Handles clicks on filter links in the nav and category grid.
 * @param {Event} event The click event.
 */
function handleFilterLinkClick(event) {
    const link = event.target.closest('a[href*="?"]');
    if (!link) return;

    event.preventDefault();

    const url = new URL(link.href);
    const type = url.searchParams.get('type') || '';
    const category = url.searchParams.get('category') || '';

    state.filters.type = type;
    state.filters.category = category;
    state.currentPage = 0;
    state.searchTerm = '';
    searchInput.value = '';
    fetchAndRenderProducts(false);

    document.querySelector('.mobile-nav')?.classList.remove('active');
    document.querySelector('.mobile-nav-overlay')?.classList.remove('active');
}

/**
 * Initializes the application state from URL query parameters.
 */
function initializeStateFromURL() {
    const params = new URLSearchParams(window.location.search);
    state.filters.type = params.get('type') || '';
    state.filters.category = params.get('category') || '';
    state.searchTerm = params.get('q') || '';
}

/**
 * Main entry point: runs when the DOM is fully loaded.
 */
document.addEventListener('DOMContentLoaded', () => {
    // Initial data fetches for different sections
    fetchDeals();
    fetchTestimonials();
    
    // Set initial state from URL and fetch main product listings
    initializeStateFromURL();
    fetchAndRenderProducts(false);

    // Set up event listeners
    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSearch();
        }
    });

    mobileNav.addEventListener('click', handleFilterLinkClick);
    categoryGrid.addEventListener('click', handleFilterLinkClick);

    loadMoreBtn.addEventListener('click', () => {
        if (state.currentPage < state.totalPages - 1) {
            state.currentPage++;
            fetchAndRenderProducts(true);
        }
    });
});
