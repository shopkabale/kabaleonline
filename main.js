/**
 * main.js - Final Stable Version
 * Fetches initial products directly from Firestore for reliability.
 * Uses Algolia-powered serverless function ONLY for user searches.
 * Implements a "Load More" button for stable pagination.
 */

// --- HELPER FUNCTIONS ---
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
const loadMoreBtn = document.getElementById("load-more-btn"); // Using the button for stability

// --- STATE MANAGEMENT ---
let fetching = false;
let lastVisible = null;
let activeFilters = { category: null, type: null };

// --- RENDERING ---
function renderProducts(productsToDisplay, isNewRender = false) {
    if (isNewRender) productGrid.innerHTML = '';
    if (productsToDisplay.length === 0 && isNewRender) {
        productGrid.innerHTML = '<p class="info-message">No listings match your criteria.</p>';
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

// --- DATA FETCHING ---

async function fetchDeals() {
    if (!dealsGrid || !dealsSection) return;
    try {
        const dealsQuery = query(collection(db, 'products'), where('isDeal', '==', true), where('isSold', '==', false), orderBy('createdAt', 'desc'), limit(8));
        const snapshot = await getDocs(dealsQuery);
        if (snapshot.empty) {
            dealsSection.style.display = 'none';
            return;
        }
        const deals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderProducts(deals, dealsGrid, true);
        dealsSection.style.display = 'block';
    } catch (error) {
        console.error("Error fetching deals:", error);
        dealsSection.style.display = 'none';
    }
}

async function fetchBrowseProducts(isLoadMore = false) {
    if (fetching) return;
    fetching = true;
    if (loadMoreBtn) loadMoreBtn.style.display = 'none';

    try {
        if (!isLoadMore) {
            productGrid.innerHTML = '';
            lastVisible = null;
            const urlParams = new URLSearchParams(window.location.search);
            activeFilters = {
                category: urlParams.get("category"),
                type: urlParams.get("type")
            };
        }

        let qRef = collection(db, "products");
        let queryConstraints = [where("isSold", "==", false), orderBy("createdAt", "desc")];

        if (activeFilters.category) {
            queryConstraints.push(where("category", "==", activeFilters.category));
            listingsTitle.textContent = activeFilters.category;
        } else if (activeFilters.type) {
            queryConstraints.push(where("listing_type", "==", activeFilters.type));
            listingsTitle.textContent = activeFilters.type.charAt(0).toUpperCase() + activeFilters.type.slice(1);
        } else {
            listingsTitle.textContent = "All Items";
        }

        if (isLoadMore && lastVisible) {
            queryConstraints.push(startAfter(lastVisible));
        }
        queryConstraints.push(limit(12));

        const q = query(qRef, ...queryConstraints);
        const snapshot = await getDocs(q);
        const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderProducts(products, !isLoadMore);

        if (!snapshot.empty) {
            lastVisible = snapshot.docs[snapshot.docs.length - 1];
        }

        if (loadMoreBtn && snapshot.docs.length === 12) {
            loadMoreBtn.style.display = 'block';
        }

    } catch (error) {
        console.error("Error fetching browse products:", error);
        productGrid.innerHTML = '<p class="error-message">Could not load listings. Please ensure your database is configured correctly.</p>';
    } finally {
        fetching = false;
    }
}

async function performSearch(searchTerm) {
    if (fetching) return;
    fetching = true;
    if (loadMoreBtn) loadMoreBtn.style.display = 'none';
    listingsTitle.textContent = `Results for "${searchTerm}"`;
    productGrid.innerHTML = '<p class="info-message">Searching...</p>';

    try {
        const url = `/.netlify/functions/search?searchTerm=${encodeURIComponent(searchTerm)}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Search request failed');
        const products = await response.json();
        renderProducts(products, true);
    } catch (error) {
        console.error("Error performing search:", error);
        productGrid.innerHTML = '<p class="error-message">Sorry, the search could not be completed.</p>';
    } finally {
        fetching = false;
    }
}

// --- INITIALIZATION ---
function handleSearch() {
    const searchTerm = searchInput.value.trim();
    if (searchTerm) {
        performSearch(searchTerm);
    } else {
        // If search is cleared, go back to browsing
        fetchBrowseProducts();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    fetchDeals();

    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSearch();
        }
    });

    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => fetchBrowseProducts(true));
    }
    
    // Initial page load
    fetchBrowseProducts();
});
