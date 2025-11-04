// --- FIREBASE IMPORTS ---
import { db, auth } from "./firebase.js";
import { collection, query, where, orderBy, limit, getDocs, doc, setDoc, deleteDoc, serverTimestamp, getCountFromServer, startAfter } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";

// ==================================================== //
//               GLOBAL STATE & HELPERS                 //
// ==================================================== //

const state = {
    currentUser: null,
    wishlist: new Set(),
};

/**
 * Creates an optimized and transformed Cloudinary URL.
 */
function getCloudinaryTransformedUrl(url, type = 'thumbnail') {
    if (!url || !url.includes('res.cloudinary.com')) {
        return url || 'https://placehold.co/400x400/e0e0e0/777?text=No+Image';
    }
    const transformations = {
        thumbnail: 'c_fill,g_auto,w_400,h_400,f_auto,q_auto',
        placeholder: 'c_fill,g_auto,w_20,h_20,q_1,f_auto'
    };
    const transformString = transformations[type] || transformations.thumbnail;
    const urlParts = url.split('/upload/');
    if (urlParts.length !== 2) {
        return url;
    }
    return `${urlParts[0]}/upload/${transformString}/${urlParts[1]}`;
}

// ==================================================== //
//           PRODUCT RENDERING & LAZY LOAD              //
// ==================================================== //

const lazyImageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const img = entry.target;
            img.style.backgroundImage = `url(${img.dataset.placeholder})`;
            
            img.src = img.dataset.src;
            img.onload = () => {
                img.classList.add('loaded');
                img.style.backgroundImage = ''; 
            }
            img.onerror = () => { 
                img.src = 'https://placehold.co/250x250/e0e0e0/777?text=Error'; 
                img.classList.add('loaded');
            };
            observer.unobserve(img);
        }
    });
}, { rootMargin: "0px 0px 200px 0px" });

function observeLazyImages() {
    const imagesToLoad = document.querySelectorAll('img.lazy-load');
    imagesToLoad.forEach(img => lazyImageObserver.observe(img));
}

/**
 * Renders products, with a new option to append instead of replace.
 */
