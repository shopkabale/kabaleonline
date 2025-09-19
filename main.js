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
        thumbnail: 'c_fill,g_auto,w_250,h_250,f_auto,q_auto',
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
const loadMoreBtn = document.getElementById("load-more-btn"); // The "Load More" button

// --- APPLICATION STATE ---
const state = {
    currentPage: 0,
    totalPages: 1,
    isFetching: false,
    searchTerm: '',
    filters: {
        type: '', // e.g., 'item' or 'service'
        category: '' // e.g., 'electronics'
    }
};

// --- RENDER FUNCTION ---
// Modified to append products instead of replacing them
function renderProducts(productsToDisplay, isNewSearch = false) {
    if (isNewSearch) {
        productGrid.innerHTML = ""; // Clear grid only for a new search/filter
    }

    if (productsToDisplay.length === 0 && isNewSearch) {
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

// --- FETCH FROM ALGOLIA ---
// The isNewSearch flag determines whether to clear the grid or add to it
async function fetchAndRenderProducts(isNewSearch = false) {
    if (state.isFetching) return;
    state.isFetching = true;

    if (isNewSearch) {
        productGrid.innerHTML = `<p class="loading-indicator">Searching for listings...</p>`;
        state.currentPage = 0; // Reset page for new search
    }
    
    loadMoreBtn.textContent = 'Loading...';
    loadMoreBtn.style.display = 'block';
    loadMoreBtn.disabled = true;

    try {
        const params = new URLSearchParams({ page: state.currentPage });
        if (state.searchTerm) params.append('searchTerm', state.searchTerm);
        if (state.filters.type) params.append('type', state.filters.type);
        if (state.filters.category) params.append('category', state.filters.category);
        
        const response = await fetch(`/.netlify/functions/search?${params.toString()}`);
        if (!response.ok) throw new Error(`Server error: ${response.statusText}`);

        const { products, totalPages } = await response.json();
        state.totalPages = totalPages;
        
        renderProducts(products, isNewSearch);

    } catch (error) {
        console.error("Error fetching from Algolia:", error);
        productGrid.innerHTML = `<p class="loading-indicator">Sorry, could not load listings. Please try again later.</p>`;
    } finally {
        state.isFetching = false;
        updateLoadMoreButton();
    }
}

// --- UI UPDATE FUNCTIONS ---
function updateLoadMoreButton() {
    // Show the button if there are more pages to load
    if (state.currentPage < state.totalPages - 1) {
        loadMoreBtn.textContent = 'Load More';
        loadMoreBtn.style.display = 'block';
        loadMoreBtn.disabled = false;
    } else {
        loadMoreBtn.style.display = 'none'; // Hide if on the last page
    }
}

function updateListingsTitle() {
    let title = "All Listings";
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

// --- EVENT HANDLERS ---
function handleSearch() {
    const term = searchInput.value.trim();
    state.searchTerm = term;
    state.filters.type = '';
    state.filters.category = '';
    updateListingsTitle();
    fetchAndRenderProducts(true); // `true` for new search
}

function handleFilterLinkClick(event) {
    const link = event.target.closest('a[href*="?"]');
    if (!link) return;

    event.preventDefault();

    const url = new URL(link.href);
    state.filters.type = url.searchParams.get('type') || '';
    state.filters.category = url.searchParams.get('category') || '';
    state.searchTerm = '';
    searchInput.value = '';
    updateListingsTitle();
    fetchAndRenderProducts(true); // `true` for new filter

    document.querySelector('.mobile-nav')?.classList.remove('active');
    document.querySelector('.mobile-nav-overlay')?.classList.remove('active');
}

function handleLoadMore() {
    if (state.currentPage < state.totalPages - 1) {
        state.currentPage++; // Go to the next page
        fetchAndRenderProducts(false); // `false` to append results
    }
}

function initializeStateFromURL() {
    const params = new URLSearchParams(window.location.search);
    state.filters.type = params.get('type') || '';
    state.filters.category = params.get('category') || '';
    state.searchTerm = params.get('q') || '';
}

// --- FETCH DEALS ---
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


// --- FETCH TESTIMONIALS ---
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

// --- INITIALIZE PAGE ---
document.addEventListener('DOMContentLoaded', () => {
    fetchDeals();
    fetchTestimonials();
    
    initializeStateFromURL();
    updateListingsTitle();
    fetchAndRenderProducts(true);

    // --- EVENT LISTENERS ---
    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });

    mobileNav.addEventListener('click', handleFilterLinkClick);
    categoryGrid.addEventListener('click', handleFilterLinkClick);
    
    loadMoreBtn.addEventListener('click', handleLoadMore);

    // --- SERVICE WORKER REGISTRATION ---
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then(registration => {
            console.log('ServiceWorker registration successful with scope: ', registration.scope);
          })
          .catch(err => {
            console.log('ServiceWorker registration failed: ', err);
          });
      });
    }
});
