// --- FIREBASE IMPORTS ---
// Importing from your existing firebase.js file
import { 
    db, 
    collection, 
    query, 
    where, 
    getDocs, 
    orderBy, 
    doc, 
    getDoc,
    limit
} from './firebase.js';

// --- DOM ELEMENTS ---
const headerContainer = document.getElementById('store-header-container');
const headerSkeleton = document.getElementById('store-header-skeleton');
const productGrid = document.getElementById('store-product-grid');
const listingsTitle = document.getElementById('listings-title');
const reviewsSection = document.getElementById('reviews-section');
const avgRatingSummary = document.getElementById('average-rating-summary');
const reviewsList = document.getElementById('reviews-list');

// --- HELPER FUNCTION (from your profile.js) ---
function getCloudinaryTransformedUrl(url, type) {
    if (!url || !url.includes('res.cloudinary.com')) {
        return url || '[https://placehold.co/400x400/e0e0e0/777?text=No+Image](https://placehold.co/400x400/e0e0e0/777?text=No+Image)';
    }
    const transformations = {
        thumbnail: 'c_fill,g_auto,w_250,h_250,f_auto,q_auto',
        full: 'c_limit,w_800,h_800,f_auto,q_auto',
        banner: 'c_fill,g_auto,w_1200,h_250,f_auto,q_auto', // New
        logo: 'c_fill,g_auto,w_140,h_140,f_auto,q_auto' // New
    };
    const transformString = transformations[type] || transformations.thumbnail;
    const urlParts = url.split('/upload/');
    if (urlParts.length !== 2) {
        return url;
    }
    return `${urlParts[0]}/upload/${transformString}/${urlParts[1]}`;
}

// --- RENDER SKELETONS (from your main.js) ---
function renderSkeletonLoaders(container, count) {
    if (!container) return; 
    container.innerHTML = '';
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
        const skeletonCard = document.createElement('div');
        skeletonCard.className = 'skeleton-card';
        skeletonCard.innerHTML = `<div class="skeleton-image"></div><div class="skeleton-text w-75"></div><div class="skeleton-text w-50"></div>`;
        fragment.appendChild(skeletonCard);
    }
    container.appendChild(fragment);
}

// --- MAIN FUNCTION ---
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Get username from URL (e.g., store.html?username=alines-shoes)
    const urlParams = new URLSearchParams(window.location.search);
    const username = urlParams.get('username');

    if (!username) {
        headerContainer.innerHTML = '<h1 class="text-2xl font-bold p-10">Store not found.</h1>';
        listingsTitle.style.display = 'none';
        reviewsSection.style.display = 'none';
        return;
    }

    // Show skeletons while we load
    renderSkeletonLoaders(productGrid, 8);
    
    try {
        // 2. Find the seller by their unique username
        const usersRef = collection(db, 'users');
        const userQuery = query(usersRef, where('store.username', '==', username), limit(1));
        const userSnapshot = await getDocs(userQuery);

        if (userSnapshot.empty) {
            headerContainer.innerHTML = `<h1 class="text-2xl font-bold p-10">Store not found for: ${username}</h1>`;
            listingsTitle.style.display = 'none';
            reviewsSection.style.display = 'none';
            return;
        }

        // 3. We found the seller! Get their data.
        const sellerDoc = userSnapshot.docs[0];
        const sellerId = sellerDoc.id;
        const sellerData = sellerDoc.data();
        const storeData = sellerData.store || {}; // Get the 'store' object

        // --- 4. Render the New Store Header ---
        renderStoreHeader(sellerData);
        
        // --- 5. Fetch and Render Products (Using your profile.js logic) ---
        // This runs in parallel with reviews
        fetchSellerProducts(sellerId, storeData.storeName || sellerData.name);
        
        // --- 6. Fetch and Render Reviews (Using your profile.js logic) ---
        fetchSellerReviews(sellerId);

    } catch (error) {
        console.error("Error loading store:", error);
        headerContainer.innerHTML = `<h1>Error</h1><p>There was a problem loading this store.</p>`;
    }
});

// --- NEW: Renders the beautiful store header ---
function renderStoreHeader(sellerData) {
    const store = sellerData.store || {};
    
    const storeName = store.storeName || sellerData.name || 'Kabale Seller';
    const storeBio = store.storeDescription || sellerData.bio || 'This seller has not added a description yet.';
    const whatsappNumber = store.storeWhatsapp || sellerData.whatsapp;
    
    // Get image URLs (using placeholders for now)
    // In Part 3, you'll add upload fields, and these will be real
    const bannerUrl = getCloudinaryTransformedUrl(store.storeBannerUrl || 'placeholder', 'banner');
    const logoUrl = getCloudinaryTransformedUrl(store.storeLogoUrl || sellerData.profilePhotoUrl, 'logo');

    const isVerified = sellerData.isVerifiedSeller || sellerData.isVerified;
    let badgeHTML = isVerified ? `<div class="store-badge"><i class="fas fa-check-circle"></i> Verified Seller</div>` : '';

    let contactHTML = '';
    if (whatsappNumber) {
        const whatsappLink = `https://wa.me/${whatsappNumber}?text=Hi ${storeName}, I saw your store on KabaleOnline.`;
        contactHTML = `<a href="${whatsappLink}" class="store-contact-btn" target="_blank"><i class="fab fa-whatsapp"></i> Chat with Seller</a>`;
    }

    const headerHTML = `
        <div class="store-header">
            <div class="store-banner" style="background-image: url('${bannerUrl}')"></div>
            <div class="store-info">
                <div class="store-logo" style="background-image: url('${logoUrl}')"></div>
                <h1 class="store-name">${storeName}</h1>
                ${badgeHTML}
                <p class="store-bio">${storeBio}</p>
                ${contactHTML}
            </div>
        </div>
    `;
    
    headerContainer.innerHTML = headerHTML; // Replace skeleton with real header
    document.title = `${storeName} | KabaleOnline Store`;
}