function renderProducts(gridElement, products, append = false) {
    if (!gridElement) return;

    if (!append) {
        gridElement.innerHTML = ""; 
    }
    
    if (!products || products.length === 0) {
        if (!append) {
            const section = gridElement.closest('.product-carousel-section, .recent-products-section');
            if (section) {
                if (section.classList.contains('recent-products-section')) {
                    gridElement.innerHTML = `<p style="padding: 0 15px; color: var(--text-secondary);">No recent products found.</p>`;
                } else {
                    section.style.display = 'none';
                }
            }
        }
        return;
    }

    const fragment = document.createDocumentFragment();
    products.forEach(product => {
        const thumbnailUrl = getCloudinaryTransformedUrl(product.imageUrls?.[0], 'thumbnail');
        const placeholderUrl = getCloudinaryTransformedUrl(product.imageUrls?.[0], 'placeholder');
        
        const verifiedTextHTML = (product.sellerBadges?.includes('verified') || product.sellerIsVerified) 
            ? `<p class="verified-text">✓ Verified Seller</p>` 
            : '';

        const isInWishlist = state.wishlist.has(product.id);
        const wishlistIcon = isInWishlist ? 'fa-solid' : 'fa-regular';
        const wishlistClass = isInWishlist ? 'active' : '';

        const isActuallySold = product.isSold || (product.quantity !== undefined && product.quantity <= 0);
        const soldClass = isActuallySold ? 'is-sold' : '';
        const soldOverlayHTML = isActuallySold ? '<div class="product-card-sold-overlay"><span>SOLD</span></div>' : '';
        
        // --- STOCK STATUS LOGIC ---
        let stockStatusHTML = '';
        if (isActuallySold) {
            stockStatusHTML = `<p class="stock-info sold-out">Sold Out</p>`;
        } else if (product.quantity > 5) {
            stockStatusHTML = `<p class="stock-info in-stock">In Stock</p>`;
        } else if (product.quantity > 0 && product.quantity <= 5) {
            stockStatusHTML = `<p class="stock-info low-stock">Only ${product.quantity} left!</p>`;
        }
        
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

        // --- NEW: Service-Aware Logic ---
        // We add this to the homepage as well so services look correct
        let priceHTML = '';
        let locationHTML = '';
        if (product.category === 'Services') {
            priceHTML = `<p class="price price-service">UGX ${product.price ? product.price.toLocaleString() : "N/A"} 
                ${product.service_duration ? `<span>/ ${product.service_duration}</span>` : ''}
            </p>`;

            if (product.service_location_type) {
                const icon = product.service_location_type === 'Online' ? 'fa-solid fa-wifi' : 'fa-solid fa-person-walking';
                locationHTML = `<p class="location-name"><i class="${icon}"></i> ${product.service_location_type}</p>`;
            }
            stockStatusHTML = ''; // Services don't have stock
        } else {
            priceHTML = `<p class="price">UGX ${product.price ? product.price.toLocaleString() : "N/A"}</p>`;
            if (product.location) {
                locationHTML = `<p class="location-name"><i class="fa-solid fa-location-dot"></i> ${product.location}</p>`;
            }
        }
        // --- END NEW LOGIC ---

        const tagsContainerHTML = tagsHTML ? `<div class="product-tags">${tagsHTML}</div>` : '';
        
        const productLink = document.createElement("a");
        productLink.href = `/product.html?id=${product.id}`;
        productLink.className = "product-card-link";

        productLink.innerHTML = `
          <div class="product-card ${soldClass}">
             ${soldOverlayHTML}
             ${tagsContainerHTML}
             <button class="wishlist-btn ${wishlistClass}" data-product-id="${product.id}" data-product-name="${product.name.replace(/"/g, '&quot;')}" aria-label="Add to wishlist">
                <i class="${wishlistIcon} fa-heart"></i>
            </button>
            
            <img data-placeholder="${placeholderUrl}" data-src="${thumbnailUrl}" alt="${product.name.replace(/"/g, '&quot;')}" class="lazy-load">
            
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

    gridElement.appendChild(fragment);
    observeLazyImages(); 
}


// ==================================================== //
//                DATA FETCHING (FIREBASE)              //
// ==================================================== //

/**
 * Generic function to fetch products from Firebase
 */
async function fetchProductsFromFirebase(q, gridId, sectionId) {
    const gridElement = document.getElementById(gridId);
    const sectionElement = document.getElementById(sectionId);

    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
        if (sectionElement) sectionElement.style.display = 'none';
        return { products: [], lastVisible: null }; // Return empty
    }
    
    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const lastVisible = snapshot.docs[snapshot.docs.length - 1];
    
    renderProducts(gridElement, products);

    const wrapper = gridElement.closest('.product-carousel-wrapper');
    if (wrapper && !wrapper.classList.contains('expanded')) {
        const centerLimit = 8; 
        if (products.length <= centerLimit) { 
            wrapper.classList.add('center-items');
        }
    }

    if (sectionElement) sectionElement.style.display = 'block';
    
    return { products, lastVisible }; // Return data
}

// --- Specific Fetchers ---

function fetchFeaturedProducts() {
    const q = query(
        collection(db, 'products'), 
        where('isHero', '==', true), 
        where('isSold', '==', false),
        orderBy('heroTimestamp', 'desc'), 
        limit(8)
    );
    return fetchProductsFromFirebase(q, 'featured-products-grid', 'featured-section');
}

function fetchDeals() {
    const q = query(
        collection(db, 'products'), 
        where('isDeal', '==', true), 
        where('isSold', '==', false), 
        orderBy('createdAt', 'desc'), 
        limit(8)
    );
    return fetchProductsFromFirebase(q, 'deals-grid', 'deals-section');
}

function fetchSponsoredItems() {
    const q = query(
        collection(db, 'products'), 
        where('isSponsored', '==', true), 
        where('isSold', '==', false), 
        orderBy('createdAt', 'desc'), 
        limit(8)
    );
    return fetchProductsFromFirebase(q, 'sponsored-grid', 'sponsored-section');
}

function fetchSaveOnMore() {
    const q = query(
        collection(db, 'products'), 
        where('isSaveOnMore', '==', true), 
        where('isSold', '==', false), 
        orderBy('createdAt', 'desc'), 
        limit(8)
    );
    return fetchProductsFromFirebase(q, 'save-on-more-grid', 'save-on-more-section');
}

async function fetchRecentProducts() {
    const grid = document.getElementById('recent-products-grid');
    if (!grid) return;
    
    const q = query(
        collection(db, 'products'), 
        orderBy('createdAt', 'desc'), 
        limit(8)
    );
    
    try {
        await fetchProductsFromFirebase(q, 'recent-products-grid', null);
    } catch (error) {
        console.error("Error fetching initial recent products:", error);
        grid.innerHTML = '<p style="padding: 0 15px; color: var(--text-secondary);">Could not load recent items.</p>';
    }
}


// ==================================================== //
//               WISHLIST & AUTH LOGIC                  //
// ==================================================== //

async function fetchUserWishlist() {
    if (!state.currentUser) { 
        state.wishlist.clear(); 
        return; 
    }
    try {
        const wishlistCol = collection(db, 'users', state.currentUser.uid, 'wishlist');
        const wishlistSnapshot = await getDocs(wishlistCol);
        const wishlistIds = wishlistSnapshot.docs.map(doc => doc.id);
        state.wishlist = new Set(wishlistIds);
    } catch (error) { 
        console.error("Could not fetch user wishlist:", error); 
    }
}

async function handleWishlistClick(event) {
    event.preventDefault(); 
    event.stopPropagation(); 
    
    if (!state.currentUser) {
        alert("Please log in to add items to your wishlist.");
        window.location.href = '/login/'; 
        return;
    }

    const button = event.currentTarget;
    const productId = button.dataset.productId;
    const productName = button.dataset.productName;
    const wishlistRef = doc(db, 'users', state.currentUser.uid, 'wishlist', productId);
    
    button.disabled = true; 
    
    try {
        if (state.wishlist.has(productId)) {
            await deleteDoc(wishlistRef);
            state.wishlist.delete(productId);
            button.classList.remove('active');
            button.querySelector('i').classList.replace('fa-solid', 'fa-regular');
        } else {
            await setDoc(wishlistRef, { 
                name: productName,
                addedAt: serverTimestamp() 
            });
            state.wishlist.add(productId);
            button.classList.add('active');
            button.querySelector('i').classList.replace('fa-regular', 'fa-solid');
        }
    } catch (error) {
        console.error("Error updating wishlist:", error);
        alert("Could not update your wishlist. Please try again.");
    } finally {
        button.disabled = false;
    }
}

// ==================================================== //
//             UI & APP INITIALIZATION                  //
// ==================================================== //

/**
 * Initializes all non-data-dependent UI elements.
 */
function initializeUI() {
    // --- Wishlist Button Click Listener ---
    document.body.addEventListener('click', function(event) {
        const wishlistButton = event.target.closest('.wishlist-btn');
        if (wishlistButton) {
            handleWishlistClick(event);
        }
    });

    // --- External Navigation Modal (REMOVED) ---
    // The old logic for 'nav-modal' and '.service-link' clicks is gone.
    // Your 'ui.js' file handles the hamburger menu.

    // --- AI Chat Bubble and Modal Logic ---
    const chatModalContainer = document.getElementById('chat-modal-container');
    const closeChatBtn = document.getElementById('close-chat-button');
    const chatModalOverlay = document.querySelector('.chat-modal-overlay');
    const aiChatBubble = document.getElementById('ai-chat-bubble');
    const aiBubbleClose = document.getElementById('ai-bubble-close');

    if (chatModalContainer && aiChatBubble) {
        const openChatModal = () => chatModalContainer.classList.add('active');
        const closeChatModal = () => chatModalContainer.classList.remove('active');

        if (localStorage.getItem('ai_bubble_dismissed') === 'true') {
            aiChatBubble.classList.add('dismissed');
        }

        aiChatBubble.addEventListener('click', openChatModal);
        
        if (aiBubbleClose) {
            aiBubbleClose.addEventListener('click', (e) => {
                e.stopPropagation(); 
                aiChatBubble.classList.add('dismissed');
                localStorage.setItem('ai_bubble_dismissed', 'true'); 
            });
        }

        if (closeChatBtn) closeChatBtn.addEventListener('click', closeChatModal);
        if (chatModalOverlay) chatModalOverlay.addEventListener('click', closeChatModal);
    }
    
    // --- Theme Switcher ---
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('change', () => {
            const theme = themeToggle.checked ? 'dark-mode' : 'light-mode';
            document.body.className = theme; 
            localStorage.setItem('theme', theme); 
        });
    }

    // --- Scroll Progress Bar ---
    const scrollProgressBar = document.getElementById('scroll-progress-bar');
    if (scrollProgressBar) {
        window.addEventListener('scroll', () => {
            const scrollTop = document.documentElement.scrollTop;
            const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            const scrollPercentage = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
            scrollProgressBar.style.width = `${scrollPercentage}%`;
        });
    }

    // --- ADDED: Back to Top Button Logic ---
    const backToTopBtn = document.getElementById('back-to-top-btn');
    if (backToTopBtn) {
        window.addEventListener('scroll', () => {
            if (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300) {
                backToTopBtn.classList.add('visible');
            } else {
                backToTopBtn.classList.remove('visible');
            }
        });
        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // --- Search Placeholder Animation ---
    const searchInput = document.getElementById('hero-search-input');
    if (searchInput) {
        const placeholders = [
            "Search laptops...",
            "Type 'iPhone'...",
            "Find textbooks...",
            "Rent a suit...",
            "Search for shoes..."
        ];
        let i = 0;
        
        const animatePlaceholder = () => {
            searchInput.classList.remove('placeholder-visible'); // Fade out
            setTimeout(() => {
                i = (i + 1) % placeholders.length;
                searchInput.placeholder = placeholders[i];
                searchInput.classList.add('placeholder-visible'); // Fade in
            }, 300); 
        };
        searchInput.placeholder = placeholders[i];
        searchInput.classList.add('placeholder-visible');
        
        setInterval(animatePlaceholder, 2500);
    }
    
    // --- "See More" Button Logic ---
    document.body.addEventListener('click', async (e) => {
        const seeMoreBtn = e.target.closest('.see-more-btn');
        if (!seeMoreBtn) return;
        
        const sectionName = seeMoreBtn.dataset.section;
        if (!sectionName) return; 
        
        if (seeMoreBtn.dataset.expanded === 'true') {
            return;
        }
        
        const wrapper = seeMoreBtn.closest('.product-carousel-section').querySelector('.product-carousel-wrapper');
        const grid = wrapper.querySelector('.product-carousel');
        
        seeMoreBtn.disabled = true;
        seeMoreBtn.textContent = 'Loading...';

        try {
            let q;
            if (sectionName === 'featured') {
                q = query(collection(db, 'products'), where('isHero', '==', true), where('isSold', '==', false), orderBy('heroTimestamp', 'desc'), limit(20));
            } else if (sectionName === 'deals') {
                q = query(collection(db, 'products'), where('isDeal', '==', true), where('isSold', '==', false), orderBy('createdAt', 'desc'), limit(20));
            } else if (sectionName === 'sponsored') {
                q = query(collection(db, 'products'), where('isSponsored', '==', true), where('isSold', '==', false), orderBy('createdAt', 'desc'), limit(20));
            } else if (sectionName === 'save') {
                q = query(collection(db, 'products'), where('isSaveOnMore', '==', true), where('isSold', '==', false), orderBy('createdAt', 'desc'), limit(20));
            }
            
            const { products } = await fetchProductsFromFirebase(q, grid.id, null);
            
            if (products && products.length > 0) {
                renderProducts(grid, products);
                wrapper.classList.add('expanded');
                grid.classList.remove('product-carousel');
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

    // --- "How-To" 2-Page Slider Logic ---
    const slider = document.getElementById('how-to-slider');
    const prevBtn = document.getElementById('how-to-prev');
    const nextBtn = document.getElementById('how-to-next');
    const dotsContainer = document.getElementById('how-to-dots');

    if (slider && prevBtn && nextBtn && dotsContainer) {
        let currentSlide = 0;
        const totalSlides = 2; 
        const dots = dotsContainer.querySelectorAll('.how-to-dot');
        let autoScrollTimer = setInterval(slideNext, 5000); 

        function updateSlider() {
            slider.style.transform = `translateX(-${currentSlide * 100}%)`;
            dots.forEach(dot => dot.classList.remove('active'));
            dots[currentSlide].classList.add('active');
            prevBtn.disabled = currentSlide === 0;
            nextBtn.disabled = currentSlide === totalSlides - 1;
        }

        function slideNext() {
            currentSlide = (currentSlide + 1) % totalSlides; 
            updateSlider();
        }

        function slidePrev() {
            currentSlide = (currentSlide - 1 + totalSlides) % totalSlides; 
            updateSlider();
        }

        function resetTimer() {
            clearInterval(autoScrollTimer);
            autoScrollTimer = setInterval(slideNext, 5000);
        }

        nextBtn.addEventListener('click', () => {
            if (currentSlide < totalSlides - 1) {
                currentSlide++;
                updateSlider();
                resetTimer();
            }
        });

        prevBtn.addEventListener('click', () => {
            if (currentSlide > 0) {
                currentSlide--;
                updateSlider();
                resetTimer();
            }
        });

        dots.forEach(dot => {
            dot.addEventListener('click', (e) => {
                currentSlide = parseInt(e.target.dataset.slide);
                updateSlider();
                resetTimer();
            });
        });

        updateSlider();
    }

    // --- Footer Scroll Animation ---
    const footer = document.querySelector('.footer-grid');
    if (footer) {
        const footerObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    footer.classList.add('in-view');
                    footerObserver.unobserve(footer);
                }
            });
        }, { threshold: 0.1 });
        footerObserver.observe(footer);
    }
}

/**
 * Initializes all data-dependent parts of the page.
 */
async function initializeData() {
    onAuthStateChanged(auth, async (user) => {
        state.currentUser = user;
        await fetchUserWishlist(); 
        
        try {
            await Promise.allSettled([
                fetchFeaturedProducts(),
                fetchDeals(),
                fetchSponsoredItems(),
                fetchSaveOnMore(),
                fetchRecentProducts(), 
            ]);
        } catch (error) {
            console.error("A critical error occurred during data load:", error);
        }
    });
}


// ==================================================== //
//           START THE APPLICATION                      //
// ==================================================== //

document.addEventListener('DOMContentLoaded', () => {
    initializeUI();
    initializeData();
});