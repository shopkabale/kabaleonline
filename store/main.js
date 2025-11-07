// =================================================================== //
//                                                                     //
//             KABALE ONLINE - FULLY CUSTOMIZABLE STORE                //
//      PUBLIC JAVASCRIPT (main.js) - *DIRECTORY & STORE FIX* //
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
    wishlist: new Set(),
    currentSellerId: null 
};

// ==================================================== //
//               DOM ELEMENT REFERENCES                 //
// ==================================================== //

// --- Single Store Page Elements ---
const singleStorePage = document.getElementById('single-store-page');
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

// --- Store Directory Page Elements ---
const directoryPage = document.getElementById('store-directory-page');
const directoryGrid = document.getElementById('store-directory-grid');
const loadingDirectory = document.getElementById('loading-directory');


// ==================================================== //
//               INITIALIZATION & AUTH                  //
// ==================================================== //

document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, async (user) => {
        state.currentUser = user;
        await fetchUserWishlist(); // Fetches wishlist for product cards
        
        // This is now the main "router"
        loadPageContent();
    });
});

// ==================================================== //
//               NEW: PAGE ROUTING LOGIC                //
// ==================================================== //

function getUsernameFromUrl() {
    let username = null;
    const pathParts = window.location.pathname.split("/");
    // Check that part[2] exists and is not just empty space
    if (pathParts.length >= 3 && pathParts[2] && pathParts[2].trim() !== '') {
        username = decodeURIComponent(pathParts[2]);
    }

    if (!username) {
        // Fallback for ?username=
        const urlParams = new URLSearchParams(window.location.search);
        username = urlParams.get('username');
    }
    return username;
}

/**
 * Main "Router" function. Decides whether to show
 * the directory or a single store.
 */
async function loadPageContent() {
    const username = getUsernameFromUrl();

    if (username) {
        // --- LOAD SINGLE STORE ---
        if(directoryPage) directoryPage.style.display = 'none';
        if(singleStorePage) singleStorePage.style.display = 'block';
        await loadSingleStore(username);
    } else {
        // --- LOAD STORE DIRECTORY ---
        if(singleStorePage) singleStorePage.style.display = 'none';
        if(directoryPage) directoryPage.style.display = 'block';
        document.title = "All Stores | Kabale Online";
        await loadStoreDirectory();
    }
}

// ==================================================== //
//               NEW: STORE DIRECTORY LOGIC             //
// ==================================================== //

/**
 * Fetches all stores from the 'publicStores' collection
 * and renders them as cards.
 */
async function loadStoreDirectory() {
    if (!directoryGrid) return; // In case element isn't on page
    try {
        const q = query(collection(db, "publicStores"), orderBy("storeName"));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            directoryGrid.innerHTML = "<p>No stores have been created yet.</p>";
            return;
        }

        directoryGrid.innerHTML = ''; // Clear loader
        const fragment = document.createDocumentFragment();

        snapshot.forEach(doc => {
            const store = doc.data();
            const profileImg = store.profileImageUrl || 'https://placehold.co/80x80/e0e0e0/777?text=Store';
            
            const storeCard = document.createElement('a');
            storeCard.className = 'store-card';
            // Use the correct URL structure for your site
            storeCard.href = `/store/${store.username}`; 
            
            storeCard.innerHTML = `
                <img src="${profileImg}" alt="${store.storeName} profile" class="store-card-avatar">
                <div class="store-card-info">
                    <h3>${store.storeName || 'Unnamed Store'}</h3>
                    <p>${store.description || 'No description available.'}</p>
                </div>
            `;
            fragment.appendChild(storeCard);
        });

        directoryGrid.appendChild(fragment);

    } catch (error) {
        console.error("Error fetching store directory:", error);
        directoryGrid.innerHTML = `<p>Error: Could not load store directory. ${error.message}</p>`;
    }
}


// ==================================================== //
//               EXISTING: SINGLE STORE LOGIC           //
// ==================================================== //

/**
 * This is your *original* loadStoreContent function,
 * renamed to loadSingleStore.
 */
