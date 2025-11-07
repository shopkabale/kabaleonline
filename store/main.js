// =================================================================== //
//                                                                     //
//             KABALE ONLINE - FULLY CUSTOMIZABLE STORE                //
//         PUBLIC JAVASCRIPT (main.js) - *NEW QUERY FIX* //
//                                                                     //
// =================================================================== //

// Imports from your *existing* firebase.js file
import { db, auth } from '../firebase.js'; 
import { collection, query, where, orderBy, limit, getDocs, doc, setDoc, deleteDoc, serverTimestamp, onSnapshot, getDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";

// ==================================================== //
//               GLOBAL STATE (for wishlist)            //
// ==================================================== //

const state = {
    currentUser: null,
    wishlist: new Set()
};

// ==================================================== //
//               DOM ELEMENT REFERENCES                 //
// ==================================================== //

const storeHeader = document.getElementById('store-header');
const listingsTitle = document.getElementById('listings-title');
const sellerProductGrid = document.getElementById('seller-product-grid');
const avgRatingSummary = document.getElementById('average-rating-summary');
const reviewsList = document.getElementById('reviews-list');
const storeFooter = document.getElementById('store-footer');
const loadingHeader = document.getElementById('loading-header');
const loadingProducts = document.getElementById('loading-products');
const loadingReviews = document.getElementById('loading-reviews');
const headerTemplate = document.getElementById('store-header-template');
const themeStyleTag = document.getElementById('store-theme-styles');

// ==================================================== //
//               INITIALIZATION & AUTH                  //
// ==================================================== //

document.addEventListener('DOMContentLoaded', () => {
    // 1. Handle Auth for Wishlist functionality
    onAuthStateChanged(auth, async (user) => {
        state.currentUser = user;
        await fetchUserWishlist();
        // 2. Load Store Content AFTER we know who the user is
        loadStoreContent();
    });
});

// ==================================================== //
//               CORE STORE LOADING LOGIC               //
// ==================================================== //

async function loadStoreContent() {
    // This is your brilliant logic to get the username from the URL path
    let username = null;
    const pathParts = window.location.pathname.split("/");
    if (pathParts.length >= 3 && pathParts[2]) {
        username = decodeURIComponent(pathParts[2]); // e.g. "test-store"
    }

    if (!username) {
        // Fallback for ?username= (this is the link we tested)
        const urlParams = new URLSearchParams(window.location.search);
        username = urlParams.get('username');
    }

    if (!username) {
        storeHeader.innerHTML = '<h1>Store not found.</h1><p>No username provided in the URL.</p>';
        loadingHeader.remove(); loadingProducts.remove(); loadingReviews.remove();
        return;
    }

    // --- 1. Find the Seller by Username ---
    try {
        
        // +++++ NEW QUERY - THIS IS THE FIX +++++
        // This query matches the new 2-field index you are building.
        const q = query(
            collection(db, 'users'), 
            where('store.username', '==', username), 
            where('isSeller', '==', true), // We add this field
            limit(1)
        );
        // +++++ END NEW QUERY +++++

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            storeHeader.innerHTML = `<h1>Store Not Found</h1><p>No store with the name "${username}" exists.</p>`;
            loadingHeader.remove(); loadingProducts.remove(); loadingReviews.remove();
            return;
        }

        const sellerDoc = snapshot.docs[0];
        const sellerId = sellerDoc.id;
        const sellerData = sellerDoc.data();
        const storeData = sellerData.store || {};
        
        // --- 2. Build the Page ---
        applyCustomTheme(storeData.design || {});
        renderHeader(sellerData, storeData);
        renderSocialLinks(storeData.links || {});
        renderReviews(sellerId); // Call reviews (now above products)
        renderProducts(sellerId, sellerData.name, storeData.design || {}); // Call products
        renderFooter(storeData.footer || {});

        loadingHeader.remove(); // Remove final loader

    } catch (error) {
        console.error("Error fetching store:", error);
        storeHeader.innerHTML = `<h1>Error</h1><p>Could not load this store. ${error.message}</p>`;
        loadingHeader.remove();
    }
}

// ==================================================== //
//               PAGE RENDERING FUNCTIONS               //
// ==================================================== //

/**
 * Injects custom CSS into the page based on seller's settings.
 */
