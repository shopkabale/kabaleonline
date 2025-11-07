// Imports from your existing firebase.js
import { db } from '../firebase.js';
import { collection, query, where, getDocs, orderBy, doc, getDoc, limit } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- Cloudinary Helper ---
function getCloudinaryTransformedUrl(url, type = 'thumbnail') {
    if (!url || !url.includes('res.cloudinary.com')) {
        return url || 'https://placehold.co/400x400/e0e0e0/777?text=No+Image';
    }
    const transformations = {
        thumbnail: 'c_fill,g_auto,w_400,h_400,f_auto,q_auto',
    };
    const transformString = transformations[type];
    const urlParts = url.split('/upload/');
    if (urlParts.length !== 2) return url;
    return `${urlParts[0]}/upload/${transformString}/${urlParts[1]}`;
}

// --- DOM Elements ---
const storeHeader = document.getElementById('store-header');
const listingsTitle = document.getElementById('listings-title');
const sellerProductGrid = document.getElementById('seller-product-grid');
const avgRatingSummary = document.getElementById('average-rating-summary');
const reviewsList = document.getElementById('reviews-list');
const loadingHeader = document.getElementById('loading-header');
const loadingProducts = document.getElementById('loading-products');
const loadingReviews = document.getElementById('loading-reviews');

// --- Helper: Build subdomain URL ---
function getSubdomainUrl(username, path = '') {
    return `https://${username}.kabaleonline.com${path}`;
}

// --- Main Function ---
document.addEventListener('DOMContentLoaded', async () => {
    // Determine the store username from:
    // 1. query param ?username=
    // 2. subdomain (if present)
    const urlParams = new URLSearchParams(window.location.search);
    let username = urlParams.get('username');

    // Check subdomain if username not provided in query
    const host = window.location.hostname;
    if (!username && host !== 'www.kabaleonline.com' && host !== 'kabaleonline.com') {
        username = host.split('.')[0]; // subdomain as username
    }

    if (!username) {
        storeHeader.innerHTML = '<h1>Store not found.</h1><p>No store username provided.</p>';
        loadingHeader?.remove();
        loadingProducts?.remove();
        loadingReviews?.remove();
        return;
    }

    try {
        // Fetch seller document by username
        const q = query(collection(db, 'users'), where('store.username', '==', username), limit(1));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            storeHeader.innerHTML = `<h1>Store Not Found</h1><p>The store "${username}" does not exist.</p>`;
            loadingHeader?.remove();
            loadingProducts?.remove();
            loadingReviews?.remove();
            return;
        }

        const sellerDoc = snapshot.docs[0];
        const sellerData = sellerDoc.data();
        const sellerId = sellerDoc.id;

        // Render store header
        renderHeader(sellerData);

        loadingHeader?.remove();

        // Fetch products and reviews
        fetchProducts(sellerId, sellerData.store.storeName || sellerData.name, sellerData.store.username);
        fetchReviews(sellerId);

    } catch (error) {
        console.error("Error fetching store:", error);
        storeHeader.innerHTML = `<h1>Error</h1><p>Could not load this store. ${error.message}</p>`;
        loadingHeader?.remove();
    }
});

// --- Render Header ---
function renderHeader(sellerData) {
    const store = sellerData.store || {};
    const storeName = store.storeName || sellerData.name || 'Seller';
    const storeBio = store.description || 'Welcome to my store!';
    const whatsapp = store.whatsapp;
    const username = store.username;

    document.title = `${storeName} | Kabale Online Store`;

    let whatsappBtn = '';
    if (whatsapp) {
        const whatsappLink = `https://wa.me/${whatsapp}?text=Hi, I saw your store on Kabale Online: ${getSubdomainUrl(username)}`;
        whatsappBtn = `<a href="${whatsappLink}" target="_blank">Chat on WhatsApp</a>`;
    }

    storeHeader.innerHTML = `
        <h1>${storeName}</h1>
        <p>${storeBio}</p>
        ${whatsappBtn}
    `;
}

// --- Fetch Products ---
async function fetchProducts(sellerId, sellerName, username) {
    try {
        const q = query(
            collection(db, "products"),
            where("sellerId", "==", sellerId),
            orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);

        sellerProductGrid.innerHTML = ''; // Clear loader
        if (snapshot.empty) {
            listingsTitle.textContent = 'This seller has no active listings.';
        } else {
            listingsTitle.textContent = `Listings from ${sellerName}`;
            snapshot.forEach(doc => {
                const product = doc.data();
                const productLink = document.createElement('a');

                // --- Subdomain URL for product page ---
                const productUrl = getSubdomainUrl(username, `/product.html?id=${doc.id}`);

                productLink.href = productUrl;
                productLink.className = 'product-card';
                const thumbnailUrl = getCloudinaryTransformedUrl(product.imageUrls?.[0], 'thumbnail');
                productLink.innerHTML = `
                    <img src="${thumbnailUrl}" alt="${product.name}" loading="lazy">
                    <h3>${product.name}</h3>
                    <p class="price">UGX ${Number(product.price).toLocaleString()}</p>
                `;
                sellerProductGrid.appendChild(productLink);
            });
        }
    } catch (error) {
        console.error("Error fetching listings:", error);
        listingsTitle.textContent = 'Could not load listings.';
    } finally {
        loadingProducts?.remove();
    }
}

// --- Fetch Reviews ---
async function fetchReviews(sellerId) {
    try {
        const q = query(collection(db, `users/${sellerId}/reviews`), orderBy('timestamp', 'desc'));
        const snapshot = await getDocs(q);

        reviewsList.innerHTML = '';
        if (snapshot.empty) {
            avgRatingSummary.innerHTML = "<p>This seller has no reviews yet.</p>";
        } else {
            let totalRating = 0;
            snapshot.forEach(doc => {
                const review = doc.data();
                totalRating += review.rating;
                const reviewCard = document.createElement('div');
                reviewCard.className = 'review-card';
                reviewCard.innerHTML = `
                    <div>${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</div>
                    <p>${review.text}</p>
                    <p><strong>- ${review.reviewerName || 'Anonymous'}</strong></p>
                `;
                reviewsList.appendChild(reviewCard);
            });

            const avgRating = (totalRating / snapshot.size).toFixed(1);
            avgRatingSummary.innerHTML = `<h3>Average Rating: ${avgRating} / 5.0 (${snapshot.size} reviews)</h3>`;
        }
    } catch (error) {
        console.error("Error fetching reviews:", error);
        avgRatingSummary.innerHTML = "<p>Could not load seller reviews.</p>";
    } finally {
        loadingReviews?.remove();
    }
}