async function loadSingleStore(username) {
    // Check if the single store elements exist
    if (!storeHeader || !listingsTitle || !sellerProductGrid) {
        console.error("Single store elements not found on page.");
        return;
    }
    
    try {
        // 1. Look up the username in the public 'storeUsernames' collection
        const usernameDocRef = doc(db, 'storeUsernames', username);
        const usernameDoc = await getDoc(usernameDocRef);

        if (!usernameDoc.exists()) {
            storeHeader.innerHTML = `<h1>Store Not Found</h1><p>No store with the name "${username}" exists.</p>`;
            if(loadingHeader) loadingHeader.remove();
            if(loadingProducts) loadingProducts.remove();
            if(loadingReviews) loadingReviews.remove();
            return;
        }

        // 2. Get the seller's ID from the lookup document
        const sellerId = usernameDoc.data().userId;
        state.currentSellerId = sellerId; // Save for review system

        // 3. Get the seller's public data using their ID
        const sellerDocRef = doc(db, 'users', sellerId);
        const sellerDoc = await getDoc(sellerDocRef);

        if (!sellerDoc.exists() || !sellerDoc.data().isSeller) {
            storeHeader.innerHTML = `<h1>Store Not Found</h1><p>This user is not a seller.</p>`;
            if(loadingHeader) loadingHeader.remove();
            if(loadingProducts) loadingProducts.remove();
            if(loadingReviews) loadingReviews.remove();
            return;
        }

        const sellerData = sellerDoc.data();
        const storeData = sellerData.store || {};
        
        // --- 2. Build the Page ---
        applyCustomTheme(storeData.design || {});
        renderHeader(sellerData, storeData);
        renderSocialLinks(storeData.links || {});
        renderReviews(sellerId);
        renderProducts(sellerId, sellerData.name, storeData.design || {});
        renderFooter(storeData.footer || {});

        if(loadingHeader) loadingHeader.remove(); // Remove final loader

    } catch (error) {
        console.error("Error fetching store:", error);
        storeHeader.innerHTML = `<h1>Error</h1><p>Could not load this store. ${error.message}</p>`;
        if(loadingHeader) loadingHeader.remove();
    }
}

// ==================================================== //
//           SINGLE STORE RENDERING FUNCTIONS           //
// ==================================================== //

function applyCustomTheme(design) {
    const themeColor = design.themeColor || 'var(--ko-primary)';
    document.documentElement.style.setProperty('--ko-primary', themeColor);
    
    if (design.productLayout === '1-col') {
        sellerProductGrid.classList.add('layout-1-col');
    } else if (design.productLayout === '2-col') {
        sellerProductGrid.classList.add('layout-2-col');
    } else if (design.productLayout === '3-col') {
        sellerProductGrid.classList.add('layout-3-col');
    }
}

function renderHeader(sellerData, store) {
    const storeName = store.storeName || sellerData.name || 'Seller';
    const storeBio = store.description || 'Welcome to my store!';
    const profileImageUrl = store.profileImageUrl || 'https://placehold.co/120x120/e0e0e0/777?text=Store';
    const bannerUrl = store.design?.bannerUrl;

    document.title = `${storeName} | Kabale Online Store`;

    const headerNode = headerTemplate.content.cloneNode(true);
    headerNode.getElementById('store-avatar-img').src = profileImageUrl;
    headerNode.getElementById('store-avatar-img').alt = storeName;
    headerNode.getElementById('store-name-h1').textContent = storeName;
    headerNode.getElementById('store-bio-p').textContent = storeBio;
    
    if (bannerUrl) {
        storeHeader.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(${bannerUrl})`;
    } else {
        storeHeader.style.backgroundColor = "var(--ko-primary)";
    }
    
    // Clear header before appending
    storeHeader.innerHTML = ''; 
    storeHeader.appendChild(headerNode);
}

function renderSocialLinks(links) {
    const actionsDiv = document.getElementById('store-actions-div');
    const socialsDiv = document.getElementById('store-socials-div');
    if (!actionsDiv || !socialsDiv) return;

    // Clear existing links
    actionsDiv.innerHTML = '';
    socialsDiv.innerHTML = '';

    if (links.whatsapp) {
        const whatsappLink = `https://wa.me/${links.whatsapp}?text=Hi, I saw your store on Kabale Online.`;
        actionsDiv.innerHTML += `<a href="${whatsappLink}" target="_blank" class="whatsapp-btn">Chat on WhatsApp</a>`;
    }
    actionsDiv.innerHTML += `<button id="share-store-btn" class="share-btn">Share Store</button>`;

    if (links.facebook) {
        socialsDiv.innerHTML += `<a href="https://facebook.com/${links.facebook}" target="_blank" title="Facebook"><i class="fab fa-facebook"></i></a>`;
    }
    if (links.tiktok) {
        socialsDiv.innerHTML += `<a href="https://tiktok.com/${links.tiktok}" target="_blank" title="TikTok"><i class="fab fa-tiktok"></i></a>`;
    }
    if (links.github) {
        socialsDiv.innerHTML += `<a href="https://github.com/${links.github}" target="_blank" title="GitHub"><i class="fab fa-github"></i></a>`;
    }
    
    const shareBtn = document.getElementById('share-store-btn');
    if(shareBtn) {
        shareBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(window.location.href)
                .then(() => alert("Store link copied to clipboard!"))
                .catch(err => console.error("Copy failed:", err));
        });
    }
}

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

