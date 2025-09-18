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
let activeFilters = null;

// --- RENDER FUNCTION ---
function renderProducts(productsToDisplay, targetGrid, isNewRender = false) {
    if (isNewRender) {
        targetGrid.innerHTML = "";
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

// --- FETCH MAIN PRODUCT GRID WITH PAGINATION ---
async function fetchMainProducts(isLoadMore = false) {
    if (fetching) return;
    fetching = true;

    if (!isLoadMore) {
        productGrid.innerHTML = "";
        listingsTitle.textContent = "All Items";
        lastVisible = null;
    }

    try {
        const urlParams = new URLSearchParams(window.location.search);
        const category = urlParams.get("category");
        const type = urlParams.get("type");
        const search = urlParams.get("q");

        let qRef = collection(db, "products");
        let filters = [];

        if (category) {
            filters.push(where("category", "==", category));
            listingsTitle.textContent = category;
        }

        if (type) {
            filters.push(where("type", "==", type));
            listingsTitle.textContent = type.charAt(0).toUpperCase() + type.slice(1);
        }

        // Base query
        let q;
        if (filters.length > 0) {
            q = query(qRef, ...filters, where("isSold", "==", false), orderBy("createdAt", "desc"), limit(12));
        } else {
            q = query(qRef, where("isSold", "==", false), orderBy("createdAt", "desc"), limit(12));
        }

        if (isLoadMore && lastVisible) {
            q = query(q, startAfter(lastVisible));
        }

        const snapshot = await getDocs(q);
        if (snapshot.empty && !isLoadMore) {
            productGrid.innerHTML = "<p>No listings found.</p>";
            loadMoreBtn.style.display = "none";
            return;
        }

        let products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (search) {
            listingsTitle.textContent = `Results for "${search}"`;
            products = products.filter(p =>
                p.name?.toLowerCase().includes(search.toLowerCase()) ||
                p.description?.toLowerCase().includes(search.toLowerCase())
            );
        }

        if (!isLoadMore) {
            renderProducts(products, productGrid, true);
        } else {
            renderProducts(products, productGrid, false);
        }

        // Save last doc for pagination
        lastVisible = snapshot.docs[snapshot.docs.length - 1];

        // Show or hide Load More
        loadMoreBtn.style.display = snapshot.docs.length < 12 ? "none" : "block";

    } catch (error) {
        console.error("Error fetching products:", error);
        if (!isLoadMore) {
            productGrid.innerHTML = `<p>Sorry, could not load listings. Please try again later.</p>`;
        }
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
    fetchMainProducts(); // First page
    fetchTestimonials();

    if (loadMoreBtn) {
        loadMoreBtn.addEventListener("click", () => fetchMainProducts(true));
    }
});