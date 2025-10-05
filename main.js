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
import { db } from "./firebase.js";
import { collection, query, where, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

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

// --- DYNAMIC HEADER DOM REFERENCES ---
const dynamicHeader = document.getElementById('dynamic-header');
const headerSlidesContainer = document.getElementById('header-slides-container');
const headerPrevBtn = document.getElementById('header-prev-btn');
const headerNextBtn = document.getElementById('header-next-btn');

// --- APPLICATION STATE ---
const state = {
    currentPage: 0,
    totalPages: 1,
    isFetching: false,
    searchTerm: '',
    filters: { type: '', category: '' }
};

// --- HEADER SLIDER STATE ---
let headerSlides = [];
let currentSlideIndex = 0;
let slideInterval;

// --- DYNAMIC HEADER FUNCTIONS ---

/**
 * Renders the fetched slides into the header as product cards.
 */
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

        // UPDATED HTML STRUCTURE: h3 is now before img
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

/**
 * Displays a specific slide by its index.
 */
function showSlide(index) {
    if (!headerSlidesContainer) return;
    const offset = -index * 100;
    headerSlidesContainer.style.transform = `translateX(${offset}%)`;
    currentSlideIndex = index;
}

function nextSlide() {
    if (headerSlides.length === 0) return;
    const newIndex = (currentSlideIndex + 1) % headerSlides.length;
    showSlide(newIndex);
}

function prevSlide() {
    if (headerSlides.length === 0) return;
    const newIndex = (currentSlideIndex - 1 + headerSlides.length) % headerSlides.length;
    showSlide(newIndex);
}

function startSlideShow() {
    stopSlideShow();
    slideInterval = setInterval(nextSlide, 5000);
}

function stopSlideShow() {
    clearInterval(slideInterval);
}

/**
 * Fetches products marked as 'hero' items from Firestore.
 */
async function fetchHeaderSlides() {
    if (!dynamicHeader) return;
    try {
        const slidesQuery = query(
            collection(db, 'products'),
            where('isHero', '==', true),
            orderBy('heroTimestamp', 'desc'),
            limit(6)
        );
        const snapshot = await getDocs(slidesQuery);

        headerSlides = snapshot.docs
            .map(doc => {
                const productData = doc.data();
                return { 
                    id: doc.id, 
                    productId: doc.id,
                    description: productData.name, 
                    imageUrl: productData.imageUrls?.[0],
                    price: productData.price
                };
            })
            .filter(slide => slide.imageUrl); 

        if (headerSlides.length === 0) {
            dynamicHeader.style.display = 'none';
            return;
        }
        
        renderHeaderSlides();
    } catch (error) {
        console.error("Error fetching header slides:", error);
        dynamicHeader.style.display = 'none';
    }
}

// --- SKELETON LOADER RENDERER ---
function renderSkeletonLoaders(container, count) {
    container.innerHTML = '';
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
        const skeletonCard = document.createElement('div');
        skeletonCard.className = 'skeleton-card';
        skeletonCard.innerHTML = `
            <div class="skeleton-image"></div>
            <div class="skeleton-text w-75"></div>
            <div class="skeleton-text w-50"></div>
        `;
        fragment.appendChild(skeletonCard);
    }
    container.appendChild(fragment);
}

// --- LAZY LOADING WITH INTERSECTION OBSERVER ---
const lazyImageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            img.onload = () => {
                img.classList.add('loaded');
            };
            img.onerror = () => {
                img.src = 'https://placehold.co/250x250/e0e0e0/777?text=Error';
                img.classList.add('loaded');
            };
            observer.unobserve(img);
        }
    });
}, { rootMargin: "0px 0px 200px 0px" });

function observeLazyImages() {
    const imagesToLoad = document.querySelectorAll('img.lazy');
    imagesToLoad.forEach(img => {
        lazyImageObserver.observe(img);
    });
}

// --- RENDER FUNCTION ---
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
        const verifiedTextHTML = isVerified ?
            `<p class="verified-text">✓ Verified Seller</p>` :
            '';

        const productLink = document.createElement("a");
        productLink.href = `/product.html?id=${product.id}`;
        productLink.className = "product-card-link";
        productLink.innerHTML = `
          <div class="product-card">
            <img src="${placeholderUrl}" data-src="${thumbnailUrl}" alt="${product.name}" class="lazy">
            <h3>${product.name}</h3>
            <p class="price">UGX ${product.price ? product.price.toLocaleString() : "N/A"}</p>
            ${verifiedTextHTML}
          </div>
        `;
        fragment.appendChild(productLink);
    });
    productGrid.appendChild(fragment);
    observeLazyImages();
}

// --- FETCH FROM ALGOLIA ---
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
        if (state.currentPage > 0) {
            window.scrollTo({ top: productGrid.offsetTop - 150, behavior: 'smooth' });
        }
    }
}

