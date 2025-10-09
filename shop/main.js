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
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc, setDoc, deleteDoc, serverTimestamp, onSnapshot } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";

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
const paginationContainer = document.getElementById("pagination-container");
const prevPageBtn = document.getElementById("prev-page-btn");
const nextPageBtn = document.getElementById("next-page-btn");
const pageIndicator = document.getElementById("page-indicator");
const modal = document.getElementById('custom-modal');
const cartBadge = document.getElementById("cart-badge");

// --- APPLICATION STATE ---
const state = {
    currentPage: 0,
    totalPages: 1,
    isFetching: false,
    searchTerm: '',
    filters: { type: '', category: '' },
    currentUser: null,
    cart: new Set() // Tracks product IDs in the user's cart
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

function observeLazyImages() {
    const imagesToLoad = document.querySelectorAll('img.lazy');
    imagesToLoad.forEach(img => { lazyImageObserver.observe(img); });
}

function renderProductCards(gridElement, products) {
    const fragment = document.createDocumentFragment();
    products.forEach(product => {
        const productCardContainer = document.createElement('div');
        productCardContainer.className = 'product-card'; // Main container is the card itself now
        productCardContainer.style.position = 'relative'; // Ensure button positioning is correct

        const thumbnailUrl = getCloudinaryTransformedUrl(product.imageUrls?.[0], 'thumbnail');
        const placeholderUrl = getCloudinaryTransformedUrl(product.imageUrls?.[0], 'placeholder');
        const verifiedTextHTML = (product.sellerBadges?.includes('verified') || product.sellerIsVerified) ? `<p class="verified-text">✓ Verified Seller</p>` : '';
        const soldClass = product.isSold ? 'is-sold' : '';
        const soldOverlayHTML = product.isSold ? '<div class="product-card-sold-overlay"><span>SOLD</span></div>' : '';
        let stockStatusHTML = '';
        if (product.quantity > 5) {
            stockStatusHTML = `<p class="stock-info in-stock">In Stock</p>`;
        } else if (product.quantity > 0 && product.quantity <= 5) {
            stockStatusHTML = `<p class="stock-info low-stock">Only ${product.quantity} left!</p>`;
        }

        const isInCart = state.cart.has(product.id);

        productCardContainer.innerHTML = `
            ${soldOverlayHTML}
            <a href="/product.html?id=${product.id}" class="product-card-link">
                <img src="${placeholderUrl}" data-src="${thumbnailUrl}" alt="${product.name}" class="lazy">
                <div class="product-card-content">
                    <h3>${product.name}</h3>
                    ${stockStatusHTML}
                    <p class="price">UGX ${product.price ? product.price.toLocaleString() : "N/A"}</p>
                    ${verifiedTextHTML}
                </div>
            </a>
            <button class="add-to-cart-btn ${isInCart ? 'in-cart' : ''}" data-product-id="${product.id}" aria-label="Add to cart">
                <i class="fa-solid ${isInCart ? 'fa-check' : 'fa-plus'}"></i>
            </button>
        `;
        fragment.appendChild(productCardContainer);
    });
    gridElement.innerHTML = '';
    gridElement.appendChild(fragment);
    observeLazyImages();
}

// --- DATA FETCHING & UI UPDATE FUNCTIONS ---
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
        renderProductCards(productGrid, products);
    } catch (error) {
        console.error("Error fetching from Algolia:", error);
        productGrid.innerHTML = `<p class="loading-indicator">Could not load listings.</p>`;
    } finally {
        state.isFetching = false;
        updatePaginationUI();
        if (state.currentPage > 0 || state.searchTerm) {
            const targetElement = document.getElementById('listings-title');
            if (targetElement) {
                setTimeout(() => {
                    targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
            }
        }
    }
}

async function fetchCarouselData(gridElement, sectionElement, queryOptions) {
    if (!gridElement || !sectionElement) return;
    renderSkeletonLoaders(gridElement, 5);
    sectionElement.style.display = 'block';
    try {
        const q = query(collection(db, 'products'), ...queryOptions);
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            sectionElement.style.display = 'none';
            return;
        }
        const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderProductCards(gridElement, products);
    } catch (error) {
        console.error(`Error fetching for ${gridElement.id}:`, error);
        sectionElement.style.display = 'none';
    }
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
    let title = "Recent Items";
    if (state.filters.category) { title = state.filters.category; }
    else if (state.filters.type) { title = `${state.filters.type.charAt(0).toUpperCase() + state.filters.type.slice(1)}s`; }
    if (state.searchTerm) { title = `Results for "${state.searchTerm}"`; }
    listingsTitle.textContent = title;
}