function applyCustomTheme(design) {
    const themeColor = design.themeColor || 'var(--ko-primary)';
    
    // Set the site-wide --ko-primary variable *for this page*
    // This will *automatically* theme your existing CSS!
    document.documentElement.style.setProperty('--ko-primary', themeColor);
    
    // 2. Apply Product Layout
    // We add classes to the grid, which are defined in the <style>
    // block of store/index.html
    if (design.productLayout === '1-col') {
        sellerProductGrid.classList.add('layout-1-col');
    } else if (design.productLayout === '2-col') {
        sellerProductGrid.classList.add('layout-2-col');
    } else if (design.productLayout === '3-col') {
        sellerProductGrid.classList.add('layout-3-col');
    }
    // "default" will use your .product-grid CSS
}

/**
 * Renders the store header with banner, avatar, and info.
 */
function renderHeader(sellerData, store) {
    const storeName = store.storeName || sellerData.name || 'Seller';
    const storeBio = store.description || 'Welcome to my store!';
    const profileImageUrl = store.profileImageUrl || 'https://placehold.co/120x120/e0e0e0/777?text=Store';
    const bannerUrl = store.design?.bannerUrl; // Get from design object

    document.title = `${storeName} | Kabale Online Store`;

    // 1. Populate Header Template
    const headerNode = headerTemplate.content.cloneNode(true);
    headerNode.getElementById('store-avatar-img').src = profileImageUrl;
    headerNode.getElementById('store-avatar-img').alt = storeName;
    headerNode.getElementById('store-name-h1').textContent = storeName;
    headerNode.getElementById('store-bio-p').textContent = storeBio;
    
    // 2. Apply Banner Image
    if (bannerUrl) {
        storeHeader.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(${bannerUrl})`;
    } else {
        // Use a default theme color if no banner
        storeHeader.style.backgroundColor = "var(--ko-primary)";
    }
    
    storeHeader.appendChild(headerNode);
}

/**
 * Renders the social media and action buttons in the header.
 */
function renderSocialLinks(links) {
    const actionsDiv = document.getElementById('store-actions-div');
    const socialsDiv = document.getElementById('store-socials-div');
    if (!actionsDiv || !socialsDiv) return;

    // 1. Action Buttons
    if (links.whatsapp) {
        const whatsappLink = `https://wa.me/${links.whatsapp}?text=Hi, I saw your store on Kabale Online.`;
        actionsDiv.innerHTML += `<a href="${whatsappLink}" target="_blank" class="whatsapp-btn">Chat on WhatsApp</a>`;
    }
    // Add share button
    actionsDiv.innerHTML += `<button id="share-store-btn" class="share-btn">Share Store</button>`;

    // 2. Social Media Icons (using Font Awesome)
    if (links.facebook) {
        socialsDiv.innerHTML += `<a href="https://facebook.com/${links.facebook}" target="_blank" title="Facebook"><i class="fab fa-facebook"></i></a>`;
    }
    if (links.tiktok) {
        socialsDiv.innerHTML += `<a href="https://tiktok.com/${links.tiktok}" target="_blank" title="TikTok"><i class="fab fa-tiktok"></i></a>`;
    }
    if (links.github) {
        socialsDiv.innerHTML += `<a href="https://github.com/${links.github}" target="_blank" title="GitHub"><i class="fab fa-github"></i></a>`;
    }
    
    // 3. Add Event Listeners
    const shareBtn = document.getElementById('share-store-btn');
    shareBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(window.location.href)
            .then(() => alert("Store link copied to clipboard!"))
            .catch(err => console.error("Copy failed:", err));
    });
}

/**
 * Renders the seller's reviews.
 */
