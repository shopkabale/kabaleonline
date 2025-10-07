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
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc, setDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { onSnapshot } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js"; // Import onSnapshot

// --- DOM ELEMENT REFERENCES ---
const productGrid = document.getElementById("product-grid");
const listingsTitle = document.getElementById("listings-title");
const dealsSection = document.getElementById("deals-section");
const dealsGrid = document.getElementById("deals-grid");
const searchInput = document.getElementById("search-input");
const searchBtn = document.getElementById("search-btn");
const mobileNav = document.querySelector(".mobile-nav");
const categoryGrid = document.querySelector(".category-grid");
const paginationContainer = document.getElementById("pagination-container");
const prevPageBtn = document.getElementById("prev-page-btn");
const nextPageBtn = document.getElementById("next-page-btn");
const pageIndicator = document.getElementById("page-indicator");
const dynamicHeader = document.getElementById('dynamic-header');
const headerSlidesContainer = document.getElementById('header-slides-container');
const headerPrevBtn = document.getElementById('header-prev-btn');
const headerNextBtn = document.getElementById('header-next-btn');

// --- MODAL DOM REFERENCES ---
const modal = document.getElementById('custom-modal');
const modalIcon = document.getElementById('modal-icon');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const modalButtons = document.getElementById('modal-buttons');

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

// --- HEADER SLIDER STATE ---
let headerSlides = [];
let currentSlideIndex = 0;
let slideInterval;


// --- MODAL FUNCTIONS ---
function showModal({ icon, title, message, theme = 'info', buttons }) {
    if (!modal) return;
    modal.className = `modal-overlay modal-theme-${theme}`; // Reset and set theme
    modalIcon.innerHTML = icon;
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    modalButtons.innerHTML = ''; // Clear old buttons

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
    if (!modal) return;
    modal.classList.remove('show');
}

// --- DYNAMIC CONTENT FUNCTIONS ---
function renderHeaderSlides() {
    if (!headerSlidesContainer || headerSlides.length === 0) {
        if (dynamicHeader) dynamicHeader.style.display = 'none';
        return;
    }
    headerSlidesContainer.innerHTML = '';
    const fragment = document.createDocumentFragment();
    headerSlides.forEach(slide => {
        const slideDiv = document.createElement('div');
        slideDiv.className = 'header-slide';
        const thumbnailUrl = getCloudinaryTransformedUrl(slide.imageUrl, 'thumbnail');
        const placeholderUrl = getCloudinaryTransformedUrl(slide.imageUrl, 'placeholder');
        slideDiv.innerHTML = `
            <a href="/product.html?id=${slide.productId}" class="product-card-link">
              <div class="product-card">
                <h3>${slide.description}</h3>
                <img src="${placeholderUrl}" data-src="${thumbnailUrl}" alt="${slide.description}" class="lazy">
                <p class="price">UGX ${slide.price ? slide.price.toLocaleString() : "N/A"}</p>
              </div>
            </a>
        `;
        fragment.appendChild(slideDiv);
    });
    headerSlidesContainer.appendChild(fragment);
    observeLazyImages();
    showSlide(0);
    startSlideShow();
}
function showSlide(index) { if (!headerSlidesContainer) return; const offset = -index * 100; headerSlidesContainer.style.transform = `translateX(${offset}%)`; currentSlideIndex = index; }
function nextSlide() { if (headerSlides.length === 0) return; const newIndex = (currentSlideIndex + 1) % headerSlides.length; showSlide(newIndex); }
function prevSlide() { if (headerSlides.length === 0) return; const newIndex = (currentSlideIndex - 1 + headerSlides.length) % headerSlides.length; showSlide(newIndex); }
function startSlideShow() { stopSlideShow(); slideInterval = setInterval(nextSlide, 5000); }
function stopSlideShow() { clearInterval(slideInterval); }
async function fetchHeaderSlides() {
    if (!dynamicHeader) return;
    try {
        const slidesQuery = query(collection(db, 'products'), where('isHero', '==', true), orderBy('heroTimestamp', 'desc'), limit(6));
        const snapshot = await getDocs(slidesQuery);
        headerSlides = snapshot.docs.map(doc => ({ id: doc.id, productId: doc.id, description: doc.data().name, imageUrl: doc.data().imageUrls?.[0], price: doc.data().price })).filter(slide => slide.imageUrl); 
        if (headerSlides.length === 0) { dynamicHeader.style.display = 'none'; return; }
        renderHeaderSlides();
    } catch (error) { console.error("Error fetching header slides:", error); dynamicHeader.style.display = 'none'; }
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
            img.onload = () => { img.classList.add('loaded'); };
            img.onerror = () => { img.src = 'https://placehold.co/250x250/e0e0e0/777?text=Error'; img.classList.add('loaded'); };
            observer.unobserve(img);
        }
    });
}, { rootMargin: "0px 0px 200px 0px" });
function observeLazyImages() { const imagesToLoad = document.querySelectorAll('img.lazy'); imagesToLoad.forEach(img => { lazyImageObserver.observe(img); }); }

