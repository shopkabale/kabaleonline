// --- FIREBASE IMPORTS ---
import { db, auth } from "../firebase.js"; 
import { collection, query, where, orderBy, limit, getDocs, doc, setDoc, deleteDoc, serverTimestamp, onSnapshot } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";

// ==================================================== //
//               GLOBAL STATE & HELPERS                 //
// ==================================================== //

// === NEW ===
let msnry = null; // Global Masonry instance

/**
 * Creates an optimized and transformed Cloudinary URL.
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

// Service categories (used for URL logic)
const serviceCategories = {
    "Tutoring & Academics": "Tutoring & Academics",
    "Design & Creative": "Design & Creative",
    "Writing & Translation": "Writing & Translation",
    "Tech & Programming": "Tech & Programming",
    "Repairs & Technicians": "Repairs & Technicians",
    "Events & Photography": "Events & Photography",
    "Health & Wellness": "Health & Wellness",
    "Home & Errands": "Home & Errands",
    "Other Services": "Other Services"
};

// --- DOM ELEMENT REFERENCES ---
const productGrid = document.getElementById("product-grid");
const listingsTitle = document.getElementById("listings-title");
const dealsSection = document.getElementById("deals-section");
const dealsGrid = document.getElementById("deals-grid");
const saveOnMoreSection = document.getElementById("save-on-more-section");
const saveOnMoreGrid = document.getElementById("save-on-more-grid");
const sponsoredSection = document.getElementById("sponsored-section");
const sponsoredGrid = document.getElementById("sponsored-grid");
const searchInput = document.getElementById("search-input");
const searchBtn = document.getElementById("search-btn");
const mobileNav = document.querySelector(".mobile-nav");
const categoryGrid = document.querySelector(".category-grid");
const imageCategoryGrid = document.querySelector(".image-category-grid"); 
const loadMoreContainer = document.getElementById("load-more-container");
const loadMoreBtn = document.getElementById("load-more-btn");
const backToTopBtn = document.getElementById("back-to-top-btn");

// --- NEW DOM REFERENCES ---
const lastViewedSection = document.getElementById("last-viewed-section");
const lastViewedGrid = document.getElementById("last-viewed-grid");
const madeForYouSection = document.getElementById("made-for-you-section");
const madeForYouGrid = document.getElementById("made-for-you-grid");
const madeForYouTitle = document.querySelector("#made-for-you-section h2");

// --- APPLICATION STATE ---
const state = {
    currentPage: 0,
    totalPages: 1,
    isFetching: false,
    searchTerm: '',
    filters: { type: '', category: '' },
    currentUser: null,
    wishlist: new Set()
};

// --- HELPER & RENDER FUNCTIONS ---

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

const lazyImageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            img.onload = () => {
                img.classList.add('loaded');
                // === MODIFIED ===
                // Tell Masonry to re-layout *after* an image has loaded
                // This fixes items overlapping
                if (msnry && img.closest('#product-grid')) {
                    msnry.layout();
                }
            };
            img.onerror = () => { img.src = 'https://placehold.co/250x250/e0e0e0/777?text=Error'; img.classList.add('loaded'); };
            observer.unobserve(img);
        }
    });
}, { rootMargin: "0px 0px 200px 0px" });

function observeLazyImages() {
    const imagesToLoad = document.querySelectorAll('img.lazy');
    imagesToLoad.forEach(img => lazyImageObserver.observe(img));
}

// === MODIFIED ===
// This function is now aware of Masonry
function renderProducts(gridElement, products, append = false) {
    if (!gridElement) return;
    
    if (!append) {
        // === MODIFIED ===
        // If it's the main grid and Masonry exists, destroy it first
        if (gridElement.id === 'product-grid' && msnry) {
            msnry.destroy();
            msnry = null;
        }
        gridElement.innerHTML = "";
    }
    
    if (products.length === 0) {
        if (!append) {
            if (gridElement.id === 'product-grid') {
                gridElement.innerHTML = `<p class="loading-indicator">No listings found matching your criteria.</p>`;
            } else {
                const section = gridElement.closest('.carousel-section');
                if (section) section.style.display = 'none';
            }
        }
        return;
    }

    const section = gridElement.closest('.carousel-section');
    if (section) section.style.display = 'block';

    const fragment = document.createDocumentFragment();
    products.forEach(product => {
        const thumbnailUrl = getCloudinaryTransformedUrl(product.imageUrls?.[0], 'thumbnail');
        const placeholderUrl = getCloudinaryTransformedUrl(product.imageUrls?.[0], 'placeholder');
        
        const verifiedTextHTML = (product.sellerBadges?.includes('verified') || product.sellerIsVerified) ? `<p class="verified-text">✓ Verified Seller</p>` : '';
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
            ${product.sellerName ? `<p class="seller-name">by ${product.sellerName}</p>` : ''} 
            ${verifiedTextHTML}
          </div>
        `;
        
        fragment.appendChild(productLink);
    });

    // === NEW MASONRY-AWARE RENDER LOGIC ===
    const newItems = Array.from(fragment.children);

    // 1. Append the new items to the grid
    gridElement.appendChild(fragment);
    
    // 2. Observe and initialize buttons
    observeLazyImages();
    initializeWishlistButtons();

    // 3. ONLY run Masonry on the main product-grid
    if (gridElement.id === 'product-grid' && typeof Masonry !== 'undefined') {
        if (append) {
            // If we are "Loading More"
            if (msnry) {
                msnry.appended(newItems); // Tell Masonry about new items
                msnry.layout();         // Re-run the layout
            }
        } else {
            // If this is a fresh load (not appending)
            // Use setTimeout to ensure images start loading,
            // which helps Masonry calculate heights.
            setTimeout(() => {
                msnry = new Masonry(gridElement, {
                    itemSelector: '.product-card-link',
                    percentPosition: true
                });
            }, 100); // 100ms delay is usually perfect
        }
    }
    // === END NEW MASONRY LOGIC ===
}

// --- DATA FETCHING FUNCTIONS ---
async function fetchAndRenderProducts(append = false) {
    if (state.isFetching) return;
    state.isFetching = true;

    if (!append) {
        // === MODIFIED ===
        // Skeletons don't work well with Masonry, so just clear it
        if (productGrid) productGrid.innerHTML = '';
        // renderSkeletonLoaders(productGrid, 12);
    } else {
        loadMoreBtn.disabled = true;
        loadMoreBtn.innerHTML = `<i class="fa-solid fa-spinner loading-icon"></i> <span>LOADING...</span>`;
    }

    updateLoadMoreUI();
    updateListingsTitle();

    try {
        const params = new URLSearchParams({ page: state.currentPage });
        if (state.searchTerm) params.append('searchTerm', state.searchTerm);
        
        if (state.filters.type) {
            params.append('type', state.filters.type);
        } else if (state.filters.category) {
            params.append('category', state.filters.category);
        }

        const response = await fetch(`/.netlify/functions/search?${params.toString()}`);
        if (!response.ok) throw new Error(`Server error: ${response.statusText}`);

        const { products, totalPages } = await response.json();
        state.totalPages = totalPages;
        renderProducts(productGrid, products, append);
    } catch (error) {
        console.error("Error fetching products:", error);
        productGrid.innerHTML = `<p class="loading-indicator">Could not load listings. Please try again later.</p>`;
    } finally {
        state.isFetching = false;
        if (append) {
            loadMoreBtn.disabled = false;
            loadMoreBtn.innerHTML = `<i class="fa-solid fa-rotate"></i> <span>LOAD MORE</span>`;
        }
        updateLoadMoreUI();
    }
}

async function fetchCarouselProducts(q, gridId, sectionId) {
    const gridElement = document.getElementById(gridId);
    const sectionElement = document.getElementById(sectionId);
    
    if (!gridElement || !sectionElement) return;

    renderSkeletonLoaders(gridElement, 5);

    try {
        const snapshot = await getDocs(q);
        
        const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const wrapper = gridElement.closest('.deals-carousel-wrapper'); 
        if (wrapper && !wrapper.classList.contains('expanded')) {
            const centerLimit = 8; 
            if (products.length <= centerLimit) {
                wrapper.classList.add('center-items');
            }
        }

        renderProducts(gridElement, products);

    } catch (error) {
        console.error(`Error fetching carousel for ${gridId}:`, error);
        sectionElement.style.display = 'none';
    }
}

function fetchDeals() {
    const dealsQuery = query(collection(db, 'products'), where('isDeal', '==', true), where('isSold', '==', false), orderBy('createdAt', 'desc'), limit(8));
    return fetchCarouselProducts(dealsQuery, 'deals-grid', 'deals-section');
}

function fetchSaveOnMore() {
    const q = query(collection(db, 'products'), where('isSaveOnMore', '==', true), where('isSold', '==', false), orderBy('createdAt', 'desc'), limit(8));
    return fetchCarouselProducts(q, 'save-on-more-grid', 'save-on-more-section');
}

function fetchSponsoredItems() {
    const q = query(collection(db, 'products'), where('isSponsored', '==', true), where('isSold', '==', false), orderBy('createdAt', 'desc'), limit(8));
    return fetchCarouselProducts(q, 'sponsored-grid', 'sponsored-section');
}

// ==========================================
// === NEW FUNCTIONS FOR NEW SECTIONS =======
// ==========================================

function displayLastViewed() {
    try {
        const viewed = JSON.parse(localStorage.getItem('lastViewed')) || [];
        const initialView = viewed.slice(0, 8); 
        renderProducts(lastViewedGrid, initialView, false);
    } catch (e) {
        console.error("Error displaying last viewed:", e);
        if(lastViewedSection) lastViewedSection.style.display = 'none';
    }
}

// --- THIS IS THE FULLY CORRECTED FUNCTION ---
async function displayMadeForYou() {
    let title = "✨ Recommended for You";
    if (madeForYouTitle) madeForYouTitle.textContent = title;

    // Show skeletons while we fetch
    renderSkeletonLoaders(madeForYouGrid, 5);
    
    try {
        // 1. Get the recency-ordered list of unique categories
        const interests = JSON.parse(localStorage.getItem('userInterests')) || [];
        // 2. Just take the top 3 most recent unique categories
        const topCategories = interests.slice(0, 3);

        if (topCategories.length === 0) {
            if (madeForYouSection) madeForYouSection.style.display = 'none';
            return;
        }

        // 3. Define how many items to pull from each category for a good mix
        // (e.g., if 3 categories, pull [3, 3, 2] items = 8 total)
        const limits = { 1: [8], 2: [4, 4], 3: [3, 3, 2] };
        const itemsToFetch = limits[topCategories.length];

        // 4. Create an array of query promises (one for each category)
        const queryPromises = topCategories.map((category, index) => {
            const q = query(collection(db, 'products'),
                where('category', '==', category),
                where('isSold', '==', false),
                orderBy('createdAt', 'desc'), // You could also try 'random' here
                limit(itemsToFetch[index])
            );
            return getDocs(q);
        });

        // 5. Run all queries in parallel
        const snapshots = await Promise.all(queryPromises);

        // 6. Combine the results
        let combinedProducts = [];
        snapshots.forEach(snapshot => {
            snapshot.docs.forEach(doc => {
                combinedProducts.push({ id: doc.id, ...doc.data() });
            });
        });

        // 7. Shuffle the combined array for a true mix
        const mixedProducts = combinedProducts.sort(() => 0.5 - Math.random());

        // 8. Update title and render
        if (topCategories.length === 1) {
            title = `✨ Because you like ${topCategories[0]}`;
        }
        if (madeForYouTitle) madeForYouTitle.textContent = title;
        
        // 9. Render directly (this function also handles showing the section)
        renderProducts(madeForYouGrid, mixedProducts);

    } catch (e) {
        console.error("Error displaying 'Made for You':", e);
        if (madeForYouSection) madeForYouSection.style.display = 'none';
    }
}
// --- END OF UPDATED FUNCTION ---


// ==========================================
// === END NEW FUNCTIONS ====================
// ==========================================


// --- UI & EVENT HANDLERS ---
function updateLoadMoreUI() {
    if (loadMoreContainer) {
        if (state.totalPages > 1 && state.currentPage < state.totalPages - 1) {
            loadMoreContainer.style.display = 'block';
            loadMoreBtn.disabled = state.isFetching;
        } else {
            loadMoreContainer.style.display = 'none';
        }
    }
}

function updateListingsTitle() {
    if (!listingsTitle) return; 
    let title = "Recent Items";
    
    if (state.searchTerm) {
        title = `Results for "${state.searchTerm}"`;
    } else if (state.filters.type === 'service') {
        title = "All Services";
    } else if (state.filters.category) {
        title = state.filters.category;
    } else if (state.filters.type === 'rent') {
        title = "All Rentals";
    }
    
    listingsTitle.textContent = title;
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
            await setDoc(wishlistRef, { name: button.dataset.productName, price: parseFloat(button.dataset.productPrice) || 0, imageUrl: button.dataset.productImage || '', addedAt: serverTimestamp() });
            state.wishlist.add(productId);
            updateWishlistButtonUI(button, true);
        }
    } catch (error) { console.error("Error updating wishlist:", error); } finally { button.disabled = false; }
}

function updateWishlistButtonUI(button, isInWishlist) {
    const icon = button.querySelector('i');
    if (isInWishlist) {
        button.classList.add('active'); icon.classList.remove('fa-regular'); icon.classList.add('fa-solid');
    } else {
        button.classList.remove('active'); icon.classList.remove('fa-solid'); icon.classList.add('fa-regular');
    }
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

async function fetchUserWishlist() {
    if (!state.currentUser) { state.wishlist.clear(); return; }
    try {
        const wishlistCol = collection(db, 'users', state.currentUser.uid, 'wishlist');
        const wishlistSnapshot = await getDocs(wishlistCol);
        const wishlistIds = wishlistSnapshot.docs.map(doc => doc.id);
        state.wishlist = new Set(wishlistIds);
    } catch (error) { console.error("Could not fetch user wishlist:", error); }
}

function listenForCartUpdates(userId) {
    const cartBadges = document.querySelectorAll('.cart-badge');
    if (!userId) { cartBadges.forEach(badge => badge.classList.remove('visible')); return; }
    const cartRef = collection(db, 'users', userId, 'cart');
    onSnapshot(cartRef, (snapshot) => {
        const count = snapshot.size;
        cartBadges.forEach(badge => {
            badge.textContent = count;
            badge.classList.toggle('visible', true);
            badge.classList.toggle('is-zero', count === 0);
        });
    });
}

function handleSearch() {
    const term = searchInput.value.trim();
    state.searchTerm = term;
    state.currentPage = 0;
    state.filters.type = '';
    state.filters.category = '';
    document.getElementById('listings-title')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    fetchAndRenderProducts(false);
}

function handleFilterLinkClick(event) {
    const link = event.target.closest('a.category-item, a.image-category-card');
    if (!link) return;

    event.preventDefault(); 
    const url = new URL(link.href);
    const type = url.searchParams.get('type') || '';
    const category = url.searchParams.get('category') || '';
    
    if (type === 'service') {
        state.filters.type = 'service';
        state.filters.category = '';
    } else if (category) {
        state.filters.type = '';
        state.filters.category = category;
    } else {
        state.filters.type = '';
        state.filters.category = '';
    }
    
    state.currentPage = 0;
    state.searchTerm = '';
    searchInput.value = '';
    document.getElementById('listings-title')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    fetchAndRenderProducts(false);
    
    if (mobileNav) { 
        mobileNav.classList.remove('active'); 
        document.querySelector('.mobile-nav-overlay')?.classList.remove('active'); 
    }
}

function initializeStateFromURL() {
    const params = new URLSearchParams(window.location.search);
    const category = params.get('category');
    const type = params.get('type');
    
    state.searchTerm = params.get('q') || '';
    if (state.searchTerm) searchInput.value = state.searchTerm;

    if (type === 'service') {
        state.filters.type = 'service';
        state.filters.category = ''; 
    } 
    else if (category === 'Services') { 
        state.filters.type = 'service';
        state.filters.category = '';
    } 
    else if (category) {
        state.filters.type = ''; 
        state.filters.category = category;
    } 
    else if (type === 'rent') {
        state.filters.type = 'rent';
        state.filters.category = '';
    }
    else {
        state.filters.type = '';
        state.filters.category = '';
    }
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {

    function loadPageContent() {
        displayLastViewed();
        displayMadeForYou();
        fetchDeals();
        fetchSaveOnMore();
        fetchSponsoredItems();
        initializeStateFromURL();
        fetchAndRenderProducts();
    }

    onAuthStateChanged(auth, async (user) => {
        state.currentUser = user;
        await fetchUserWishlist();
        listenForCartUpdates(user ? user.uid : null);
        loadPageContent();
    }, (error) => {
        console.error("Firebase auth state error:", error);
        state.currentUser = null;
        state.wishlist.clear();
        listenForCartUpdates(null);
        loadPageContent();
    });

    if(searchBtn) searchBtn.addEventListener('click', handleSearch);
    if(searchInput) searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearch(); } });
    if(mobileNav) mobileNav.addEventListener('click', handleFilterLinkClick);
    if(categoryGrid) categoryGrid.addEventListener('click', handleFilterLinkClick);
    if(imageCategoryGrid) imageCategoryGrid.addEventListener('click', handleFilterLinkClick);

    if(loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            if (state.currentPage < state.totalPages - 1) {
                state.currentPage++;
                fetchAndRenderProducts(true);
            }
        });
    }

    if(backToTopBtn) {
        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        window.addEventListener('scroll', () => {
            if (window.scrollY > 400 && window.innerWidth < 1024) { // === MODIFIED ===
                backToTopBtn.classList.add('visible');
            } else if (window.scrollY > 400 && window.innerWidth >= 1024) {
                backToTopBtn.classList.add('visible');
            } else {
                backToTopBtn.classList.remove('visible');
            }
        });
    }

    // === NEW ===
    // --- SMART BOTTOM NAV HIDING LOGIC ---
    const bottomNav = document.querySelector('.bottom-nav');
    const openChatButton = document.getElementById('open-chat-button');

    if (bottomNav) {
        let lastScrollY = window.scrollY;

        window.addEventListener('scroll', () => {
            // Only on mobile
            if (window.innerWidth < 1024) { 
                const currentScrollY = window.scrollY;
                
                if (currentScrollY > lastScrollY && currentScrollY > 150) {
                    // Scrolling Down
                    bottomNav.classList.add('bottom-nav--hidden');
                    if(openChatButton) openChatButton.classList.add('bottom-nav--hidden');
                    // Hide back-to-top button only when scrolling down
                    if(backToTopBtn) backToTopBtn.classList.remove('visible');
                
                } else if (currentScrollY < lastScrollY) {
                    // Scrolling Up
                    bottomNav.classList.remove('bottom-nav--hidden');
                    if(openChatButton) openChatButton.classList.remove('bottom-nav--hidden');
                    // Show back-to-top button if high enough
                    if (currentScrollY > 400) {
                        if(backToTopBtn) backToTopBtn.classList.add('visible');
                    }
                }
                lastScrollY = currentScrollY <= 0 ? 0 : currentScrollY; // Handle bounce
            }
        });
    }
    // === END NEW ===
});

// --- "SEE MORE" EXPAND LOGIC (UPDATED) ---
document.body.addEventListener('click', async (e) => {
    const seeMoreBtn = e.target.closest('.see-more-btn');
    if (!seeMoreBtn) return;
    
    const sectionName = seeMoreBtn.dataset.section;
    if (!sectionName || seeMoreBtn.dataset.expanded === 'true') {
        return; 
    }

    let grid, wrapper;

    // --- 1. Find the correct grid and wrapper ---
    if (sectionName === 'last-viewed') {
        grid = document.getElementById('last-viewed-grid');
    } else if (sectionName === 'made-for-you') {
        grid = document.getElementById('made-for-you-grid');
    } else if (sectionName === 'deals') {
        grid = document.getElementById('deals-grid');
    } else if (sectionName === 'sponsored') {
        grid = document.getElementById('sponsored-grid');
    } else if (sectionName === 'save') {
        grid = document.getElementById('save-on-more-grid');
    } else {
        return;
    }

    if (!grid) return;
    wrapper = grid.closest('.deals-carousel-wrapper');
    if (!wrapper) return;

    // --- 2. Start Expansion ---
    seeMoreBtn.disabled = true;
    seeMoreBtn.textContent = 'Loading...';

    try {
        let products = [];

        if (sectionName === 'last-viewed') {
            // --- 3a. Handle localStorage Expansion ---
            products = JSON.parse(localStorage.getItem('lastViewed')) || [];
        
        } else {
            // --- 3b. Handle Firestore Expansion ---
            let q;
            
            // --- THIS LOGIC IS NOW CORRECTED FOR 'made-for-you' ---
            if (sectionName === 'made-for-you') {
                const interests = JSON.parse(localStorage.getItem('userInterests')) || [];
                const topCategories = interests.slice(0, 3); 

                if (topCategories.length === 0) {
                     throw new Error('No user interests found');
                }
                
                // For "See More," we'll just use the simpler `where 'in'` query.
                // It will show *all* items from those categories, ordered by newness,
                // which is correct for an "expansion" view.
                q = query(collection(db, 'products'), 
                    where('category', 'in', topCategories), 
                    where('isSold', '==', false), 
                    orderBy('createdAt', 'desc'), 
                    limit(20)); // Expanded limit
            
            // --- Other sections remain the same ---
            } else if (sectionName === 'deals') {
                q = query(collection(db, 'products'), where('isDeal', '==',true), where('isSold', '==', false), orderBy('createdAt', 'desc'), limit(20));
            } else if (sectionName === 'sponsored') {
                q = query(collection(db, 'products'), where('isSponsored', '==', true), where('isSold', '==', false), orderBy('createdAt', 'desc'), limit(20));
            } else if (sectionName === 'save') {
                q = query(collection(db, 'products'), where('isSaveOnMore', '==', true), where('isSold', '==', false), orderBy('createdAt', 'desc'), limit(20));
            }

            const snapshot = await getDocs(q);
            products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }

        // --- 4. Render and Finalize UI ---
        if (products && products.length > 0) {
            renderProducts(grid, products); 
            wrapper.classList.add('expanded');
            grid.classList.remove('deals-grid'); 
            grid.classList.add('product-grid');  
            
            seeMoreBtn.textContent = 'Showing All';
            seeMoreBtn.dataset.expanded = 'true';
        } else {
            seeMoreBtn.textContent = 'No More Items';
            seeMoreBtn.dataset.expanded = 'true';
        }

    } catch (error) {
        console.error(`Error expanding section ${sectionName}:`, error);
        seeMoreBtn.textContent = 'Error';
        seeMoreBtn.disabled = false; 
    }
});