function renderFooter(footer) {
    if (!storeFooter) return;
    const footerText = footer.text || `© ${new Date().getFullYear()} ${document.title}. All rights reserved.`;
    const footerColor = footer.color || '#0A0A1F';
    storeFooter.style.backgroundColor = footerColor;
    storeFooter.innerHTML = `<div class="container"><p>${footerText}</p></div>`;
}

// =================================================================== //
//                                                                     //
//    YOUR *FULL* RENDERPRODUCTS FUNCTION (UNCHANGED)                  //
//                                                                     //
// =================================================================== //

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

async function renderProducts(sellerId, sellerName, design) {
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
            const isInWishlist = state.wishlist.has(product.id);
            const wishlistIcon = isInWishlist ? 'fa-solid' : 'fa-regular';
            const wishlistClass = isInWishlist ? 'active' : '';
            const isActuallySold = product.isSold || (product.quantity !== undefined && product.quantity <= 0);
            const soldClass = isActuallySold ? 'is-sold' : '';
            const soldOverlayHTML = isActuallySold ? '<div class="product-card-sold-overlay"><span>SOLD</span></div>' : '';
            let priceHTML = '', locationHTML = '', stockStatusHTML = '', tagsHTML = '';

            if (product.listing_type === 'service') {
                priceHTML = `<p class="price price-service">UGX ${product.price ? product.price.toLocaleString() : "N/A"} ${product.service_duration ? `<span>/ ${product.service_duration}</span>` : ''}</p>`;
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
                if (product.listing_type === 'rent') tagsHTML += '<span class="product-tag type-rent">FOR RENT</span>';
                else if (product.listing_type === 'sale') tagsHTML += '<span class="product-tag type-sale">FOR SALE</span>';
                if (product.condition === 'new') tagsHTML += '<span class="product-tag condition-new">NEW</span>';
                else if (product.condition === 'used') tagsHTML += '<span class="product-tag condition-used">USED</span>';
            }
            const tagsContainerHTML = tagsHTML ? `<div class="product-tags">${tagsHTML}</div>` : '';

            const productLink = document.createElement("a");
            productLink.href = `/product.html?id=${product.id}`;
            productLink.className = "product-card-link";
            if (isActuallySold) {
                productLink.style.pointerEvents = 'none';
                productLink.style.cursor = 'default';
            }
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
//               WISHLIST FUNCTIONS (UNCHANGED)         //
// ==================================================== //

async function fetchUserWishlist() {
    if (!state.currentUser) { state.wishlist.clear(); return; }
    try {
        const wishlistCol = collection(db, 'users', state.currentUser.uid, 'wishlist');
        const wishlistSnapshot = await getDocs(wishlistCol);
        const wishlistIds = wishlistSnapshot.docs.map(doc => doc.id);
        state.wishlist = new Set(wishlistIds);
    } catch (error) { console.error("Could not fetch user wishlist:", error); }
}

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
            await deleteDoc(wishlistRef);
            state.wishlist.delete(productId);
            updateWishlistButtonUI(button, false);
        } else {
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