/**
 * Creates an optimized and transformed Cloudinary URL.
 * @param {string} url The original Cloudinary URL.
 *@param {'thumbnail'|'full'|'placeholder'} type The desired transformation type.
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
const imageCategoryGrid = document.querySelector(".image-category-grid");
const modal = document.getElementById('custom-modal');
const loadMoreContainer = document.getElementById("load-more-container");
const loadMoreBtn = document.getElementById("load-more-btn");
const backToTopBtn = document.getElementById("back-to-top-btn");

// --- (NEW) REFERENCES FOR SORTING & FILTERING ---
const sortBySelect = document.getElementById("sort-by");
const filterBtn = document.getElementById("filter-btn");
const filterModalOverlay = document.getElementById("filter-modal-overlay");
const filterModalContent = document.getElementById("filter-modal-content");
const filterModalCloseBtn = document.getElementById("filter-modal-close");
const filterApplyBtn = document.getElementById("filter-apply-btn");
const filterClearBtn = document.getElementById("filter-clear-btn");
const filterMinPrice = document.getElementById("filter-min-price");
const filterMaxPrice = document.getElementById("filter-max-price");


// --- APPLICATION STATE ---
const state = {
    currentPage: 0,
    totalPages: 1,
    isFetching: false,
    searchTerm: '',
    filters: {
        type: '',
        category: '',
        sortBy: 'createdAt_desc', // (NEW)
        condition: '',           // (NEW)
        minPrice: '',            // (NEW)
        maxPrice: '',            // (NEW)
        location: ''             // (NEW)
    },
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

// --- (NEW) FILTER MODAL FUNCTIONS ---
function openFilterModal() {
    if (filterModalOverlay) filterModalOverlay.classList.add('active');
}
function closeFilterModal() {
    if (filterModalOverlay) filterModalOverlay.classList.remove('active');
}

function renderSkeletonLoaders(container, count) {
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

// --- (UPDATED) RENDERPRODUCTS ---
// This function now includes the logic for Condition, Location, and Seller Name
function renderProducts(gridElement, products, append = false) {
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
        
        let stockStatusHTML = '';
        if (isActuallySold) {
            stockStatusHTML = `<p class="stock-info sold-out">Sold Out</p>`;
        } else if (product.quantity > 5) {
            stockStatusHTML = `<p class="stock-info in-stock">In Stock</p>`;
        } else if (product.quantity > 0 && product.quantity <= 5) {
            stockStatusHTML = `<p class="stock-info low-stock">Only ${product.quantity} left!</p>`;
        }

        // --- (RE-ADDED) Condition Banner Logic ---
        let conditionBannerHTML = '';
        if (product.condition && !isActuallySold) { // Only show if 'condition' exists
            const conditionText = product.condition.charAt(0).toUpperCase() + product.condition.slice(1).toLowerCase();
            const conditionClass = `is-${conditionText.toLowerCase().replace(' ', '-')}`;
            conditionBannerHTML = `<div class="condition-banner ${conditionClass}">${conditionText}</div>`;
        }

        // --- (RE-ADDED) Seller Info Logic ---
        let sellerInfoHTML = '';
        if (product.sellerName) {
            sellerInfoHTML = `<div class="seller-info"><i class="fa-regular fa-user"></i>${product.sellerName}</div>`;
        }

        // --- (RE-ADDED) Location Info Logic ---
        let locationInfoHTML = '';
        if (product.location) { 
            locationInfoHTML = `<div class="product-location"><i class="fa-solid fa-location-dot"></i> ${product.location}</div>`;
        }


        const productLink = document.createElement("a");
        productLink.href = `/product.html?id=${product.id}`;
        productLink.className = "product-card-link";
        if (isActuallySold) {
            productLink.style.pointerEvents = 'none';
            productLink.style.cursor = 'default';
        }

        // --- (UPDATED) Inner HTML to include new elements ---
        productLink.innerHTML = `
          <div class="product-card ${soldClass}">
             ${soldOverlayHTML}
             ${conditionBannerHTML} <button class="wishlist-btn ${wishlistClass}" data-product-id="${product.id}" data-product-name="${product.name}" data-product-price="${product.price}" data-product-image="${product.imageUrls?.[0] || ''}" aria-label="Add to wishlist">
                <i class="${wishlistIcon} fa-heart"></i>
            </button>
            <img src="${placeholderUrl}" data-src="${thumbnailUrl}" alt="${product.name}" class="lazy">
            <h3>${product.name}</h3>
            ${stockStatusHTML}
            <p class="price">UGX ${product.price ? product.price.toLocaleString() : "N/A"}</p>
            ${locationInfoHTML} ${sellerInfoHTML} ${verifiedTextHTML}
          </div>
        `;
        fragment.appendChild(productLink);
    });

    gridElement.appendChild(fragment);
    observeLazyImages();
    initializeWishlistButtons();
}

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
        
        // Add all filters from state to params
        if (state.filters.sortBy) params.append('sortBy', state.filters.sortBy);
        if (state.filters.type) params.append('type', state.filters.type);
        if (state.filters.category) params.append('category', state.filters.category);
        if (state.filters.condition) params.append('condition', state.filters.condition);
        if (state.filters.location) params.append('location', state.filters.location);
        if (state.filters.minPrice) params.append('minPrice', state.filters.minPrice);
        if (state.filters.maxPrice) params.append('maxPrice', state.filters.maxPrice);

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

async function fetchDeals() {
    if (!dealsGrid || !dealsSection) return;
    renderSkeletonLoaders(dealsGrid, 5);
    dealsSection.style.display = 'block';
    try {
        const dealsQuery = query(collection(db, 'products'), where('isDeal', '==', true), where('isSold', '==', false), orderBy('createdAt', 'desc'), limit(8));
        const snapshot = await getDocs(dealsQuery);
        if (snapshot.empty) { dealsSection.style.display = 'none'; return; }
        const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderProducts(dealsGrid, products);
    } catch (error) { console.error("Error fetching deals:", error); dealsSection.style.display = 'none'; }
}

async function fetchSaveOnMore() {
    if (!saveOnMoreGrid || !saveOnMoreSection) return;
    renderSkeletonLoaders(saveOnMoreGrid, 5);
    saveOnMoreSection.style.display = 'block';
    try {
        const q = query(collection(db, 'products'), where('isSaveOnMore', '==', true), where('isSold', '==', false), orderBy('createdAt', 'desc'), limit(8));
        const snapshot = await getDocs(q);
        if (snapshot.empty) { saveOnMoreSection.style.display = 'none'; return; }
        const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderProducts(saveOnMoreGrid, products);
    } catch (error) { console.error("Error fetching Save on More:", error); saveOnMoreSection.style.display = 'none'; }
}

async function fetchSponsoredItems() {
    if (!sponsoredGrid || !sponsoredSection) return;
    renderSkeletonLoaders(sponsoredGrid, 5);
    sponsoredSection.style.display = 'block';
    try {
        const q = query(collection(db, 'products'), where('isSponsored', '==', true), where('isSold', '==', false), orderBy('createdAt', 'desc'), limit(8));
        const snapshot = await getDocs(q);
        if (snapshot.empty) { sponsoredSection.style.display = 'none'; return; }
        const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderProducts(sponsoredGrid, products);
    } catch (error) { console.error("Error fetching Sponsored Items:", error); sponsoredSection.style.display = 'none'; }
}

async function fetchAndDisplayCategoryCounts() {
    try {
        const response = await fetch('/.netlify/functions/count-categories');
        if (!response.ok) return;
        const counts = await response.json();
        // This will only work if you have <h3> elements in your category links
        const categoryMapping = {
            'Electronics': document.querySelector('a[href="/shop/?category=Electronics"] h3'),
            'Clothing & Apparel': document.querySelector('a[href="/shop/?category=Clothing+%26+Apparel"] h3'),
            'Home & Furniture': document.querySelector('a[href="/shop/?category=Home+%26+Furniture"] h3'),
            'Other': document.querySelector('a[href="/shop/?category=Other"] h3'),
            'Rentals': document.querySelector('a[href="/rentals/"] h3'),
            'Services': document.querySelector('a[href="https://gigs.kabaleonline.com"] h3')
        };
        for (const category in counts) {
            const h3 = categoryMapping[category];
            if (counts[category] > 0 && h3 && !h3.querySelector('.category-count')) {
                h3.innerHTML += ` <span class="category-count">(${counts[category]})</span>`;
            }
        }
    } catch (error) { console.error('Error fetching category counts:', error); }
}

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
    let title = "Recent Items";
    if (state.filters.category) { title = state.filters.category; }
    else if (state.filters.type) { title = `${state.filters.type.charAt(0).toUpperCase() + state.filters.type.slice(1)}s`; }
    if (state.searchTerm) { title = `Results for "${state.searchTerm}"`; }
    
    // Add a badge if filters are active
    const activeFilterCount = ['condition', 'location', 'minPrice', 'maxPrice']
        .filter(key => state.filters[key])
        .length;
    
    if (activeFilterCount > 0) {
        // You'll need to style this "filter-badge" class
        title += ` <span class="filter-badge">${activeFilterCount} Filter${activeFilterCount > 1 ? 's' : ''}</span>`;
    }
    
    listingsTitle.innerHTML = title; // Use .innerHTML to render the span
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
    
    document.getElementById('listings-title')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    fetchAndRenderProducts(false);
}

function handleFilterLinkClick(event) {
    const link = event.target.closest('a.category-item, a.image-category-card');
    if (!link) return;

    if (link.classList.contains('service-link')) {
        window.location.href = link.href;
        return;
    }

    event.preventDefault();

    const url = new URL(link.href);
    const type = url.searchParams.get('type') || '';
    const category = url.searchParams.get('category') || '';

    // Clear other filters when clicking a main category
    state.filters.type = type;
    state.filters.category = category;
    state.filters.condition = '';
    state.filters.location = '';
    state.filters.minPrice = '';
    state.filters.maxPrice = '';
    
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

// Handler for the sort dropdown
function handleSortChange() {
    const newSortBy = sortBySelect.value;
    if (newSortBy === state.filters.sortBy) return;

    state.filters.sortBy = newSortBy;
    state.currentPage = 0;
    fetchAndRenderProducts(false);
}

// --- FILTER MODAL HANDLERS ---
function handleApplyFilters() {
    // Read values from modal and update state
    state.filters.type = document.querySelector('input[name="filter-type"]:checked').value;
    state.filters.condition = document.querySelector('input[name="filter-condition"]:checked').value;
    state.filters.location = document.querySelector('input[name="filter-location"]:checked').value;
    state.filters.minPrice = filterMinPrice.value || '';
    state.filters.maxPrice = filterMaxPrice.value || '';
    
    state.filters.category = ''; // Clear category when applying filters
    
    state.currentPage = 0; // Reset pagination
    closeFilterModal();
    fetchAndRenderProducts(false); // Re-fetch
}

function handleClearFilters() {
    // Reset the form inputs
    document.querySelector('input[name="filter-type"][value=""]').checked = true;
    document.querySelector('input[name="filter-condition"][value=""]').checked = true;
    document.querySelector('input[name="filter-location"][value=""]').checked = true;
    filterMinPrice.value = '';
    filterMaxPrice.value = '';
    
    // Reset the state
    state.filters.type = '';
    state.filters.condition = '';
    state.filters.location = '';
    state.filters.minPrice = '';
    state.filters.maxPrice = '';
    state.filters.category = ''; // Also clear category
    
    state.currentPage = 0;
    closeFilterModal();
    fetchAndRenderProducts(false);
}

// (UPDATED) initializeStateFromURL to read all filters
function initializeStateFromURL() {
    const params = new URLSearchParams(window.location.search);
    state.filters.type = params.get('type') || '';
    state.filters.category = params.get('category') || '';
    state.searchTerm = params.get('q') || '';
    state.filters.sortBy = params.get('sortBy') || 'createdAt_desc';
    
    state.filters.condition = params.get('condition') || '';
    state.filters.location = params.get('location') || '';
    state.filters.minPrice = params.get('minPrice') || '';
    state.filters.maxPrice = params.get('maxPrice') || '';

    // Update modal inputs to reflect URL state
    if(filterModalOverlay) { // Check if modal exists
        if(state.filters.type) document.querySelector(`input[name="filter-type"][value="${state.filters.type}"]`).checked = true;
        if(state.filters.condition) document.querySelector(`input[name="filter-condition"][value="${state.filters.condition}"]`).checked = true;
        if(state.filters.location) document.querySelector(`input[name="filter-location"][value="${state.filters.location}"]`).checked = true;
        if(state.filters.minPrice) filterMinPrice.value = state.filters.minPrice;
        if(state.filters.maxPrice) filterMaxPrice.value = state.filters.maxPrice;
    }
    
    if (sortBySelect) sortBySelect.value = state.filters.sortBy;
    if (state.searchTerm) searchInput.value = state.searchTerm;
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {

    function loadPageContent() {
        fetchDeals();
        fetchSaveOnMore();
        fetchSponsoredItems();
        fetchAndDisplayCategoryCounts();
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

    // --- (UPDATED) ALL EVENT LISTENERS ---
    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearch(); } });

    // Sort dropdown listener
    if (sortBySelect) {
        sortBySelect.addEventListener('change', handleSortChange);
    }
    
    // Filter button opens the modal
    if (filterBtn) {
        filterBtn.addEventListener('click', openFilterModal);
    }

    // Filter Modal Listeners
    if (filterModalOverlay) {
        filterModalCloseBtn.addEventListener('click', closeFilterModal);
        filterApplyBtn.addEventListener('click', handleApplyFilters);
        filterClearBtn.addEventListener('click', handleClearFilters);
        // Close modal if clicking overlay
        filterModalOverlay.addEventListener('click', (e) => {
            if (e.target === filterModalOverlay) closeFilterModal();
        });
    }

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