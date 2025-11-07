// =================================================================== //
//                                                                     //
//             KABALE ONLINE - FULLY CUSTOMIZABLE STORE                //
//      PUBLIC JAVASCRIPT (main.js) - *THEME & INFO UPDATE* //
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
    currentSellerId: null,
    activeThemePrefix: '#theme-default' // Default theme
};
const DAYS_OF_WEEK = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_NAMES = {
    mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
    fri: 'Friday', sat: 'Saturday', sun: 'Sunday'
};

// ==================================================== //
//               DOM ELEMENT REFERENCES                 //
// ==================================================== //

// --- Page Containers ---
const singleStorePage = document.getElementById('single-store-page');
const directoryPage = document.getElementById('store-directory-page');
const loadingHeader = document.getElementById('loading-header');

// --- Store Directory Page Elements ---
const directoryList = document.getElementById('store-directory-list');

// --- Single Store Page Elements (now dynamically selected) ---
// We will use a helper function to get elements from the active theme
function $(selector) {
    // Queries within the active theme container
    return document.querySelector(`${state.activeThemePrefix} ${selector}`);
}
function $all(selector) {
    // Queries all within the active theme container
    return document.querySelectorAll(`${state.activeThemePrefix} ${selector}`);
}

// --- Templates ---
const headerTemplateAdv = document.getElementById('store-header-template-adv');
const themeStyleTag = document.getElementById('store-theme-styles');

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
    if (pathParts.length >= 3 && pathParts[2] && pathParts[2].trim() !== '') {
        username = decodeURIComponent(pathParts[2]);
    }

    if (!username) {
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
//               *UPDATED WITH PHONE & LOCATION* //
// ==================================================== //

/**
 * Fetches all stores from the 'publicStores' collection
 * and renders them as cards.
 */
async function loadStoreDirectory() {
    if (!directoryList) return; // In case element isn't on page
    try {
        const q = query(collection(db, "publicStores"), orderBy("storeName"));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            directoryList.innerHTML = "<p>No stores have been created yet.</p>";
            return;
        }

        directoryList.innerHTML = ''; // Clear loader
        const fragment = document.createDocumentFragment();

        snapshot.forEach(doc => {
            const store = doc.data();
            const profileImg = store.profileImageUrl || 'https://placehold.co/80x80/e0e0e0/777?text=Store';
            
            // +++++ NEW: Generate Phone and Location HTML +++++
            const phoneHTML = store.phone ? 
                `<p><i class="fa-solid fa-phone"></i> ${store.phone}</p>` : '';
            const locationHTML = store.location ? 
                `<p><i class="fa-solid fa-location-dot"></i> ${store.location}</p>` : '';
            
            const storeCard = document.createElement('a');
            storeCard.className = 'store-card-list'; 
            storeCard.href = `/store/${store.username}`; 
            
            storeCard.innerHTML = `
                <img src="${profileImg}" alt="${store.storeName} profile" class="store-card-list-avatar">
                <div class="store-card-list-info">
                    <h3>${store.storeName || 'Unnamed Store'}</h3>
                    <p class="description">${store.description || 'No description available.'}</p>
                    <div class="store-card-list-contact">
                        ${phoneHTML}
                        ${locationHTML}
                    </div>
                </div>
            `;
            fragment.appendChild(storeCard);
        });

        directoryList.appendChild(fragment);

    } catch (error) {
        console.error("Error fetching store directory:", error);
        directoryList.innerHTML = `<p>Error: Could not load store directory. ${error.message}</p>`;
    }
}


// ==================================================== //
//               EXISTING: SINGLE STORE LOGIC           //
//               *UPDATED FOR THEMES* //
// ==================================================== //

