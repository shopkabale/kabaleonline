/**
 * main.js - Final Version
 * - Fetches Deals and Testimonials directly from Firestore.
 * - Fetches All Items, Searches, and Filters from the Algolia serverless function.
 * - Pagination loads 12 items per page.
 */

// --- HELPER FUNCTION ---
function getCloudinaryTransformedUrl(url) {
    if (!url || !url.includes('res.cloudinary.com')) {
        return url || 'https://placehold.co/400x400/e0e0e0/777?text=No+Image';
    }
    const transformString = 'c_fill,g_auto,w_200,h_200,dpr_auto,f_auto,q_auto:low';
    const urlParts = url.split('/upload/');
    if (urlParts.length !== 2) return url;
    return `${urlParts[0]}/upload/${transformString}/${urlParts[1]}`;
}

// --- FIREBASE IMPORTS ---
import { db } from "./firebase.js";
import { collection, query, where, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- DOM ELEMENT REFERENCES ---
const productGrid = document.getElementById("product-grid");
const listingsTitle = document.getElementById("listings-title");
const searchInput = document.getElementById("search-input");
const searchBtn = document.getElementById("search-btn");
const dealsSection = document.getElementById("deals-section");
const dealsGrid = document.getElementById("deals-grid");
const testimonialGrid = document.getElementById("testimonial-grid");
const loadMoreBtn = document.getElementById("load-more-btn");

// --- STATE MANAGEMENT ---
const PRODUCTS_PER_PAGE = 12; // Set to 12 as requested
let fetching = false;
let currentPage = 0;
let currentQuery = {
    searchTerm: '',
    category: '',
    type: ''
};

// --- RENDER FUNCTION ---
function renderProducts(productsToDisplay, isNewRender = false) {
    if (isNewRender) {
        productGrid.innerHTML = '';
    }
    if (productsToDisplay.length === 0 && isNewRender) {
        productGrid.innerHTML = '<p class="info-message">No listings found.</p>';
        return;
    }
    const fragment = document.createDocumentFragment();
    productsToDisplay.forEach(product => {
        const thumbnailUrl = getCloudinaryTransformedUrl(product.imageUrls?.[0]);
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

// --- DATA FETCHING ---

/**
 * Fetches special deals from Firestore.
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
        dealsGrid.innerHTML = '';
        deals.forEach(deal => {
            const thumbnailUrl = getCloudinaryTransformedUrl(deal.imageUrls?.[0]);
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
            dealsGrid.appendChild(dealLink);
        });
        dealsSection.style.display = 'block';
    } catch (error) {
        console.error("Error fetching deals:", error);
        dealsSection.style.display = 'none';
    }
}

/**
 * Fetches approved testimonials to display in the "Community Voices" section.
 */
async function fetchTestimonials() {
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


/**
 * Fetches products from your Algolia search function.
 */
async function fetchProducts(isNewQuery = false) {
    if (fetching) return;
    fetching = true;
    if (loadMoreBtn) loadMoreBtn.style.display = 'none';

    if (isNewQuery) {
        currentPage = 0;
        productGrid.innerHTML = '<p class="info-message">Loading listings...</p>';
    }

    try {
        let url = `/.netlify/functions/search?page=${currentPage}`;
        if (currentQuery.searchTerm) url += `&searchTerm=${encodeURIComponent(currentQuery.searchTerm)}`;
        if (currentQuery.category) url += `&category=${encodeURIComponent(currentQuery.category)}`;
        if (currentQuery.type) url += `&type=${encodeURIComponent(currentQuery.type)}`;

        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch from search function.');

        const result = await response.json();
        const products = result.products || [];

        renderProducts(products, isNewQuery);

        // Show the button if we got a full page of results.
        if (products.length === PRODUCTS_PER_PAGE) {
            if (loadMoreBtn) loadMoreBtn.style.display = 'block';
        }

    } catch (error) {
        console.error("Error fetching products:", error);
        productGrid.innerHTML = '<p class="error-message">Sorry, could not load listings.</p>';
    } finally {
        fetching = false;
    }
}

// --- INITIALIZATION & EVENT LISTENERS ---
function handleNewQuery() {
    const urlParams = new URLSearchParams(window.location.search);
    currentQuery = {
        searchTerm: searchInput.value.trim(),
        category: urlParams.get('category') || '',
        type: urlParams.get('type') || ''
    };

    if (currentQuery.searchTerm) {
        listingsTitle.textContent = `Results for "${currentQuery.searchTerm}"`;
    } else if (currentQuery.category) {
        listingsTitle.textContent = currentQuery.category;
    } else if (currentQuery.type) {
        listingsTitle.textContent = 'Services';
    } else {
        listingsTitle.textContent = 'All Items';
    }

    fetchProducts(true);
}

document.addEventListener('DOMContentLoaded', () => {
    fetchDeals();
    fetchTestimonials(); // Fetch testimonials on page load

    searchBtn.addEventListener('click', handleNewQuery);
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') e.preventDefault(), handleNewQuery();
    });

    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            currentPage++;
            fetchProducts(false);
        });
    }

    handleNewQuery();
});
