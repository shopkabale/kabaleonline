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
    howTo: {
        currentIndex: 0,
        totalItems: 10,
        autoScrollTimer: null,
        userInteracted: false
    }
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
            stockStatusHTML = `<p class="stock-info in-stock">In Stock</p>`; // <-- IN STOCK (GREEN)
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
            <p class="price">UGX ${product.price ? product.price.toLocaleString() : "N/A"}</p>
            ${product.location ? `<p class="location-name"><i class="fa-solid fa-location-dot"></i> ${product.location}</p>` : ''}
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

/**
 * MODIFIED: Fetches the first 8 recent products
 */
async function fetchRecentProducts() {
    const grid = document.getElementById('recent-products-grid');
    if (!grid) return;
    
    const q = query(
        collection(db, 'products'), 
        orderBy('createdAt', 'desc'), 
        limit(8) // --- CHANGED TO 8 ---
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

    // --- Mobile Menu ---
    const hamburger = document.querySelector('.hamburger-menu');
    const mobileNav = document.querySelector('.mobile-nav');
    const overlay = document.querySelector('.mobile-nav-overlay');

    if (hamburger && mobileNav && overlay) {
        const toggleMenu = () => {
            mobileNav.classList.toggle('active');
            overlay.classList.toggle('active');
        };
        hamburger.addEventListener('click', toggleMenu);
        overlay.addEventListener('click', toggleMenu);
    }

    // --- External Navigation Modal ---
    const navModal = document.getElementById('nav-modal');
    if (navModal) {
        const navModalMessage = document.getElementById('nav-modal-message');
        const navConfirmBtn = document.getElementById('nav-confirm-btn');
        const navCancelBtn = document.getElementById('nav-cancel-btn');
        
        document.body.addEventListener('click', (e) => {
            const trigger = e.target.closest('.service-link');
            if (trigger) {
                e.preventDefault();
                navModalMessage.textContent = "You are being redirected to our dedicated services platform, Gigs Hub. Continue?";
                navConfirmBtn.href = trigger.href;
                navModal.style.display = 'flex';
            }
        });
        navCancelBtn.addEventListener('click', () => { navModal.style.display = 'none'; });
        navModal.addEventListener('click', (e) => { if (e.target === navModal) navModal.style.display = 'none'; });
    }

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
            }, 300); // This must match the CSS transition time
        };
        // Show first placeholder immediately
        searchInput.placeholder = placeholders[i];
        searchInput.classList.add('placeholder-visible');
        
        setInterval(animatePlaceholder, 2500);
    }
    
    // --- "See More" Button Logic (EXPAND-ONCE) ---
    document.body.addEventListener('click', async (e) => {
        const seeMoreBtn = e.target.closest('.see-more-btn');
        if (!seeMoreBtn) return;
        
        const sectionName = seeMoreBtn.dataset.section;
        if (!sectionName) return; // Not a carousel button
        
        // --- THIS IS THE FIX: NO "Show Less" logic ---
        // If it's already expanded, do nothing.
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
                // Button remains disabled
            } else {
                seeMoreBtn.textContent = 'No More Items';
                seeMoreBtn.dataset.expanded = 'true';
                // Button remains disabled
            }
        } catch (error) {
            console.error(`Error expanding section ${sectionName}:`, error);
            seeMoreBtn.textContent = 'Error';
            seeMoreBtn.disabled = false; // Re-enable on error
        }
    });

    // --- "How-To" Carousel Logic ---
    const howToWrapper = document.querySelector('.how-to-carousel-wrapper');
    const howToCarousel = document.querySelector('.how-to-carousel');
    const prevBtn = document.getElementById('how-to-prev');
    const nextBtn = document.getElementById('how-to-next');
    const dotsContainer = document.getElementById('how-to-dots-container');
    const progressBar = document.getElementById('how-to-progress');
    
    if (howToCarousel) {
        const totalItems = 10;
        let currentIndex = 0;
        let autoScrollTimer = setInterval(scrollNext, 5000); // Auto-scroll every 5 seconds

        // Create dots
        for (let i = 0; i < totalItems; i++) {
            const dot = document.createElement('span');
            dot.classList.add('how-to-dot');
            dot.dataset.index = i;
            if (i === 0) dot.classList.add('active');
            dotsContainer.appendChild(dot);
        }
        const dots = document.querySelectorAll('.how-to-dot');

        function updateCarousel() {
            const cardWidth = howToCarousel.querySelector('.how-to-card').offsetWidth;
            const gap = 15;
            const scrollAmount = currentIndex * (cardWidth + gap);
            
            howToWrapper.scrollTo({ left: scrollAmount, behavior: 'smooth' });

            // Update dots
            dots.forEach(dot => dot.classList.remove('active'));
            dots[currentIndex].classList.add('active');

            // Update progress bar
            const progressPercent = (currentIndex / (totalItems - 1)) * 100;
            progressBar.style.width = `${progressPercent}%`;

            // Update buttons
            prevBtn.disabled = currentIndex === 0;
            nextBtn.disabled = currentIndex === totalItems - 1;
        }

        function scrollNext() {
            currentIndex++;
            if (currentIndex >= totalItems) {
                currentIndex = 0; // Loop back to start
            }
            updateCarousel();
        }

        function scrollPrev() {
            currentIndex--;
            if (currentIndex < 0) {
                currentIndex = totalItems - 1; // Loop to end
            }
            updateCarousel();
        }

        function resetTimer() {
            clearInterval(autoScrollTimer);
            autoScrollTimer = setInterval(scrollNext, 5000);
        }

        prevBtn.addEventListener('click', () => { scrollPrev(); resetTimer(); });
        nextBtn.addEventListener('click', () => { scrollNext(); resetTimer(); });
        dots.forEach(dot => {
            dot.addEventListener('click', (e) => {
                currentIndex = parseInt(e.target.dataset.index);
                updateCarousel();
                resetTimer();
            });
        });
        
        howToWrapper.addEventListener('touchstart', () => clearInterval(autoScrollTimer));
        howToWrapper.addEventListener('touchend', () => resetTimer());

        updateCarousel(); // Set initial state
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
        await fetchUserWishlist(); // Load wishlist first
        
        try {
            await Promise.allSettled([
                fetchFeaturedProducts(),
                fetchDeals(),
                fetchSponsoredItems(),
                fetchSaveOnMore(),
                fetchRecentProducts(), // This loads the first 8
                fetchHowToSteps() // This just runs (currently no data)
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
    // 1. Initialize all UI elements immediately.
    // This will make the hamburger, theme, and chat buttons work.
    initializeUI();
    
    // 2. Start loading data from Firebase.
    // This will run in the background and fill in the product sections.
    initializeData();
});