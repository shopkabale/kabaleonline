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

// --- FIREBASE IMPORTS ---
import { db } from "./firebase.js";
import { collection, query, where, orderBy, limit, getDocs, startAfter } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- DOM ELEMENT REFERENCES ---
const productGrid = document.getElementById("product-grid");
const listingsTitle = document.getElementById("listings-title");
const loadMoreBtn = document.getElementById("load-more-btn");
const dealsSection = document.getElementById("deals-section");
const dealsGrid = document.getElementById("deals-grid");

// --- STATE ---
let fetching = false;
let lastVisible = null;
let activeFilters = { category: null, type: null };

// --- RENDER FUNCTION ---
function renderProducts(productsToDisplay, targetGrid, isNewRender = false) {
    if (isNewRender) {
        targetGrid.innerHTML = "";
    }
    if (productsToDisplay.length === 0 && isNewRender) {
        targetGrid.innerHTML = "<p>No listings found.</p>";
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
    targetGrid.appendChild(fragment);
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
        const deals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderProducts(deals, dealsGrid, true);
        dealsSection.style.display = 'block';
    } catch (error) {
        console.error("Error fetching deals:", error);
        dealsSection.style.display = 'none';
    }
}

// --- SEARCH PRODUCTS VIA ALGOLIA ---
async function searchProducts(searchQuery) {
    if (fetching) return;
    fetching = true;
    productGrid.innerHTML = "<p>Searching...</p>";
    listingsTitle.textContent = `Results for "${searchQuery}"`;
    loadMoreBtn.style.display = "none"; // No pagination for search results

    try {
        // Using the correct endpoint that matches your 'search.js' function
        const response = await fetch(`/.netlify/functions/search?q=${encodeURIComponent(searchQuery)}`);
        
        if (!response.ok) {
            throw new Error(`Search failed with status: ${response.status}`);
        }
        
        // Your search function returns an object { products: [], totalPages: X }
        const { products } = await response.json(); 
        renderProducts(products, productGrid, true); 
    } catch (error) {
        console.error("Error searching products:", error);
        productGrid.innerHTML = `<p>Sorry, the search could not be completed. Please try again later.</p>`;
    } finally {
        fetching = false;
    }
}

// --- FETCH PRODUCTS FROM FIRESTORE (FOR BROWSING) ---
async function fetchBrowseProducts(isLoadMore = false) {
    if (fetching) return;
    fetching = true;

    try {
        const urlParams = new URLSearchParams(window.location.search);
        const category = urlParams.get("category");
        const type = urlParams.get("type");

        const filtersChanged = (category !== activeFilters.category) || (type !== activeFilters.type);

        if (filtersChanged) {
            isLoadMore = false;
            productGrid.innerHTML = "";
            lastVisible = null;
            activeFilters = { category, type };
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
        renderProducts(products, productGrid, !isLoadMore);

        if (!snapshot.empty) {
            lastVisible = snapshot.docs[snapshot.docs.length - 1];
        }

        loadMoreBtn.style.display = snapshot.docs.length < 12 ? "none" : "block";

    } catch (error) {
        console.error("Error fetching products:", error);
        productGrid.innerHTML = `<p>Sorry, could not load listings. Please try again later.</p>`;
    } finally {
        fetching = false;
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

    const urlParams = new URLSearchParams(window.location.search);
    const searchQuery = urlParams.get("q");

    if (searchQuery) {
        // If there's a search query, use the Algolia search function
        searchProducts(searchQuery);
    } else {
        // Otherwise, fetch products from Firestore for browsing
        fetchBrowseProducts();
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener("click", () => fetchBrowseProducts(true));
        }
    }
});
