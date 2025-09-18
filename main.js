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

// Pagination Elements
const paginationContainer = document.getElementById("pagination-container");
const prevPageBtn = document.getElementById("prev-page-btn");
const nextPageBtn = document.getElementById("next-page-btn");
const pageIndicator = document.getElementById("page-indicator");

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
function renderProducts(productsToDisplay) {
    productGrid.innerHTML = ""; // Clear previous results
    if (productsToDisplay.length === 0) {
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

// --- NEW: FETCH FROM ALGOLIA ---
async function fetchAndRenderProducts() {
    if (state.isFetching) return;
    state.isFetching = true;
    productGrid.innerHTML = `<p class="loading-indicator">Searching for listings...</p>`;
    updatePaginationUI();
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
        productGrid.innerHTML = `<p class="loading-indicator">Sorry, could not load listings. Please try again later.</p>`;
    } finally {
        state.isFetching = false;
        updatePaginationUI();
        // Scroll to the top of the listings grid after fetching
        window.scrollTo({ top: productGrid.offsetTop - 150, behavior: 'smooth' });
    }
}

// --- UI UPDATE FUNCTIONS ---
function updatePaginationUI() {
    if (state.totalPages > 1) {
        paginationContainer.style.display = 'flex';
        pageIndicator.textContent = `Page ${state.currentPage + 1} of ${state.totalPages}`;
        prevPageBtn.disabled = state.isFetching || state.currentPage === 0;
        nextPageBtn.disabled = state.isFetching || state.currentPage >= state.totalPages - 1;
    } else {
        paginationContainer.style.display = 'none';
    }
}

function updateListingsTitle() {
    let title = "All Listings";
    if (state.filters.category) {
        title = state.filters.category;
    } else if (state.filters.type) {
        // Capitalize first letter
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
    if (state.searchTerm === term) return; // No change, do nothing
    
    state.searchTerm = term;
    state.currentPage = 0;
    state.filters.type = ''; // Reset filters when a new search is performed
    state.filters.category = '';
    
    fetchAndRenderProducts();
}

function handleFilterLinkClick(event) {
    // Find the closest ancestor `<a>` tag that has a query string in its href
    const link = event.target.closest('a[href*="?"]');
    if (!link) return; // If the click was not on a relevant link, do nothing

    event.preventDefault(); // IMPORTANT: Stop the browser from navigating to the link's URL

    const url = new URL(link.href);
    const type = url.searchParams.get('type') || '';
    const category = url.searchParams.get('category') || '';
    
    // Reset state for the new filter
    state.filters.type = type;
    state.filters.category = category;
    state.currentPage = 0;
    state.searchTerm = ''; // Clear any search term when a filter link is clicked
    searchInput.value = '';

    fetchAndRenderProducts();

    // If the mobile nav is open, close it after a filter is clicked
    document.querySelector('.mobile-nav')?.classList.remove('active');
    document.querySelector('.mobile-nav-overlay')?.classList.remove('active');
}

function initializeStateFromURL() {
    const params = new URLSearchParams(window.location.search);
    state.filters.type = params.get('type') || '';
    state.filters.category = params.get('category') || '';
    state.searchTerm = params.get('q') || '';
    
    // Optional: Clean the URL so refreshing the page doesn't re-apply the filter
    // history.replaceState(null, '', window.location.pathname);
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

        // The original renderProducts function had a third argument `isNewRender`.
        // We'll create a temporary render function for deals to avoid complexity.
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
    // These functions can run independently as they populate separate sections
    fetchDeals();
    fetchTestimonials();
    
    // Check URL for pre-filled filters on page load (e.g., from an external link)
    initializeStateFromURL();
    
    // Initial fetch for the main grid based on URL parameters or default state
    fetchAndRenderProducts();

    // --- EVENT LISTENERS ---
    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // Prevent form submission if it's in a form
            handleSearch();
        }
    });

    // Listen for clicks on the parent containers to catch clicks on the filter links
    mobileNav.addEventListener('click', handleFilterLinkClick);
    categoryGrid.addEventListener('click', handleFilterLinkClick);

    // Pagination button listeners
    prevPageBtn.addEventListener('click', () => {
        if (state.currentPage > 0) {
            state.currentPage--;
            fetchAndRenderProducts();
        }
    });

    nextPageBtn.addEventListener('click', () => {
        if (state.currentPage < state.totalPages - 1) {
            state.currentPage++;
            fetchAndRenderProducts();
        }
    });
});
