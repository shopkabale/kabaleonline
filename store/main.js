// Imports from your *existing* firebase.js file
import { db } from '../firebase.js';
import { collection, query, where, getDocs, orderBy, doc, getDoc, limit } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- Cloudinary Helper (from your shop/main.js) ---
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

// --- Main Function ---
document.addEventListener('DOMContentLoaded', async () => {
    // This is how we get the username from the URL:
    // .../store/index.html?username=alines-shoes
    const urlParams = new URLSearchParams(window.location.search);
    const username = urlParams.get('username');

    if (!username) {
        storeHeader.innerHTML = '<h1>Store not found.</h1><p>No username provided in the URL.</p>';
        listingsTitle.style.display = 'none';
        reviewsList.style.display = 'none';
        return;
    }

    // --- 1. Find the Seller by Username ---
    let sellerId = null;
    let sellerData = null;

    try {
        const q = query(collection(db, 'users'), where('store.username', '==', username), limit(1));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            storeHeader.innerHTML = `<h1>Store Not Found</h1><p>No store with the name "${username}" exists.</p>`;
            loadingHeader.remove();
            loadingProducts.remove();
            loadingReviews.remove();
            return;
        }

        const sellerDoc = snapshot.docs[0];
        sellerId = sellerDoc.id;
        sellerData = sellerDoc.data();

        // --- 2. Render the Store Header ---
        renderHeader(sellerData);
        loadingHeader.remove();

        // --- 3. Fetch and Render Products & Reviews (in parallel) ---
        // We pass the sellerId to both functions
        fetchProducts(sellerId, sellerData.name);
        fetchReviews(sellerId);

    } catch (error) {
        console.error("Error fetching store:", error);
        storeHeader.innerHTML = '<h1>Error</h1><p>Could not load this store. Please try again.</p>';
        loadingHeader.remove();
    }
});

function renderHeader(sellerData) {
    const store = sellerData.store || {};
    const storeName = store.storeName || sellerData.name || 'Seller';
    const storeBio = store.description || 'Welcome to my store!';
    const whatsapp = store.whatsapp;

    // Set the browser tab title
    document.title = `${storeName} | Kabale Online Store`;

    let whatsappBtn = '';
    if (whatsapp) {
        // Simple link, as your profile.js had
        const whatsappLink = `https://wa.me/${whatsapp}?text=Hi, I saw your store on Kabale Online.`;
        whatsappBtn = `<a href="${whatsappLink}" target="_blank">Chat on WhatsApp</a>`;
    }

    storeHeader.innerHTML = `
        <h1>${storeName}</h1>
        <p>${storeBio}</p>
        ${whatsappBtn}
    `;
}

async function fetchProducts(sellerId, sellerName) {
    try {
        const q = query(
            collection(db, "products"),
            where("sellerId", "==", sellerId),
            orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);

        sellerProductGrid.innerHTML = ''; // Clear loader
        if (querySnapshot.empty) {
            listingsTitle.textContent = 'This seller has no active listings.';
        } else {
            listingsTitle.textContent = `Listings from ${sellerName}`;
            querySnapshot.forEach((doc) => {
                const product = doc.data();
                const productLink = document.createElement('a');
                // Link to your *existing* product page
                productLink.href = `/product.html?id=${doc.id}`; 
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
        if(loadingProducts) loadingProducts.remove();
    }
}

async function fetchReviews(sellerId) {
    try {
        // This query is from your profile.js
        const reviewsQuery = query(collection(db, `users/${sellerId}/reviews`), orderBy('timestamp', 'desc'));
        const reviewsSnapshot = await getDocs(reviewsQuery);

        reviewsList.innerHTML = ''; // Clear loader
        if (reviewsSnapshot.empty) {
            avgRatingSummary.innerHTML = "<p>This seller has no reviews yet.</p>";
        } else {
            let totalRating = 0;
            reviewsSnapshot.forEach(doc => {
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

            const avgRating = (totalRating / reviewsSnapshot.size).toFixed(1);
            avgRatingSummary.innerHTML = `<h3>Average Rating: ${avgRating} / 5.0 (${reviewsSnapshot.size} reviews)</h3>`;
        }
    } catch (error) {
        console.error("Error fetching reviews:", error);
        avgRatingSummary.innerHTML = "<p>Could not load seller reviews.</p>";
    } finally {
        if(loadingReviews) loadingReviews.remove();
    }
}