async function loadSingleStore(username) {
    try {
        // 1. Look up the username
        const usernameDocRef = doc(db, 'storeUsernames', username);
        const usernameDoc = await getDoc(usernameDocRef);

        if (!usernameDoc.exists()) {
            singleStorePage.innerHTML = `<h1>Store Not Found</h1><p>No store with the name "${username}" exists.</p>`;
            if(loadingHeader) loadingHeader.remove();
            return;
        }

        // 2. Get the seller's ID
        const sellerId = usernameDoc.data().userId;
        state.currentSellerId = sellerId; 

        // 3. Get the seller's public data
        const sellerDocRef = doc(db, 'users', sellerId);
        const sellerDoc = await getDoc(sellerDocRef);

        if (!sellerDoc.exists() || !sellerDoc.data().isSeller) {
            singleStorePage.innerHTML = `<h1>Store Not Found</h1><p>This user is not a seller.</p>`;
            if(loadingHeader) loadingHeader.remove();
            return;
        }

        const sellerData = sellerDoc.data();
        const storeData = sellerData.store || {};
        const design = storeData.design || {};
        
        // --- +++++ NEW: APPLY THEME +++++ ---
        const theme = design.theme || 'default';
        if (theme === 'advanced') {
            state.activeThemePrefix = '#theme-advanced';
            document.getElementById('theme-advanced').style.display = 'block';
        } else {
            state.activeThemePrefix = '#theme-default';
            document.getElementById('theme-default').style.display = 'block';
        }
        applyThemeColor(design); // Apply custom color
        // --- +++++ END THEME LOGIC +++++ ---
        
        // --- 2. Build the Page ---
        renderHeader(sellerData, storeData); 
        renderSocialLinks(storeData.links || {});
        
        // +++++ NEW: Render Info (Hours/Map) +++++
        renderStoreInfo(storeData); 
        
        renderReviews(sellerId);
        renderProducts(sellerId, sellerData.name, design);
        renderFooter(storeData.footer || {});

        if(loadingHeader) loadingHeader.remove(); // Remove final loader

    } catch (error) {
        console.error("Error fetching store:", error);
        singleStorePage.innerHTML = `<h1>Error</h1><p>Could not load this store. ${error.message}</p>`;
        if(loadingHeader) loadingHeader.remove();
    }
}

// ==================================================== //
//           SINGLE STORE RENDERING FUNCTIONS           //
// ==================================================== //

/**
 * Injects custom CSS into the page based on seller's settings.
 */
function applyThemeColor(design) {
    const themeColor = design.themeColor || 'var(--ko-primary)';
    // Set the CSS variable for the whole document
    document.documentElement.style.setProperty('--ko-primary', themeColor);
}

/**
 * Renders the store header with banner, avatar, and info.
 * *UPDATED* to populate both themes.
 */
function renderHeader(sellerData, store) {
    const storeName = store.storeName || sellerData.name || 'Seller';
    // Use the full description here
    const storeBio = store.description || 'Welcome to my store!';
    // Create a short bio for the header
    const shortBio = storeBio.substring(0, 70) + (storeBio.length > 70 ? '...' : '');
    
    const profileImageUrl = store.profileImageUrl || 'https://placehold.co/120x120/e0e0e0/777?text=Store';
    const bannerUrl = store.design?.bannerUrl;
    
    // +++++ NEW: Get Phone and Location +++++
    const storePhone = store.phone;
    const storeLocation = store.location;

    document.title = `${storeName} | Kabale Online Store`;

    // --- Populate Active Theme ---
    // Universal Elements
    $(`.store-avatar`).src = profileImageUrl;
    $(`.store-avatar`).alt = storeName;
    $(`.store-info h1`).textContent = storeName;
    $(`.store-bio`).textContent = shortBio;
    
    // Phone and Location
    const phoneEl = $(`.store-contact-info #store-phone-${state.activeThemePrefix.substring(7)}`);
    const locationEl = $(`.store-contact-info #store-location-${state.activeThemePrefix.substring(7)}`);

    if (phoneEl) {
        if (storePhone) {
            phoneEl.querySelector('span').textContent = storePhone;
        } else {
            phoneEl.style.display = 'none';
        }
    }
    if (locationEl) {
        if (storeLocation) {
            locationEl.querySelector('span').textContent = storeLocation;
        } else {
            locationEl.style.display = 'none';
        }
    }

    // --- Theme-Specific Elements ---
    if (state.activeThemePrefix === '#theme-advanced') {
        // This theme uses a template
        const headerNode = headerTemplateAdv.content.cloneNode(true);
        // We query the *template* first, then append
        headerNode.getElementById('store-avatar-img-adv').src = profileImageUrl;
        headerNode.getElementById('store-avatar-img-adv').alt = storeName;
        headerNode.getElementById('store-name-h1-adv').textContent = storeName;
        headerNode.getElementById('store-short-bio-p-adv').textContent = shortBio;
        
        // Phone/Location in template
        const phoneElAdv = headerNode.getElementById('store-phone-adv');
        if (storePhone) phoneElAdv.querySelector('span').textContent = storePhone;
        else phoneElAdv.style.display = 'none';
        
        const locationElAdv = headerNode.getElementById('store-location-adv');
        if (storeLocation) locationElAdv.querySelector('span').textContent = storeLocation;
        else locationElAdv.style.display = 'none';

        if (bannerUrl) {
            $('#store-header-adv').style.backgroundImage = `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(${bannerUrl})`;
        } else {
            $('#store-header-adv').style.backgroundColor = "var(--ko-primary)";
        }
        $('#store-header-adv').innerHTML = ''; 
        $('#store-header-adv').appendChild(headerNode);
    }
    
    // --- Populate the separate "About" section (for both themes) ---
    const descriptionSection = $(`#store-description-section-${state.activeThemePrefix.substring(7)}`);
    const descriptionBody = $(`#store-description-p-body-${state.activeThemePrefix.substring(7)}`);
    if (storeBio && descriptionSection && descriptionBody) {
        descriptionBody.textContent = storeBio;
        descriptionSection.style.display = 'block';
    }
}