function renderProducts(productsToDisplay) {
    productGrid.innerHTML = "";
    if (productsToDisplay.length === 0) {
        productGrid.innerHTML = `<p class="loading-indicator">No listings found matching your criteria.</p>`;
        return;
    }
    const fragment = document.createDocumentFragment();
    productsToDisplay.forEach(product => {
        const thumbnailUrl = getCloudinaryTransformedUrl(product.imageUrls?.[0], 'thumbnail');
        const placeholderUrl = getCloudinaryTransformedUrl(product.imageUrls?.[0], 'placeholder');
        const isVerified = product.sellerBadges?.includes('verified') || product.sellerIsVerified;
        const verifiedTextHTML = isVerified ? `<p class="verified-text">✓ Verified Seller</p>` : '';
        const isInWishlist = state.wishlist.has(product.id);
        const wishlistIcon = isInWishlist ? 'fa-solid' : 'fa-regular';
        const wishlistClass = isInWishlist ? 'active' : '';

        const isSold = product.isSold;
        const soldClass = isSold ? 'is-sold' : '';
        const soldOverlayHTML = isSold ? '<div class="product-card-sold-overlay"><span>SOLD</span></div>' : '';

        // NEW: Logic for stock status
        let stockStatusHTML = '';
        const quantity = product.quantity;
        if (quantity > 5) {
            stockStatusHTML = `<p class="stock-info in-stock">In Stock</p>`;
        } else if (quantity > 0 && quantity <= 5) {
            stockStatusHTML = `<p class="stock-info low-stock">Only ${quantity} left!</p>`;
        }

        const productLink = document.createElement("a");
        productLink.href = `/product.html?id=${product.id}`;
        productLink.className = "product-card-link";

        productLink.innerHTML = `
          <div class="product-card ${soldClass}">
            ${soldOverlayHTML}
            <button class="wishlist-btn ${wishlistClass}" data-product-id="${product.id}" data-product-name="${product.name}" data-product-price="${product.price}" data-product-image="${product.imageUrls?.[0] || ''}" aria-label="Add to wishlist">
                <i class="${wishlistIcon} fa-heart"></i>
            </button>
            <img src="${placeholderUrl}" data-src="${thumbnailUrl}" alt="${product.name}" class="lazy">
            <h3>${product.name}</h3>
            ${stockStatusHTML}
            <p class="price">UGX ${product.price ? product.price.toLocaleString() : "N/A"}</p>
            ${verifiedTextHTML}
          </div>
        `;
        fragment.appendChild(productLink);
    });
    productGrid.appendChild(fragment);
    observeLazyImages();
    initializeWishlistButtons();
}

async function fetchAndRenderProducts() {
    if (state.isFetching) return;
    state.isFetching = true;
    renderSkeletonLoaders(productGrid, 12);
    updatePaginationUI();
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
        renderProducts(products);
    } catch (error) {
        console.error("Error fetching from Algolia:", error);
        productGrid.innerHTML = `<p class="loading-indicator">Sorry, could not load listings. Please try again later.</p>`;
    } finally {
        state.isFetching = false;
        updatePaginationUI();
        if (state.currentPage > 0) { window.scrollTo({ top: productGrid.offsetTop - 150, behavior: 'smooth' }); }
    }
}
function updatePaginationUI() {
    if (state.totalPages > 1) {
        paginationContainer.style.display = 'flex';
        pageIndicator.textContent = `Page ${state.currentPage + 1} of ${state.totalPages}`;
        prevPageBtn.disabled = state.isFetching || state.currentPage === 0;
        nextPageBtn.disabled = state.isFetching || state.currentPage >= state.totalPages - 1;
    } else {
        paginationContainer.style.display = 'none';
    }
}
function updateListingsTitle() {
    let title = "All Listings";
    if (state.filters.category) { title = state.filters.category; }
    else if (state.filters.type) { title = `${state.filters.type.charAt(0).toUpperCase() + state.filters.type.slice(1)}s`; }
    if (state.searchTerm) { title = `Results for "${state.searchTerm}"`; }
    listingsTitle.textContent = title;
}

