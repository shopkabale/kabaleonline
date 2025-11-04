/**
 * Creates an optimized and transformed Cloudinary URL.
 * @param {string} url The original Cloudinary URL.
 * @param {'thumbnail'|'full'|'placeholder'} type The desired transformation type.
 * @returns {string} The new, transformed URL.
 */
function getCloudinaryTransformedUrl(url, type) {
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

// --- FIREBASE IMPORTS ---
import { db, auth } from "./firebase.js";
import { collection, query, where, orderBy, limit, getDocs, doc, setDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { onSnapshot } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

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
const imageCategoryGrid = document.querySelector(".image-category-grid"); // Added reference for image grid
const modal = document.getElementById('custom-modal');
const loadMoreContainer = document.getElementById("load-more-container");
const loadMoreBtn = document.getElementById("load-more-btn");
const backToTopBtn = document.getElementById("back-to-top-btn");

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

function showModal({ icon, title, message, theme = 'info', buttons }) {
    if (!modal) return;
    const modalIcon = document.getElementById('modal-icon');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    const modalButtons = document.getElementById('modal-buttons');
    modal.className = `modal-overlay modal-theme-${theme}`;
    modalIcon.innerHTML = icon;
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    modalButtons.innerHTML = '';
    buttons.forEach(btnInfo => {
        const button = document.createElement('button');
        button.textContent = btnInfo.text;
        button.className = `modal-btn modal-btn-${btnInfo.class}`;
        button.addEventListener('click', btnInfo.onClick);
        modalButtons.appendChild(button);
    });
    modal.classList.add('show');
}

function hideModal() {
    if (modal) modal.classList.remove('show');
}

function renderSkeletonLoaders(container, count) {
    if (!container) return; // Add guard clause
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

// =================================================================
// === MODIFIED RENDERPRODUCTS FUNCTION ============================
// =================================================================
function renderProducts(gridElement, products, append = false) {
    if (!gridElement) return; // Add guard clause
    
    if (!append) {
        gridElement.innerHTML = "";
    }
    if (products.length === 0 && !append) {
        gridElement.innerHTML = `<p class="loading-indicator">No listings found matching your criteria.</p>`;
        return;
    }

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
        
        // --- NEW: Service-Aware Logic ---
        let priceHTML = '';
        let locationHTML = '';
        let stockStatusHTML = '';

        if (product.category === 'Services') {
            // --- Service Card Logic ---
            priceHTML = `<p class="price price-service">UGX ${product.price ? product.price.toLocaleString() : "N/A"} 
                ${product.service_duration ? `<span>/ ${product.service_duration}</span>` : ''}
            </p>`;

            if (product.service_location_type) {
                const icon = product.service_location_type === 'Online' ? 'fa-solid fa-wifi' : 'fa-solid fa-person-walking';
                locationHTML = `<p class="location-name"><i class="${icon}"></i> ${product.service_location_type}</p>`;
            }
            stockStatusHTML = ''; // Services don't have stock
        } else {
            // --- Regular Product Card Logic ---
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
        }
        // --- END NEW LOGIC ---
        
        // --- Build Tags for Condition and Listing Type ---
        let tagsHTML = '';
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
        const tagsContainerHTML = tagsHTML ? `<div class="product-tags">${tagsHTML}</div>` : '';

        const productLink = document.createElement("a");
        productLink.href = `/product.html?id=${product.id}`;
        productLink.className = "product-card-link";
        if (isActuallySold) {
            productLink.style.pointerEvents = 'none';
            productLink.style.cursor = 'default';
        }

        // --- UPDATED innerHTML with dynamic variables ---
        productLink.innerHTML = `
          <div class="product-card ${soldClass}">
             ${soldOverlayHTML}
             ${tagsContainerHTML} 
             <button class="wishlist-btn ${wishlistClass}" data-product-id="${product.id}" data-product-name="${product.name}" data-product-price="${product.price}" data-product-image="${product.imageUrls?.[0] || ''}" aria-label="Add to wishlist">
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
        // --- END UPDATED innerHTML ---
        
        fragment.appendChild(productLink);
    });

    gridElement.appendChild(fragment);
    observeLazyImages();
    initializeWishlistButtons();
}
// =================================================================
// === END MODIFIED RENDERPRODUCTS FUNCTION ========================
// =================================================================


// --- DATA FETCHING FUNCTIONS ---
async function fetchAndRenderProducts(append = false) {
    if (state.isFetching) return;
    state.isFetching = true;

    if (!append) {
        renderSkeletonLoaders(productGrid, 12);
    } else {
        loadMoreBtn.disabled = true;
        loadMoreBtn.innerHTML = `<i class="fa-solid fa-spinner loading-icon"></i> <span>LOADING...</span>`;
    }

    updateLoadMoreUI();
    updateListingsTitle();

    try {
        const params = new URLSearchParams({ page: state.currentPage });
        if (state.searchTerm) params.append('searchTerm', state.searchTerm);
        if (state.filters.type) params.append('type', state.filters.type);
        if (state.filters.category) params.append('category', state.filters.category);

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

// --- NEW: GENERIC FUNCTION TO FETCH CAROUSEL PRODUCTS ---
/**
 * Fetches products for carousels, renders them, and applies centering logic.
 * @param {Query} q - The Firestore query to execute.
 * @param {string} gridId - The ID of the grid element to render into.
 * @param {string} sectionId - The ID of the section element to show/hide.
 */
async function fetchCarouselProducts(q, gridId, sectionId) {
    const gridElement = document.getElementById(gridId);
    const sectionElement = document.getElementById(sectionId);
    
    if (!gridElement || !sectionElement) return;

    renderSkeletonLoaders(gridElement, 5);
    sectionElement.style.display = 'block';

    try {
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            sectionElement.style.display = 'none';
            return;
        }
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

// --- REFACTORED: Carousel fetch functions now use the generic function ---
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
// --- END OF REFACTORED SECTION ---


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
    if (!listingsTitle) return; // Add guard clause
    let title = "Recent Items";
    if (state.filters.category) { title = state.filters.category; }
    else if (state.filters.type) { title = `${state.filters.type.charAt(0).toUpperCase() + state.filters.type.slice(1)}s`; }
    if (state.searchTerm) { title = `Results for "${state.searchTerm}"`; }
    listingsTitle.textContent = title;
}

async function handleWishlistClick(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!state.currentUser) {
        showModal({
            icon: '🔒', title: 'Login Required', message: 'You need an account to save items.',
            buttons: [ { text: 'Cancel', class: 'secondary', onClick: hideModal }, { text: 'Log In', class: 'primary', onClick: () => { window.location.href = '/login/'; } } ]
        });
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

// --- THIS IS THE FULLY UPDATED FUNCTION ---
function handleFilterLinkClick(event) {
    const link = event.target.closest('a.category-item, a.image-category-card');
    if (!link) return;

    // The 'service-link' check has been REMOVED.
    
    event.preventDefault(); 
    const url = new URL(link.href);
    const type = url.searchParams.get('type') || '';
    const category = url.searchParams.get('category') || '';
    
    state.filters.type = type;
    state.filters.category = category;
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
// --- END UPDATED FUNCTION ---

function initializeStateFromURL() {
    const params = new URLSearchParams(window.location.search);
    state.filters.type = params.get('type') || '';
    state.filters.category = params.get('category') || '';
    state.searchTerm = params.get('q') || '';
    if (state.searchTerm) searchInput.value = state.searchTerm;
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {

    function loadPageContent() {
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

    if (modal) {
        modal.addEventListener('click', (event) => { if (event.target === modal) hideModal(); });
    }

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
            if (window.scrollY > 400) {
                backToTopBtn.classList.add('visible');
            } else {
                backToTopBtn.classList.remove('visible');
            }
        });
    }
});

// --- "SEE MORE" EXPAND LOGIC (FROM HOME PAGE) ---
document.body.addEventListener('click', async (e) => {
    const seeMoreBtn = e.target.closest('.see-more-btn');
    if (!seeMoreBtn) return;
    
    const sectionName = seeMoreBtn.dataset.section;
    if (!sectionName) return; 

    let grid, wrapper;
    if (sectionName === 'deals') {
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

    if (seeMoreBtn.dataset.expanded === 'true') {
        return; 
    }
    
    seeMoreBtn.disabled = true;
    seeMoreBtn.textContent = 'Loading...';

    try {
        let q;
        if (sectionName === 'deals') {
            q = query(collection(db, 'products'), where('isDeal', '==', true), where('isSold', '==', false), orderBy('createdAt', 'desc'), limit(20));
        } else if (sectionName === 'sponsored') {
            q = query(collection(db, 'products'), where('isSponsored', '==', true), where('isSold', '==', false), orderBy('createdAt', 'desc'), limit(20));
        } else if (sectionName === 'save') {
            q = query(collection(db, 'products'), where('isSaveOnMore', '==', true), where('isSold', '==', false), orderBy('createdAt', 'desc'), limit(20));
        }

        const snapshot = await getDocs(q);
        const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

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