// --- CART LOGIC ---
function listenForCartUpdates(userId) {
    cartBadge.textContent = '0';
    cartBadge.style.display = 'flex'; // Always show badge

    if (!userId) {
        state.cart.clear();
        return;
    }

    const cartRef = collection(db, 'users', userId, 'cart');
    onSnapshot(cartRef, (snapshot) => {
        const count = snapshot.size;
        state.cart.clear();
        snapshot.forEach(doc => state.cart.add(doc.id));
        cartBadge.textContent = count;
        
        document.querySelectorAll('.add-to-cart-btn').forEach(button => {
            const productId = button.dataset.productId;
            const isInCart = state.cart.has(productId);
            button.classList.toggle('in-cart', isInCart);
            button.querySelector('i').className = `fa-solid ${isInCart ? 'fa-check' : 'fa-plus'}`;
        });
    });
}

async function handleAddToCartClick(event) {
    const button = event.target.closest('.add-to-cart-btn');
    if (!button) return;

    if (!state.currentUser) {
        showModal({
            icon: '🔒', title: 'Login Required', message: 'Please log in or create an account to use the cart.',
            buttons: [ { text: 'Cancel', class: 'secondary', onClick: hideModal }, { text: 'Log In', class: 'primary', onClick: () => { window.location.href = '/login/'; } } ]
        });
        return;
    }

    const productId = button.dataset.productId;
    const isInCart = state.cart.has(productId);

    if (isInCart) {
        showModal({
            icon: '🛒', title: 'Item is in Your Cart', message: 'You can manage quantity or remove this item from your cart page.',
            theme: 'info',
            buttons: [
                { text: 'Continue Shopping', class: 'secondary', onClick: hideModal },
                { text: 'Go to Cart', class: 'primary', onClick: () => { window.location.href = '/cart.html'; } },
            ]
        });
    } else {
        const productRef = doc(db, 'products', productId);
        const productSnap = await getDoc(productRef);
        if (!productSnap.exists() || productSnap.data().isSold || productSnap.data().quantity < 1) {
            alert("Sorry, this item is no longer available.");
            return;
        }
        const productData = productSnap.data();

        const cartItem = {
            productId: productId,
            productName: productData.name,
            price: productData.price,
            imageUrl: productData.imageUrls ? productData.imageUrls[0] : '',
            quantity: 1,
            sellerId: productData.sellerId,
            addedAt: serverTimestamp()
        };

        await setDoc(doc(db, 'users', state.currentUser.uid, 'cart', productId), cartItem);

        showModal({
            icon: '✅', title: 'Added to Cart!', message: `${productData.name} has been added to your cart.`,
            theme: 'success',
            buttons: [
                { text: 'Continue Shopping', class: 'secondary', onClick: hideModal },
                { text: 'Go to Cart', class: 'primary', onClick: () => { window.location.href = '/cart.html'; } }
            ]
        });
    }
}

// --- OTHER EVENT HANDLERS ---
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
    if (mobileNav) { mobileNav.classList.remove('active'); document.querySelector('.mobile-nav-overlay')?.classList.remove('active'); }
}

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
        fetchCarouselData(dealsGrid, dealsSection, [where('isDeal', '==', true), where('isSold', '==', false), orderBy('createdAt', 'desc'), limit(8)]);
        fetchCarouselData(saveOnMoreGrid, saveOnMoreSection, [where('isSaveOnMore', '==', true), where('isSold', '==', false), orderBy('createdAt', 'desc'), limit(8)]);
        fetchCarouselData(sponsoredGrid, sponsoredSection, [where('isSponsored', '==', true), where('isSold', '==', false), orderBy('createdAt', 'desc'), limit(8)]);
        fetchAndDisplayCategoryCounts();
        initializeStateFromURL();
        fetchAndRenderProducts();
    }

    onAuthStateChanged(auth, (user) => {
        state.currentUser = user;
        listenForCartUpdates(user ? user.uid : null);
        loadPageContent();
    });
    
    document.body.addEventListener('click', handleAddToCartClick);

    if (modal) {
        modal.addEventListener('click', (event) => { if (event.target === modal) hideModal(); });
    }
    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearch(); } });
    mobileNav.addEventListener('click', handleFilterLinkClick);
    categoryGrid.addEventListener('click', handleFilterLinkClick);
    prevPageBtn.addEventListener('click', () => {
        if (state.currentPage > 0) {
            state.currentPage--;
            fetchAndRenderProducts();
        }
    });
    nextPageBtn.addEventListener('click', () => {
        if (state.currentPage < state.totalPages - 1) {
            state.currentPage++;
            fetchAndRenderProducts();
        }
    });
});