// --- UI UPDATE FUNCTIONS ---
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
    if (state.filters.category) {
        title = state.filters.category;
    } else if (state.filters.type) {
        title = `${state.filters.type.charAt(0).toUpperCase() + state.filters.type.slice(1)}s`;
    }
    if (state.searchTerm) {
        title = `Results for "${state.searchTerm}"`;
    }
    listingsTitle.textContent = title;
}

// --- EVENT HANDLERS ---
function handleSearch() {
    const term = searchInput.value.trim();
    if (state.searchTerm === term) return;

    state.searchTerm = term;
    state.currentPage = 0;
    state.filters.type = '';
    state.filters.category = '';

    fetchAndRenderProducts();
}

function handleFilterLinkClick(event) {
    const link = event.target.closest('a[href*="?"]');
    if (!link) return;

    event.preventDefault();

    const url = new URL(link.href);
    const type = url.searchParams.get('type') || '';
    const category = url.searchParams.get('category') || '';

    state.filters.type = type;
    state.filters.category = category;
    state.currentPage = 0;
    state.searchTerm = '';
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

// --- FETCH DEALS ---
async function fetchDeals() {
    if (!dealsGrid || !dealsSection) return;

    renderSkeletonLoaders(dealsGrid, 5);
    dealsSection.style.display = 'block';

    try {
        const dealsQuery = query(
            collection(db, 'products'),
            where('isDeal', '==', true),
            where('isSold', '==', false),
            orderBy('createdAt', 'desc'),
            limit(8)
        );
        const snapshot = await getDocs(dealsQuery);

        if (snapshot.empty) {
            dealsSection.style.display = 'none';
            return;
        }

        dealsGrid.innerHTML = "";
        const fragment = document.createDocumentFragment();
        snapshot.docs.forEach(doc => {
            const product = { id: doc.id, ...doc.data() };
            const thumbnailUrl = getCloudinaryTransformedUrl(product.imageUrls?.[0], 'thumbnail');
            const placeholderUrl = getCloudinaryTransformedUrl(product.imageUrls?.[0], 'placeholder');

            const isVerified = product.sellerBadges?.includes('verified') || product.sellerIsVerified;
            const verifiedTextHTML = isVerified ?
                `<p class="verified-text">✓ Verified Seller</p>` :
                '';

            const productLink = document.createElement("a");
            productLink.href = `/product.html?id=${product.id}`;
            productLink.className = "product-card-link";
            productLink.innerHTML = `
              <div class="product-card">
                 <img src="${placeholderUrl}" data-src="${thumbnailUrl}" alt="${product.name}" class="lazy">
                <h3>${product.name}</h3>
                <p class="price">UGX ${product.price ? product.price.toLocaleString() : "N/A"}</p>
                ${verifiedTextHTML}
              </div>
            `;
            fragment.appendChild(productLink);
        });
        dealsGrid.appendChild(fragment);
        observeLazyImages();

    } catch (error) {
        console.error("Error fetching deals:", error);
        dealsSection.style.display = 'none';
    }
}

// --- FETCH TESTIMONIALS ---
async function fetchTestimonials() {
    const testimonialGrid = document.getElementById('testimonial-grid');
    if (!testimonialGrid) return;
    try {
        const testimonialsQuery = query(
            collection(db, 'testimonials'),
            where('status', '==', 'approved'),
            orderBy('order', 'asc'),
            limit(2)
        );
        const querySnapshot = await getDocs(testimonialsQuery);
        if (querySnapshot.empty) {
            testimonialGrid.closest('.testimonial-section').style.display = 'none';
            return;
        }
        testimonialGrid.innerHTML = '';
        querySnapshot.forEach(doc => {
            const testimonial = doc.data();
            const card = document.createElement('div');
            card.className = 'testimonial-card';
            card.innerHTML = `
                <p class="testimonial-text">"${testimonial.quote}"</p>
                <p class="testimonial-author">&ndash; ${testimonial.authorName} <span>${testimonial.authorDetail || ''}</span></p>
            `;
            testimonialGrid.appendChild(card);
        });
    } catch (error) {
        console.error("Error fetching testimonials:", error);
    }
}

// --- INITIALIZE PAGE ---
document.addEventListener('DOMContentLoaded', () => {
    // Service Redirect Logic
    const serviceParams = new URLSearchParams(window.location.search);
    if (serviceParams.get('type') === 'service') {
        const banner = document.getElementById('service-redirect-banner');
        const closeBtn = document.getElementById('close-service-banner');
        if (banner) banner.style.display = 'block';
        if (closeBtn) closeBtn.addEventListener('click', () => banner.style.display = 'none');
    }
    
    // Fetch all dynamic content
    fetchHeaderSlides();
    fetchDeals();
    fetchTestimonials();

    initializeStateFromURL();
    fetchAndRenderProducts();

    // --- EVENT LISTENERS ---
    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSearch();
        }
    });

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

    // --- DYNAMIC HEADER EVENT LISTENERS ---
    if (headerNextBtn && headerPrevBtn) {
        headerNextBtn.addEventListener('click', () => {
            nextSlide();
            startSlideShow();
        });

        headerPrevBtn.addEventListener('click', () => {
            prevSlide();
            startSlideShow();
        });
    }
});