// --- Fetches Products (Adapted from your profile.js) ---
async function fetchSellerProducts(sellerId, sellerName) {
    try {
        const q = query(
            collection(db, "products"), 
            where("sellerId", "==", sellerId), 
            orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);
        productGrid.innerHTML = ''; // Clear skeletons
        
        if (querySnapshot.empty) {
            listingsTitle.textContent = 'This store has no active listings.';
        } else {
            listingsTitle.textContent = `Listings from ${sellerName}`;
            
            querySnapshot.forEach((doc) => {
                const product = { id: doc.id, ...doc.data() };
                productGrid.appendChild(createProductCard(product));
            });
            // Re-use lazy loading from your main.js
            observeLazyImages();
        }
    } catch (error) {
        console.error("Error fetching listings:", error);
        listingsTitle.textContent = 'Could not load listings.';
    }
}

// --- Creates a Product Card (Adapted from your shop/main.js) ---
// Note: This does NOT include wishlist, as that logic is in main.js
// You can add it later if you want.
function createProductCard(product) {
    const productLink = document.createElement('a');
    productLink.href = `product.html?id=${product.id}`;
    productLink.className = 'product-card-link';

    const thumbnailUrl = getCloudinaryTransformedUrl(product.imageUrls?.[0], 'thumbnail');
    
    const isActuallySold = product.isSold || (product.quantity !== undefined && product.quantity <= 0);
    const soldClass = isActuallySold ? 'is-sold' : '';
    const soldOverlayHTML = isActuallySold ? '<div class="product-card-sold-overlay"><span>SOLD</span></div>' : '';

    let priceHTML = `<p class="price">UGX ${Number(product.price).toLocaleString()}</p>`;
    if (product.listing_type === 'rent') {
        priceHTML += ' <span>/ day</span>'; // Example
    }

    productLink.innerHTML = `
      <div class="product-card ${soldClass}">
         ${soldOverlayHTML}
         <!-- Add Tags, Wishlist, etc. here if you want -->
         <img src="${thumbnailUrl}" alt="${product.name}" loading="lazy">
         <h3>${product.name}</h3>
         ${priceHTML}
         <p class="location-name"><i class="fa-solid fa-location-dot"></i> ${product.location || 'Kabale'}</p>
      </div>
    `;
    return productLink;
}

// --- Fetches Reviews (Adapted from your profile.js) ---
async function fetchSellerReviews(sellerId) {
    try {
        const reviewsQuery = query(collection(db, `users/${sellerId}/reviews`), orderBy('createdAt', 'desc')); // Assuming 'createdAt'
        const reviewsSnapshot = await getDocs(reviewsQuery);

        if (reviewsSnapshot.empty) {
            avgRatingSummary.innerHTML = "<p>This store has no reviews yet.</p>";
        } else {
            let totalRating = 0;
            reviewsList.innerHTML = '';
            reviewsSnapshot.forEach(doc => {
                const review = doc.data();
                totalRating += review.rating; // Assuming 'rating' field
                const reviewCard = document.createElement('div');
                reviewCard.className = 'review-card'; // Make sure this class is in your CSS
                reviewCard.innerHTML = `
                    <div class="star-rating">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</div>
                    <p>${review.comment || review.text}</p>
                    <p class="review-author">- ${review.authorName || 'Anonymous'}</p>
                `;
                reviewsList.appendChild(reviewCard);
            });

            const avgRating = (totalRating / reviewsSnapshot.size).toFixed(1);
            avgRatingSummary.innerHTML = `<h3>Average Rating: ${avgRating} / 5.0 (${reviewsSnapshot.size} reviews)</h3>`;
        }
    } catch (error) {
        console.error("Error fetching reviews:", error);
        avgRatingSummary.innerHTML = "<p>Could not load store reviews.</p>";
    }
}

// --- LAZY LOADING (from your main.js) ---
const lazyImageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const img = entry.target;
            if(img.dataset.src) {
                img.src = img.dataset.src;
                img.onload = () => img.classList.add('loaded');
                img.onerror = () => { img.src = '[https://placehold.co/250x250/e0e0e0/777?text=Error](https://placehold.co/250x250/e0e0e0/777?text=Error)'; img.classList.add('loaded'); };
                observer.unobserve(img);
            }
        }
    });
}, { rootMargin: "0px 0px 200px 0px" });

function observeLazyImages() {
    const imagesToLoad = document.querySelectorAll('img[loading="lazy"]');
    imagesToLoad.forEach(img => lazyImageObserver.observe(img));
}