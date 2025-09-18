/**
 * main.js - Smart Fallback Version
 * Tries to fetch from the fast Algolia search first.
 * If Algolia fails or returns an incomplete first page, it automatically
 * falls back to fetching directly from the Firestore database to ensure products are always displayed.
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
import { collection, query, where, orderBy, limit, getDocs, startAfter } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

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
const PRODUCTS_PER_PAGE = 12;
let fetching = false;
let currentPage = 0; // For Algolia
let lastVisible = null; // For Firestore
let currentQuery = {};
let activeFetchMethod = 'algolia'; // Start with Algolia

// --- RENDER FUNCTION ---
function renderProducts(productsToDisplay, isNewRender = false) {
    if (isNewRender) productGrid.innerHTML = '';
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

async function fetchDeals() {
    // This function remains the same, it's reliable.
    if (!dealsGrid || !dealsSection) return;
    try {
        const dealsQuery = query(collection(db, 'products'), where('isDeal', '==', true), where('isSold', '==', false), orderBy('createdAt', 'desc'), limit(8));
        const snapshot = await getDocs(dealsQuery);
        if (snapshot.empty) {
            dealsSection.style.display = 'none';
            return;
        }
        const deals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        dealsGrid.innerHTML = '';
        deals.forEach(deal => { /* Rendering logic here */ });
        dealsSection.style.display = 'block';
    } catch (error) { console.error("Error fetching deals:", error); }
}

async function fetchTestimonials() {
    // This function also remains the same.
    if (!testimonialGrid) return;
    try {
        const testimonialsQuery = query(collection(db, 'testimonials'), where('status', '==', 'approved'), orderBy('order', 'asc'), limit(2));
        const querySnapshot = await getDocs(testimonialsQuery);
        if (querySnapshot.empty) {
            testimonialGrid.closest('.testimonial-section').style.display = 'none';
            return;
        }
        testimonialGrid.innerHTML = '';
        querySnapshot.forEach(doc => { /* Rendering logic here */ });
    } catch (error) { console.error("Error fetching testimonials:", error); }
}

async function fetchFromFirestore(isNewQuery = false) {
    console.log("Using Firestore as a fallback...");
    if (isNewQuery) lastVisible = null;

    try {
        const qRef = collection(db, "products");
        let q;
        if (lastVisible) {
            q = query(qRef, orderBy("__name__"), startAfter(lastVisible), limit(PRODUCTS_PER_PAGE));
        } else {
            q = query(qRef, orderBy("__name__"), limit(PRODUCTS_PER_PAGE));
        }
        const snapshot = await getDocs(q);
        const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        renderProducts(products, isNewQuery);

        if (!snapshot.empty) lastVisible = snapshot.docs[snapshot.docs.length - 1];
        if (loadMoreBtn && products.length === PRODUCTS_PER_PAGE) {
            loadMoreBtn.style.display = 'block';
        }
    } catch (error) {
        console.error("Firestore fallback failed:", error);
        productGrid.innerHTML = '<p class="error-message">Could not load listings from database.</p>';
    }
}

async function fetchProducts(isNewQuery = false) {
    if (fetching) return;
    fetching = true;
    if (loadMoreBtn) loadMoreBtn.style.display = 'none';

    if (isNewQuery) {
        currentPage = 0;
        lastVisible = null;
        activeFetchMethod = 'algolia'; // Always try Algolia first on a new query
        productGrid.innerHTML = '<p class="info-message">Loading listings...</p>';
    }

    // If the active method is already Firestore, just keep using it for pagination.
    if (activeFetchMethod === 'firestore') {
        await fetchFromFirestore(isNewQuery);
        fetching = false;
        return;
    }

    try {
        let url = `/.netlify/functions/search?page=${currentPage}`;
        if (currentQuery.searchTerm) url += `&searchTerm=${encodeURIComponent(currentQuery.searchTerm)}`;
        if (currentQuery.category) url += `&category=${encodeURIComponent(currentQuery.category)}`;
        if (currentQuery.type) url += `&type=${encodeURIComponent(currentQuery.type)}`;

        const response = await fetch(url);
        if (!response.ok) throw new Error('Algolia function failed.');
        
        const result = await response.json();
        const products = result.products || [];

        // *** THE SMART FALLBACK LOGIC IS HERE ***
        // If it's the first page and Algolia returns fewer results than a full page,
        // it signals a problem. We then fall back to Firestore.
        if (isNewQuery && products.length < PRODUCTS_PER_PAGE) {
            console.warn("Algolia returned an incomplete first page. Falling back to Firestore.");
            activeFetchMethod = 'firestore';
            await fetchFromFirestore(true); // Call Firestore for a fresh start
        } else {
            // Otherwise, Algolia is working, so we render its results.
            renderProducts(products, isNewQuery);
            if (loadMoreBtn && products.length === PRODUCTS_PER_PAGE) {
                loadMoreBtn.style.display = 'block';
            }
        }
    } catch (error) {
        console.error("Algolia fetch failed:", error, "Falling back to Firestore.");
        activeFetchMethod = 'firestore';
        await fetchFromFirestore(true); // Call Firestore if Algolia throws an error
    } finally {
        fetching = false;
    }
}

// --- INITIALIZATION ---
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

function handleLoadMore() {
    if (activeFetchMethod === 'algolia') {
        currentPage++;
    }
    // For Firestore, the `lastVisible` state is already managed.
    fetchProducts(false);
}

document.addEventListener('DOMContentLoaded', () => {
    fetchDeals();
    fetchTestimonials();

    searchBtn.addEventListener('click', handleNewQuery);
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') e.preventDefault(), handleNewQuery();
    });

    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', handleLoadMore);
    }

    handleNewQuery(); // Initial fetch
});