// --- WISHLIST FUNCTIONS ---
async function handleWishlistClick(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!state.currentUser) {
        showModal({
            icon: '🔒', title: 'Login Required', message: 'You need an account to save items. It\'s free!',
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
            showModal({ icon: '❤️', title: 'Added!', message: 'Item added to your wishlist.', theme: 'success', buttons: [ { text: 'Great!', class: 'primary', onClick: hideModal } ] });
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
function initializeWishlistButtons() {
    const wishlistButtons = document.querySelectorAll('.wishlist-btn');
    wishlistButtons.forEach(button => {
        button.removeEventListener('click', handleWishlistClick);
        button.addEventListener('click', handleWishlistClick);
    });
}
async function fetchUserWishlist() {
    if (!state.currentUser) { state.wishlist.clear(); return; }
    try {
        const wishlistCol = collection(db, 'users', state.currentUser.uid, 'wishlist');
        const wishlistSnapshot = await getDocs(wishlistCol);
        const wishlistIds = wishlistSnapshot.docs.map(doc => doc.id);
        state.wishlist = new Set(wishlistIds);
    } catch (error) { console.error("Could not fetch user wishlist:", error); state.wishlist.clear(); }
}

// --- EVENT HANDLERS & INITIALIZATION ---
function handleSearch() {
    const term = searchInput.value.trim();
    if (state.searchTerm === term) return;
    state.searchTerm = term; state.currentPage = 0; state.filters.type = ''; state.filters.category = '';
    fetchAndRenderProducts();
}
function handleFilterLinkClick(event) {
    const link = event.target.closest('a[href*="?"]');
    if (!link) return;
    event.preventDefault();
    const url = new URL(link.href);
    const type = url.searchParams.get('type') || '';
    const category = url.searchParams.get('category') || '';
    state.filters.type = type; state.filters.category = category; state.currentPage = 0; state.searchTerm = '';
    searchInput.value = '';
    fetchAndRenderProducts();
    document.querySelector('.mobile-nav')?.classList.remove('active');
    document.querySelector('.mobile-nav-overlay')?.classList.remove('active');
}
function initializeStateFromURL() {
    const params = new URLSearchParams(window.location.search);
    state.filters.type = params.get('type') || '';
    state.filters.category = params.get('category') || '';
    state.searchTerm = params.get('q') || '';
}

async function fetchDeals() {
    const dealsGrid = document.getElementById("deals-grid");
    const dealsSection = document.getElementById("deals-section");
    if (!dealsGrid || !dealsSection) return;
    renderSkeletonLoaders(dealsGrid, 5);
    dealsSection.style.display = 'block';
    try {
        const dealsQuery = query(collection(db, 'products'), where('isDeal', '==', true), where('isSold', '==', false), orderBy('createdAt', 'desc'), limit(8));
        const snapshot = await getDocs(dealsQuery);
        if (snapshot.empty) { dealsSection.style.display = 'none'; return; }
        dealsGrid.innerHTML = "";
        const fragment = document.createDocumentFragment();
        snapshot.docs.forEach(doc => {
            const product = { id: doc.id, ...doc.data() };
            const thumbnailUrl = getCloudinaryTransformedUrl(product.imageUrls?.[0], 'thumbnail');
            const placeholderUrl = getCloudinaryTransformedUrl(product.imageUrls?.[0], 'placeholder');
            const isVerified = product.sellerBadges?.includes('verified') || product.sellerIsVerified;
            const verifiedTextHTML = isVerified ? `<p class="verified-text">✓ Verified Seller</p>` : '';
            const isInWishlist = state.wishlist.has(product.id);
            const wishlistIcon = isInWishlist ? 'fa-solid' : 'fa-regular';
            const wishlistClass = isInWishlist ? 'active' : '';
            const isSold = product.isSold;
            const soldClass = isSold ? 'is-sold' : '';
            const soldOverlayHTML = isSold ? '<div class="product-card-sold-overlay"><span>SOLD</span></div>' : '';

            // NEW: Logic for stock status
            let stockStatusHTML = '';
            const quantity = product.quantity;
            if (quantity > 5) {
                stockStatusHTML = `<p class="stock-info in-stock">In Stock</p>`;
            } else if (quantity > 0 && quantity <= 5) {
                stockStatusHTML = `<p class="stock-info low-stock">Only ${quantity} left!</p>`;
            }

            const productLink = document.createElement("a");
            productLink.href = `/product.html?id=${product.id}`;
            productLink.className = "product-card-link";
            productLink.innerHTML = `
              <div class="product-card ${soldClass}">
                 ${soldOverlayHTML}
                 <button class="wishlist-btn ${wishlistClass}" data-product-id="${product.id}" data-product-name="${product.name}" data-product-price="${product.price}" data-product-image="${product.imageUrls?.[0] || ''}" aria-label="Add to wishlist">
                    <i class="${wishlistIcon} fa-heart"></i>
                </button>
                <img src="${placeholderUrl}" data-src="${thumbnailUrl}" alt="${product.name}" class="lazy">
                <h3>${product.name}</h3>
                ${stockStatusHTML}
                <p class="price">UGX ${product.price ? product.price.toLocaleString() : "N/A"}</p>
                ${verifiedTextHTML}
              </div>
            `;
            fragment.appendChild(productLink);
        });
        dealsGrid.appendChild(fragment);
        observeLazyImages();
        initializeWishlistButtons();
    } catch (error) { console.error("Error fetching deals:", error); dealsSection.style.display = 'none'; }
}

async function fetchTestimonials() {
    const testimonialGrid = document.getElementById('testimonial-grid');
    if (!testimonialGrid) return;
    try {
        const testimonialsQuery = query(collection(db, 'testimonials'), where('status', '==', 'approved'), orderBy('order', 'asc'), limit(2));
        const querySnapshot = await getDocs(testimonialsQuery);
        if (querySnapshot.empty) { testimonialGrid.closest('.testimonial-section').style.display = 'none'; return; }
        testimonialGrid.innerHTML = '';
        querySnapshot.forEach(doc => {
            const testimonial = doc.data();
            const card = document.createElement('div');
            card.className = 'testimonial-card';
            card.innerHTML = `<p class="testimonial-text">"${testimonial.quote}"</p><p class="testimonial-author">&ndash; ${testimonial.authorName} <span>${testimonial.authorDetail || ''}</span></p>`;
            testimonialGrid.appendChild(card);
        });
    } catch (error) { console.error("Error fetching testimonials:", error); }
}

async function fetchAndDisplayCategoryCounts() {
    try {
        const response = await fetch('/.netlify/functions/count-categories');
        if (!response.ok) return;
        const counts = await response.json();
        const categoryMapping = {
            'Electronics': document.querySelector('a[href="/?category=Electronics"] span'),
            'Clothing & Apparel': document.querySelector('a[href="/?category=Clothing+%26+Apparel"] span'),
            'Home & Furniture': document.querySelector('a[href="/?category=Home+%26+Furniture"] span'),
            'Other': document.querySelector('a[href="/?category=Other"] span'),
            'Rentals': document.querySelector('a[href="/rentals/"] span'),
            'Services': document.querySelector('a[href="/?type=service"] span')
        };
        for (const category in counts) {
            const span = categoryMapping[category];
            if (counts[category] > 0 && span && !span.querySelector('.category-count')) {
                span.innerHTML += ` <span class="category-count">(${counts[category]})</span>`;
            }
        }
    } catch (error) { console.error('Error fetching category counts:', error); }
}

function listenForCartUpdates(userId) {
    const cartBadges = document.querySelectorAll('.cart-badge');
    if (!userId) {
        cartBadges.forEach(badge => badge.classList.remove('visible'));
        return;
    }
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

document.addEventListener('DOMContentLoaded', () => {
    function loadPageContent() {
        fetchHeaderSlides();
        fetchDeals();
        fetchTestimonials();
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
    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearch(); } });
    mobileNav.addEventListener('click', handleFilterLinkClick);
    categoryGrid.addEventListener('click', handleFilterLinkClick);
    prevPageBtn.addEventListener('click', () => { if (state.currentPage > 0) { state.currentPage--; fetchAndRenderProducts(); } });
    nextPageBtn.addEventListener('click', () => { if (state.currentPage < state.totalPages - 1) { state.currentPage++; fetchAndRenderProducts(); } });
    if (headerNextBtn && headerPrevBtn) {
        headerNextBtn.addEventListener('click', () => { nextSlide(); startSlideShow(); });
        headerPrevBtn.addEventListener('click', () => { prevSlide(); startSlideShow(); });
    }
});