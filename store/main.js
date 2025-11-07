// --- Imports from your existing firebase.js ---
import { db } from '../firebase.js';
import { collection, query, where, getDocs, orderBy, doc, getDoc, limit } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- Cloudinary Image Helper ---
function getCloudinaryTransformedUrl(url, type = 'thumbnail') {
    if (!url || !url.includes('res.cloudinary.com')) {
        return url || 'https://placehold.co/400x400/e0e0e0/777?text=No+Image';
    }
    const transformations = { thumbnail: 'c_fill,g_auto,w_400,h_400,f_auto,q_auto' };
    const urlParts = url.split('/upload/');
    if (urlParts.length !== 2) return url;
    return `${urlParts[0]}/upload/${transformations[type]}/${urlParts[1]}`;
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

// --- MAIN FUNCTION ---
document.addEventListener('DOMContentLoaded', async () => {
    // --- Handle clean URLs like /store/test-store ---
    let username = null;
    let sellerId = null;

    const pathParts = window.location.pathname.split("/");
    if (pathParts.length >= 3 && pathParts[2]) {
        username = decodeURIComponent(pathParts[2]); // e.g. "test-store"
    }

    // --- Still support old ?username= or ?sellerId= URLs ---
    const urlParams = new URLSearchParams(window.location.search);
    if (!username) username = urlParams.get('username');
    if (!sellerId) sellerId = urlParams.get('sellerId');

    if (!username && !sellerId) {
        storeHeader.innerHTML = '<h1>Store not found</h1><p>No username or sellerId in URL.</p>';
        loadingHeader.remove(); loadingProducts.remove(); loadingReviews.remove();
        return;
    }

    let sellerDoc = null;
    let sellerData = null;

    try {
        if (username) {
            const q = query(collection(db, 'users'), where('store.username', '==', username), limit(1));
            const snapshot = await getDocs(q);
            if (!snapshot.empty) sellerDoc = snapshot.docs[0];
        } else if (sellerId) {
            const docRef = doc(db, 'users', sellerId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) sellerDoc = docSnap;
        }

        if (!sellerDoc) {
            storeHeader.innerHTML = `<h1>Store Not Found</h1><p>This store does not exist.</p>`;
            loadingHeader.remove(); loadingProducts.remove(); loadingReviews.remove();
            return;
        }

        const finalSellerId = sellerDoc.id;
        sellerData = sellerDoc.data();

        renderHeader(sellerData, username);
        loadingHeader.remove();

        fetchProducts(finalSellerId, sellerData.name);
        fetchReviews(finalSellerId);

    } catch (error) {
        console.error("Error fetching store:", error);
        storeHeader.innerHTML = `<h1>Error</h1><p>Could not load this store. ${error.message}</p>`;
        loadingHeader.remove();
    }
});

// --- Render Store Header ---
function renderHeader(sellerData, username) {
    const store = sellerData.store || {};
    const storeName = store.storeName || sellerData.name || 'Seller';
    const storeBio = store.description || 'Welcome to my store!';
    const whatsapp = store.whatsapp;

    document.title = `${storeName} | Kabale Online Store`;

    // Build clean shareable link
    const cleanLink = `https://kabaleonline.com/store/${encodeURIComponent(username)}`;

    let whatsappBtn = '';
    if (whatsapp) {
        const whatsappLink = `https://wa.me/${whatsapp}?text=Hi, I saw your store on Kabale Online.`;
        whatsappBtn = `<a href="${whatsappLink}" target="_blank" class="whatsapp-btn">Chat on WhatsApp</a>`;
    }

    const shareBtn = `<button id="copy-link-btn" class="copy-btn">Copy Store Link</button>`;

    storeHeader.innerHTML = `
        <h1>${storeName}</h1>
        <p>${storeBio}</p>
        <div class="store-actions">${whatsappBtn} ${shareBtn}</div>
    `;

    // Copy to clipboard event
    const copyBtn = document.getElementById('copy-link-btn');
    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(cleanLink).then(() => {
            showPopup("✅ Store link copied!");
        }).catch(err => {
            console.error("Copy failed:", err);
            showPopup("❌ Failed to copy link.");
        });
    });
}

// --- Popup Function ---
function showPopup(message) {
    const popup = document.createElement('div');
    popup.className = 'copy-popup';
    popup.textContent = message;
    document.body.appendChild(popup);
    setTimeout(() => popup.classList.add('show'), 50);
    setTimeout(() => {
        popup.classList.remove('show');
        setTimeout(() => popup.remove(), 300);
    }, 2500);
}

// --- Fetch Products ---
async function fetchProducts(sellerId, sellerName) {
    try {
        const q = query(
            collection(db, "products"),
            where("sellerId", "==", sellerId),
            orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);

        sellerProductGrid.innerHTML = '';
        if (querySnapshot.empty) {
            listingsTitle.textContent = 'This seller has no active listings.';
        } else {
            listingsTitle.textContent = `Listings from ${sellerName}`;
            querySnapshot.forEach((doc) => {
                const product = doc.data();
                const productLink = document.createElement('a');
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
        if (loadingProducts) loadingProducts.remove();
    }
}

// --- Fetch Reviews ---
async function fetchReviews(sellerId) {
    try {
        const reviewsQuery = query(collection(db, `users/${sellerId}/reviews`), orderBy('timestamp', 'desc'));
        const reviewsSnapshot = await getDocs(reviewsQuery);

        reviewsList.innerHTML = '';
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
        if (loadingReviews) loadingReviews.remove();
    }
}

// --- Simple CSS for popup + button (optional but stylish) ---
const style = document.createElement('style');
style.innerHTML = `
.copy-btn {
    background: #007aff;
    color: #fff;
    border: none;
    padding: 8px 14px;
    border-radius: 6px;
    cursor: pointer;
    margin-left: 10px;
    font-size: 14px;
}
.copy-btn:hover { background: #005fcc; }
.copy-popup {
    position: fixed;
    bottom: 30px;
    left: 50%;
    transform: translateX(-50%) scale(0.9);
    background: #111;
    color: #fff;
    padding: 10px 18px;
    border-radius: 30px;
    opacity: 0;
    transition: all 0.3s ease;
    z-index: 9999;
}
.copy-popup.show {
    opacity: 1;
    transform: translateX(-50%) scale(1);
}
`;
document.head.appendChild(style);