async function renderReviews(sellerId) {
    try {
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
                    <div class="star-rating">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</div>
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

/**
 * Renders the seller's custom footer.
 */
function renderFooter(footer) {
    if (!storeFooter) return;
    
    const footerText = footer.text || `© ${new Date().getFullYear()} ${document.title}. All rights reserved.`;
    const footerColor = footer.color || '#0A0A1F'; // Your default footer color
    
    storeFooter.style.backgroundColor = footerColor;
    storeFooter.innerHTML = `
        <div class="container">
            <p>${footerText}</p>
        </div>
    `;
}


// =================================================================== //
//                                                                     //
//    THIS IS YOUR *FULL* RENDERPRODUCTS FUNCTION FROM shop/main.js    //
//    This ensures your product cards look 100% correct.               //
//                                                                     //
// =================================================================== //

/**
 * Creates an optimized and transformed Cloudinary URL.
 * (Copied from your shop/main.js)
 */
function getCloudinaryTransformedUrl(url, type = 'thumbnail') {
    if (!url || !url.includes('res.cloudinary.com')) {
        return url || 'https://placehold.co/400x400/e0e0e0/777?text=No+Image';
    }
    const transformations = {
        thumbnail: 'c_fill,g_auto,w_400,h_400,f_auto,q_auto',
        full: 'c_limit,w_1200,h_675,f_auto,q_auto',
        placeholder: 'c_fill,g_auto,w_20,h_20,q_1,f_auto'
    };
    const transformString = transformations[type] || transformations.thumbnail;
    const urlParts = url.split('/upload/');
    if (urlParts.length !== 2) {
        return url;
    }
    return `${urlParts[0]}/upload/${transformString}/${urlParts[1]}`;
}

const lazyImageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            img.onload = () => img.classList.add('loaded');
            img.onerror = () => { img.src = 'https://placehold.co/250x250/e0e0e0/777?text=Error'; img.classList.add('loaded'); };
            observer.unobserve(img);
        }
    });
}, { rootMargin: "0px 0px 200px 0px" });

function observeLazyImages() {
    const imagesToLoad = document.querySelectorAll('img.lazy');
    imagesToLoad.forEach(img => lazyImageObserver.observe(img));
}

/**
 * Renders all products for a seller, using your exact logic from shop/main.js
 */
async function renderProducts(sellerId, sellerName, design) {
    
    // Note: We're not passing gridElement, but using the global `sellerProductGrid`
    
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
            if (loadingProducts) loadingProducts.remove();
            return;
        }

        listingsTitle.textContent = `Listings from ${sellerName}`;
        
        const fragment = document.createDocumentFragment();
        snapshot.forEach(doc => {
            const product = { id: doc.id, ...doc.data() };
            
            const thumbnailUrl = getCloudinaryTransformedUrl(product.imageUrls?.[0], 'thumbnail');
            const placeholderUrl = getCloudinaryTransformedUrl(product.imageUrls?.[0], 'placeholder');

            // This is the full logic from your shop/main.js
            
            const isInWishlist = state.wishlist.has(product.id);
            const wishlistIcon = isInWishlist ? 'fa-solid' : 'fa-regular';
            const wishlistClass = isInWishlist ? 'active' : '';
            const isActuallySold = product.isSold || (product.quantity !== undefined && product.quantity <= 0);
            const soldClass = isActuallySold ? 'is-sold' : '';
            const soldOverlayHTML = isActuallySold ? '<div class="product-card-sold-overlay"><span>SOLD</span></div>' : '';

            let priceHTML = '';
            let locationHTML = '';
            let stockStatusHTML = '';
            let tagsHTML = '';

            if (product.listing_type === 'service') {
                priceHTML = `<p class="price price-service">UGX ${product.price ? product.price.toLocaleString() : "N/A"} 
                    ${product.service_duration ? `<span>/ ${product.service_duration}</span>` : ''}
                </p>`;
                if (product.service_location_type) {
                    const icon = product.service_location_type === 'Online' ? 'fa-solid fa-wifi' : 'fa-solid fa-person-walking';
                    locationHTML = `<p class="location-name"><i class="${icon}"></i> ${product.service_location_type}</p>`;
                }
            } else {
                priceHTML = `<p class="price">UGX ${product.price ? product.price.toLocaleString() : "N/A"}</p>`;
                if (product.location) {
                    locationHTML = `<p class="location-name"><i class="fa-solid fa-location-dot"></i> ${product.location}</p>`;
                }
                if (isActuallySold) {
                    stockStatusHTML = `<p class="stock-info sold-out">Sold Out</p>`;
                } else if (product.quantity > 5) {
                    stockStatusHTML = `<p class="stock-info in-stock">In Stock</p>`;
                } else if (product.quantity > 0 && product.quantity <= 5) {
                    stockStatusHTML = `<p class="stock-info low-stock">Only ${product.quantity} left!</p>`;
                }
                if (product.listing_type === 'rent') {
                    tagsHTML += '<span class="product-tag type-rent">FOR RENT</span>';
                } else if (product.listing_type === 'sale') {
                    tagsHTML += '<span class="product-tag type-sale">FOR SALE</span>';
                }
                if (product.condition === 'new') {
                    tagsHTML += '<span class="product-tag condition-new">NEW</span>';
                } else if (product.condition === 'used') {
                    tagsHTML += '<span class="product-tag condition-used">USED</span>';
                }
            }

            const tagsContainerHTML = tagsHTML ? `<div class="product-tags">${tagsHTML}</div>` : '';

            const productLink = document.createElement("a");
            productLink.href = `/product.html?id=${product.id}`;
            productLink.className = "product-card-link";
            if (isActuallySold) {
                productLink.style.pointerEvents = 'none';
                productLink.style.cursor = 'default';
            }

            // This is your card structure, but with sellerName and verifiedText removed
            productLink.innerHTML = `
              <div class="product-card ${soldClass}">
                 ${soldOverlayHTML}
                 ${tagsContainerHTML} <button class="wishlist-btn ${wishlistClass}" data-product-id="${product.id}" data-product-name="${product.name}" data-product-price="${product.price}" data-product-image="${product.imageUrls?.[0] || ''}" aria-label="Add to wishlist">
                    <i class="${wishlistIcon} fa-heart"></i>
                </button>
                <img src="${placeholderUrl}" data-src="${thumbnailUrl}" alt="${product.name}" class="lazy">
                <h3>${product.name}</h3>
                ${stockStatusHTML}
                ${priceHTML}
                ${locationHTML}
                <!-- Seller name is removed, as we are on their store -->
              </div>
            `;
            
            fragment.appendChild(productLink);
        });

        sellerProductGrid.appendChild(fragment);
        observeLazyImages();
        initializeWishlistButtons();
        
    } catch(error) {
        console.error("Error fetching listings:", error);
        listingsTitle.textContent = 'Could not load listings.';
    } finally {
        if(loadingProducts) loadingProducts.remove();
    }
}

