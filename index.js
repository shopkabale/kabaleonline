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
    recentItems: {
        lastVisible: null, // For pagination
        isLoading: false,
        isExpanded: false
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

    // Clear skeletons ONLY if we are not appending
    if (!append) {
        gridElement.innerHTML = ""; 
    }
    
    if (!products || products.length === 0) {
        if (!append) {
            // Only show "No products" if we're not appending
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
        
        let stockStatusHTML = '';
        if (isActuallySold) {
            stockStatusHTML = `<p class="stock-info sold-out">Sold Out</p>`;
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
async function fetchProductsFromFirebase(gridId, sectionId, q) {
    const gridElement = document.getElementById(gridId);
    const sectionElement = document.getElementById(sectionId);

    try {
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            if (sectionElement) sectionElement.style.display = 'none';
            return; // Return empty to stop
        }
        
        const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderProducts(gridElement, products);
        if (sectionElement) sectionElement.style.display = 'block';

    } catch (error) {
        console.error(`Error fetching Firebase section ${sectionId}:`, error);
        if (sectionElement) sectionElement.style.display = 'none';
    }
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
    fetchProductsFromFirebase('featured-products-grid', 'featured-section', q);
}

function fetchDeals() {
    const q = query(
        collection(db, 'products'), 
        where('isDeal', '==', true), 
        where('isSold', '==', false), 
        orderBy('createdAt', 'desc'), 
        limit(8)
    );
    fetchProductsFromFirebase('deals-grid', 'deals-section', q);
}

function fetchSponsoredItems() {
    const q = query(
        collection(db, 'products'), 
        where('isSponsored', '==', true), 
        where('isSold', '==', false), 
        orderBy('createdAt', 'desc'), 
        limit(8)
    );
    fetchProductsFromFirebase('sponsored-grid', 'sponsored-section', q);
}

function fetchSaveOnMore() {
    const q = query(
        collection(db, 'products'), 
        where('isSaveOnMore', '==', true), 
        where('isSold', '==', false), 
        orderBy('createdAt', 'desc'), 
        limit(8)
    );
    fetchProductsFromFirebase('save-on-more-grid', 'save-on-more-section', q);
}

/**
 * NEW: Fetches the first 4 recent products
 */
async function fetchRecentProducts() {
    const grid = document.getElementById('recent-products-grid');
    if (!grid) return;
    
    try {
        const q = query(
            collection(db, 'products'), 
            orderBy('createdAt', 'desc'), 
            limit(4) // Only fetch 4 items
        );
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            grid.innerHTML = '<p style="padding: 0 15px; color: var(--text-secondary);">No recent products found.</p>';
            return;
        }
        
        // Save the last visible document for pagination
        state.recentItems.lastVisible = snapshot.docs[snapshot.docs.length - 1];
        
        const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderProducts(grid, products, false); // Render (don't append)

    } catch (error) {
        console.error("Error fetching initial recent products:", error);
    }
}

/**
 * NEW: Fetches 8 more recent products for "See More"
 */
async function fetchMoreRecentProducts() {
    const grid = document.getElementById('recent-products-grid');
    const button = document.getElementById('see-more-recent');
    if (!grid || !button || state.recentItems.isLoading || !state.recentItems.lastVisible) return;

    state.recentItems.isLoading = true;
    button.disabled = true;
    button.textContent = 'Loading...';

    try {
        const q = query(
            collection(db, 'products'), 
            orderBy('createdAt', 'desc'),
            startAfter(state.recentItems.lastVisible), // Start after the last item
            limit(8) // Fetch 8 more
        );
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            button.textContent = 'No More Items';
            button.disabled = true;
            return;
        }

        // Save the new last visible document
        state.recentItems.lastVisible = snapshot.docs[snapshot.docs.length - 1];
        
        const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderProducts(grid, products, true); // Append these new products

        // Check if there might be even more
        const countSnap = await getCountFromServer(q);
        if (countSnap.data().count < 8) {
             button.textContent = 'End of List';
             button.disabled = true;
        } else {
             button.textContent = 'See More ↓';
             button.disabled = false;
        }

    } catch (error) {
        console.error("Error fetching more recent products:", error);
        button.textContent = 'Error';
    } finally {
        state.recentItems.isLoading = false;
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

    // --- NEW: Scroll Progress Bar ---
    const scrollProgressBar = document.getElementById('scroll-progress-bar');
    if (scrollProgressBar) {
        window.addEventListener('scroll', () => {
            const scrollTop = document.documentElement.scrollTop;
            const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            const scrollPercentage = (scrollTop / scrollHeight) * 100;
            scrollProgressBar.style.width = `${scrollPercentage}%`;
        });
    }

    // --- NEW: Search Placeholder Animation ---
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
            searchInput.classList.add('placeholder-hidden');
            setTimeout(() => {
                i = (i + 1) % placeholders.length;
                searchInput.placeholder = placeholders[i];
                searchInput.classList.remove('placeholder-hidden');
            }, 300); // Wait for fade out
        };
        setInterval(animatePlaceholder, 2500); // Change every 2.5 seconds
    }
    
    // --- NEW: "See More" Button for Recent Items ---
    const seeMoreBtn = document.getElementById('see-more-recent');
    const recentGrid = document.getElementById('recent-products-grid');
    if (seeMoreBtn && recentGrid) {
        seeMoreBtn.addEventListener('click', () => {
            const isExpanded = seeMoreBtn.dataset.expanded === 'true';
            
            if (isExpanded) {
                // Collapse the grid
                recentGrid.classList.remove('expanded');
                // Remove all but the first 4 items
                const allItems = recentGrid.querySelectorAll('.product-card-link');
                for (let i = 4; i < allItems.length; i++) {
                    allItems[i].remove();
                }
                seeMoreBtn.dataset.expanded = 'false';
                seeMoreBtn.textContent = 'See More ↓';
                seeMoreBtn.disabled = false; // Re-enable
            } else {
                // Expand the grid
                recentGrid.classList.add('expanded');
                fetchMoreRecentProducts(); // Fetch and append 8 more
                seeMoreBtn.dataset.expanded = 'true';
                seeMoreBtn.textContent = 'Show Less ↑';
            }
        });
    }

    // --- NEW: Footer Scroll Animation ---
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
            // We use Promise.allSettled to prevent one error from
            // stopping all sections from loading.
            await Promise.allSettled([
                fetchFeaturedProducts(),
                fetchDeals(),
                fetchSponsoredItems(),
                fetchSaveOnMore(),
                fetchRecentProducts() // This loads the first 4
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
    initializeUI();
    
    // 2. Start loading data from Firebase.
    initializeData();
});