function renderSocialLinks(links) {
    const actionsDiv = $(`#store-actions-div-${state.activeThemePrefix.substring(7)}`);
    const socialsDiv = $(`#store-socials-div-${state.activeThemePrefix.substring(7)}`);
    if (!actionsDiv || !socialsDiv) return;

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
    
    const shareBtn = $('#share-store-btn');
    if(shareBtn) {
        shareBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(window.location.href)
                .then(() => alert("Store link copied to clipboard!"))
                .catch(err => console.error("Copy failed:", err));
        });
    }
}

// --- +++++ NEW: Render Store Info (Hours & Map) +++++ ---
function renderStoreInfo(store) {
    const workingHours = store.workingHours || {};
    const location = store.location || 'No location specified.';
    
    const hoursList = $(`.hours-list`);
    const locationText = $(`.store-map-location-text`);

    // 1. Populate Location Text
    if (locationText) {
        locationText.textContent = location;
    }
    
    // 2. Populate Working Hours
    if (hoursList) {
        hoursList.innerHTML = ''; // Clear 'loading'
        let hasHours = false;
        DAYS_OF_WEEK.forEach(day => {
            const li = document.createElement('li');
            const dayName = DAY_NAMES[day];
            if (workingHours[day]) {
                li.innerHTML = `<strong>${dayName}</strong> <span>${workingHours[day].from} - ${workingHours[day].to}</span>`;
                hasHours = true;
            } else {
                li.innerHTML = `<strong>${dayName}</strong> <span>Closed</span>`;
            }
            hoursList.appendChild(li);
        });
        
        if (!hasHours) {
            hoursList.innerHTML = '<li>Working hours not specified.</li>';
        }
    }
    
    // 3. TODO: Initialize Google Map
    // const mapPlaceholder = $(`#map-placeholder`);
    // if (mapPlaceholder && location !== 'No location specified.') {
    //    mapPlaceholder.innerHTML = `[Initializing Google Map for: ${location}]`;
    //    // This is where you would call the Google Maps API
    // }
}

async function renderReviews(sellerId) {
    // Get elements from active theme
    const avgRatingSummary = $(`#average-rating-summary-${state.activeThemePrefix.substring(7)}`);
    const reviewsList = $(`#reviews-list-${state.activeThemePrefix.substring(7)}`);
    const loadingReviews = $(`#loading-reviews-${state.activeThemePrefix.substring(7)}`);

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
    const storeFooter = $(`#store-footer-${state.activeThemePrefix.substring(7)}`);
    if (!storeFooter) return;
    const footerText = footer.text || `© ${new Date().getFullYear()} ${document.title}. All rights reserved.`;
    const footerColor = footer.color || '#0A0A1F';
    storeFooter.style.backgroundColor = footerColor;
    storeFooter.innerHTML = `<div class="container"><p>${footerText}</p></div>`;
}

// =================================================================== //
//                                                                     //
//    YOUR *FULL* RENDERPRODUCTS FUNCTION (UNCHANGED LOGIC)            //
//    *UPDATED TO USE ACTIVE THEME SELECTORS* //
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
    // Use $all to query within the active theme
    const imagesToLoad = $all('img.lazy');
    imagesToLoad.forEach(img => lazyImageObserver.observe(img));
}

async function renderProducts(sellerId, sellerName, design) {
    // Get elements from active theme
    const sellerProductGrid = $(`#seller-product-grid-${state.activeThemePrefix.substring(7)}`);
    const listingsTitle = $(`#listings-title-${state.activeThemePrefix.substring(7)}`);
    const loadingProducts = $(`#loading-products-${state.activeThemePrefix.substring(7)}`);

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
//               *UPDATED TO USE $all* //
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
    // Use $all to query within the active theme
    const allProductCards = $all('.product-card-link');
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