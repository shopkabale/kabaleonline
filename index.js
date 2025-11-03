// Import Firebase functions
import { db, auth } from './firebase.js'; 
import { collection, query, getDocs, doc, setDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";


// ==================================================== //
//               GLOBAL STATE & HELPERS                 //
// ==================================================== //

const state = {
    currentUser: null,
    wishlist: new Set()
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
            // Use placeholder as background for a smoother load
            img.style.backgroundImage = `url(${img.dataset.placeholder})`;
            
            img.src = img.dataset.src;
            img.onload = () => {
                img.classList.add('loaded');
                img.style.backgroundImage = ''; // Remove placeholder bg
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
 * Renders a list of product objects into a specified grid container.
 */
function renderProducts(gridElement, products) {
    if (!gridElement) return;

    gridElement.innerHTML = ""; // Clear skeletons
    if (!products || products.length === 0) {
        // Find the whole section and hide it
        const section = gridElement.closest('.product-carousel-section, .recent-products-section');
        if (section) {
            // Don't hide the recent section, just show a message
            if (section.id === 'recent-products-section') {
                gridElement.innerHTML = `<p style="padding: 0 15px; color: var(--text-secondary);">No recent products found.</p>`;
            } else {
                section.style.display = 'none';
            }
        }
        return;
    }

    const fragment = document.createDocumentFragment();
    products.forEach(product => {
        const thumbnailUrl = getCloudinaryTransformedUrl(product.imageUrls?.[0], 'thumbnail');
        const placeholderUrl = getCloudinaryTransformedUrl(product.imageUrls?.[0], 'placeholder');
        
        const isVerified = (product.sellerBadges?.includes('verified') || product.sellerIsVerified);
        const verifiedClass = isVerified ? 'is-verified' : '';

        const isInWishlist = state.wishlist.has(product.id);
        const wishlistIcon = isInWishlist ? 'fa-solid' : 'fa-regular';
        const wishlistClass = isInWishlist ? 'active' : '';

        const isActuallySold = product.isSold; // Relies on our Algolia filter
        const soldClass = isActuallySold ? 'is-sold' : '';
        
        let stockStatusHTML = '';
        if (!isActuallySold && product.quantity > 0 && product.quantity <= 5) {
            stockStatusHTML = `<p class="stock-info low-stock">Only ${product.quantity} left!</p>`;
        } else if (isActuallySold) {
             stockStatusHTML = `<p class="stock-info sold-out">Sold Out</p>`;
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
             ${tagsContainerHTML}
             <button class="wishlist-btn ${wishlistClass}" data-product-id="${product.id}" data-product-name="${product.name.replace(/"/g, '&quot;')}" aria-label="Add to wishlist">
                <i class="${wishlistIcon} fa-heart"></i>
            </button>
            
            <img data-placeholder="${placeholderUrl}" data-src="${thumbnailUrl}" alt="${product.name.replace(/"/g, '&quot;')}" class="lazy-load">
            
            <h3>${product.name}</h3>
            ${stockStatusHTML}
            <p class="price">UGX ${product.price ? product.price.toLocaleString() : "N/A"}</p>
            ${product.location ? `<p class="location-name"><i class="fa-solid fa-location-dot"></i> ${product.location}</p>` : ''}
            ${product.sellerName ? `<p class="seller-name ${verifiedClass}">by ${product.sellerName}</p>` : ''} 
          </div>
        `;
        fragment.appendChild(productLink);
    });

    gridElement.appendChild(fragment);
    observeLazyImages(); // Set up lazy loading for new images
}


// ==================================================== //
//                DATA FETCHING (ALGOLIA)               //
// ==================================================== //

/**
 * Generic function to fetch products from our Algolia search function
 * @param {string} filter - 'deals', 'hero', 'sponsored', 'save', or 'recent'
 * @param {number} count - Number of items to fetch
 * @returns {Array} An array of product objects
 */
async function fetchProductSection(filter, count = 8) {
    // We will use the 'isSold:false' filter again for the homepage
    // but not for 'recent' items, as per your last request.
    let url = `/.netlify/functions/search?limit=${count}`;
    
    if (filter !== 'recent') {
        url += `&filter=${filter}`;
    }
    
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const { products } = await response.json();
        return products;
    } catch (error) {
        console.error(`Error fetching filter=${filter}:`, error);
        return []; // Return an empty array on failure
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
    event.preventDefault(); // Stop link navigation
    event.stopPropagation(); // Stop card click
    
    if (!state.currentUser) {
        alert("Please log in to add items to your wishlist.");
        window.location.href = '/login/'; // Redirect to login
        return;
    }

    const button = event.currentTarget;
    const productId = button.dataset.productId;
    const productName = button.dataset.productName;
    const wishlistRef = doc(db, 'users', state.currentUser.uid, 'wishlist', productId);
    
    button.disabled = true; // Prevent double-click
    
    try {
        if (state.wishlist.has(productId)) {
            // Remove from wishlist
            await deleteDoc(wishlistRef);
            state.wishlist.delete(productId);
            button.classList.remove('active');
            button.querySelector('i').classList.replace('fa-solid', 'fa-regular');
        } else {
            // Add to wishlist
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
//           WAIT FOR DOM TO BE FULLY LOADED            //
// ==================================================== //

document.addEventListener('DOMContentLoaded', () => {

    // --- Authentication and Initial Data Load ---
    onAuthStateChanged(auth, async (user) => {
        state.currentUser = user;
        await fetchUserWishlist(); // Load wishlist first
        
        // Now fetch all product sections in parallel
        Promise.all([
            fetchProductSection('hero', 8).then(products => {
                if(products.length > 0) document.getElementById('featured-section').style.display = 'block';
                renderProducts(document.getElementById('featured-products-grid'), products);
            }),
            fetchProductSection('deals', 8).then(products => {
                if(products.length > 0) document.getElementById('deals-section').style.display = 'block';
                renderProducts(document.getElementById('deals-grid'), products);
            }),
            fetchProductSection('sponsored', 8).then(products => {
                if(products.length > 0) document.getElementById('sponsored-section').style.display = 'block';
                renderProducts(document.getElementById('sponsored-grid'), products);
            }),
            fetchProductSection('save', 8).then(products => {
                if(products.length > 0) document.getElementById('save-on-more-section').style.display = 'block';
                renderProducts(document.getElementById('save-on-more-grid'), products);
            }),
            fetchProductSection('recent', 10).then(products => renderProducts(document.getElementById('recent-products-grid'), products))
        ]).catch(err => {
            console.error("Error loading homepage product sections:", err);
            // Handle a total failure if needed
        });
    });

    // ==================================================== //
    //              INTERACTIVE UI COMPONENTS               //
    // ==================================================== //

    // --- Wishlist Button Click Listener (Event Delegation) ---
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

    const toggleMenu = () => {
        mobileNav.classList.toggle('active');
        overlay.classList.toggle('active');
    };
    if (hamburger) hamburger.addEventListener('click', toggleMenu);
    if (overlay) overlay.addEventListener('click', toggleMenu);

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

    // --- NEW: AI Chat Bubble and Modal Logic ---
    const chatModalContainer = document.getElementById('chat-modal-container');
    const closeChatBtn = document.getElementById('close-chat-button');
    const chatModalOverlay = document.querySelector('.chat-modal-overlay');
    const aiChatBubble = document.getElementById('ai-chat-bubble');
    const aiBubbleClose = document.getElementById('ai-bubble-close');

    // Function to open the main chat modal
    const openChatModal = () => {
        if (chatModalContainer) chatModalContainer.classList.add('active');
    };
    
    // Function to close the main chat modal
    const closeChatModal = () => {
        if (chatModalContainer) chatModalContainer.classList.remove('active');
    };

    // Check if the bubble was dismissed before
    if (localStorage.getItem('ai_bubble_dismissed') === 'true') {
        if (aiChatBubble) aiChatBubble.classList.add('dismissed');
    }

    // Click bubble to open modal
    if (aiChatBubble) {
        aiChatBubble.addEventListener('click', openChatModal);
    }
    
    // Click 'X' on bubble to dismiss it
    if (aiBubbleClose) {
        aiBubbleClose.addEventListener('click', (e) => {
            e.stopPropagation(); // Stop the bubble click from opening the modal
            if (aiChatBubble) aiChatBubble.classList.add('dismissed');
            localStorage.setItem('ai_bubble_dismissed', 'true'); // Remember dismissal
        });
    }

    // Main modal close buttons
    if (closeChatBtn) closeChatBtn.addEventListener('click', closeChatModal);
    if (chatModalOverlay) chatModalOverlay.addEventListener('click', closeChatModal);
    // --- END NEW CHAT LOGIC ---
    
    // --- Theme Switcher ---
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('change', () => {
            const theme = themeToggle.checked ? 'dark-mode' : 'light-mode';
            document.body.className = theme; // Set theme on body
            localStorage.setItem('theme', theme); // Save theme preference
        });
    }
});