// ==================================================== //
//               WISHLIST FUNCTIONS                     //
// ==================================================== //

/**
 * Fetches the current user's wishlist to sync state.
 * (Copied from your shop/main.js)
 */
async function fetchUserWishlist() {
    if (!state.currentUser) { state.wishlist.clear(); return; }
    try {
        const wishlistCol = collection(db, 'users', state.currentUser.uid, 'wishlist');
        const wishlistSnapshot = await getDocs(wishlistCol);
        const wishlistIds = wishlistSnapshot.docs.map(doc => doc.id);
        state.wishlist = new Set(wishlistIds);
    } catch (error) { console.error("Could not fetch user wishlist:", error); }
}

/**
 * Adds click listeners to all wishlist buttons on the page.
 * (Copied from your shop/main.js)
 */
function initializeWishlistButtons() {
    const allProductCards = document.querySelectorAll('.product-card-link');
    allProductCards.forEach(card => {
        const wishlistButton = card.querySelector('.wishlist-btn');
        if (wishlistButton) {
            wishlistButton.removeEventListener('click', handleWishlistClick);
            wishlistButton.addEventListener('click', handleWishlistClick);
        }
    });
}

/**
 * Handles a click on a wishlist button.
 * (Copied from your shop/main.js)
 */
async function handleWishlistClick(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!state.currentUser) {
        alert('Please log in to add items to your wishlist.');
        window.location.href = '/login/';
        return;
    }
    const button = event.currentTarget;
    const productId = button.dataset.productId;
    const wishlistRef = doc(db, 'users', state.currentUser.uid, 'wishlist', productId);
    button.disabled = true;
    try {
        if (state.wishlist.has(productId)) {
            // Remove from wishlist
            await deleteDoc(wishlistRef);
            state.wishlist.delete(productId);
            updateWishlistButtonUI(button, false);
        } else {
            // Add to wishlist
            await setDoc(wishlistRef, { 
                name: button.dataset.productName, 
                price: parseFloat(button.dataset.productPrice) || 0, 
                imageUrl: button.dataset.productImage || '', 
                addedAt: serverTimestamp() 
            });
            state.wishlist.add(productId);
            updateWishlistButtonUI(button, true);
        }
    } catch (error) { console.error("Error updating wishlist:", error); } finally { button.disabled = false; }
}

/**
 * Updates the visual state of a wishlist button.
 * (Copied from your shop/main.js)
 */
function updateWishlistButtonUI(button, isInWishlist) {
    const icon = button.querySelector('i');
    if (isInWishlist) {
        button.classList.add('active'); 
        icon.classList.remove('fa-regular'); 
        icon.classList.add('fa-solid');
    } else {
        button.classList.remove('active'); 
        icon.classList.remove('fa-solid'); 
        icon.classList.add('fa-regular');
    }
}