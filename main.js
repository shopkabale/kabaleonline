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
const loadMoreBtn = document.getElementById("load-more-btn");
const dealsSection = document.getElementById("deals-section");
const dealsGrid = document.getElementById("deals-grid");

// --- STATE ---
let fetching = false;

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

// --- FETCH MAIN PRODUCT GRID (RANDOM ORDER) ---
async function fetchMainProducts() {
    if (fetching) return;
    fetching = true;
    loadMoreBtn.style.display = "none"; // No load more for random products

    listingsTitle.textContent = "All Items";
    productGrid.innerHTML = ""; // Clear old items

    try {
        const snapshot = await getDocs(collection(db, "products"));
        let products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Shuffle randomly
        products = products.sort(() => Math.random() - 0.5);

        if (products.length === 0) {
            productGrid.innerHTML = "<p>No listings found.</p>";
        } else {
            renderProducts(products, productGrid, true);
        }

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
    fetchMainProducts(); // Randomized All Products
    fetchTestimonials();
});