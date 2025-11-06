import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
// === NEW: Added getDocs, limit, and where ===
import { doc, getDoc, setDoc, deleteDoc, collection, addDoc, query, onSnapshot, serverTimestamp, orderBy, limit, where, getDocs } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const productDetailContent = document.getElementById('product-detail-content');
const qaList = document.getElementById('qa-list');
const qaFormContainer = document.getElementById('qa-form-container');

// === NEW: Added references for suggestions ===
const suggestionsSection = document.getElementById('suggestions-section');
const suggestionsGrid = document.getElementById('suggestions-grid');

let currentUser = null;
const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get('id');

function showModal({ icon, title, message, theme = 'info', buttons }) {
    const modal = document.getElementById('custom-modal');
    if (!modal) {
        alert(message); 
        
        const primaryAction = buttons.find(b => b.class === 'primary')?.onClick;
        if (primaryAction) {
            primaryAction();
        }
        return;
    }
    const modalIcon = document.getElementById('modal-icon');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    const modalButtons = document.getElementById('modal-buttons');
    
    modal.className = `modal-overlay modal-theme-${theme}`;
    if (modalIcon) modalIcon.innerHTML = icon;
    if (modalTitle) modalTitle.textContent = title;
    if (modalMessage) modalMessage.textContent = message;
    if (modalButtons) modalButtons.innerHTML = '';

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
    const modal = document.getElementById('custom-modal');
    if (modal) modal.classList.remove('show');
}


if (!productId) {
    productDetailContent.innerHTML = '<h1>Product Not Found</h1><p>The product ID is missing from the URL.</p>';
} else {
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        loadProductAndSeller();
    });
}

function saveToLocalStorage(product) {
    try {
        let lastViewed = JSON.parse(localStorage.getItem('lastViewed')) || [];
        lastViewed = lastViewed.filter(item => item.id !== product.id);
        
        const simplifiedProduct = {
            id: product.id,
            name: product.name,
            price: product.price,
            imageUrls: product.imageUrls,
            listing_type: product.listing_type,
            service_duration: product.service_duration || '',
            service_location_type: product.service_location_type || '',
            location: product.location || '',
            condition: product.condition || '',
            isSold: product.isSold || false,
            quantity: product.quantity || 0,
            sellerIsVerified: product.sellerIsVerified || false, 
            sellerBadges: product.sellerBadges || []
        };
        lastViewed.unshift(simplifiedProduct);
        lastViewed = lastViewed.slice(0, 8); 
        localStorage.setItem('lastViewed', JSON.stringify(lastViewed));

        if (product.category) {
            let userInterests = JSON.parse(localStorage.getItem('userInterests')) || [];
            userInterests = userInterests.filter(cat => cat !== product.category);
            userInterests.unshift(product.category);
            userInterests = userInterests.slice(0, 20); 
            localStorage.setItem('userInterests', JSON.stringify(userInterests));
        }

    } catch (e) {
        console.error("Error saving to localStorage:", e);
    }
}

// === NEW HELPER FUNCTION (from main.js) ===
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


async function loadProductAndSeller() {
    try {
        const productRef = doc(db, 'products', productId);
        const productSnap = await getDoc(productRef);

        if (!productSnap.exists()) {
            productDetailContent.innerHTML = '<h1>Product Not Found</h1><p>This listing may have been removed.</p>';
            return;
        }

        const productData = { id: productSnap.id, ...productSnap.data() };
        
        document.title = `${productData.name || 'Product'} | Kabale Online`;

        const sellerRef = doc(db, 'users', productData.sellerId);
        const sellerSnap = await getDoc(sellerRef);
        const sellerData = sellerSnap.exists() ? sellerSnap.data() : {};
        
        productData.sellerName = sellerData.name || 'Seller';
        productData.sellerIsVerified = sellerData.isVerified || false;
        productData.sellerBadges = sellerData.badges || [];
        productData.profilePhotoUrl = sellerData.profilePhotoUrl || null;

        renderProductDetails(productData, sellerData);
        loadQandA(productData.sellerId);
        saveToLocalStorage(productData); 

        // === NEW: Call to fetch suggestions ===
        if (productData.category) {
            fetchAndRenderSuggestions(productData.category, productData.id);
        }

    } catch (error) {
        console.error("Critical error loading product:", error);
        productDetailContent.innerHTML = '<h1>Error</h1><p>Could not load product details. Please try again later.</p>';
    }
}

function renderProductDetails(product, seller) {
    productDetailContent.innerHTML = '';
    const productElement = document.createElement('div');
    productElement.className = 'product-detail-container';
    const whatsappLink = `https://wa.me/${product.whatsapp}?text=Hello, I'm interested in your listing for '${product.name}' on Kabale Online.`;

    let stockStatusHTML = '';
    let specsHTML = '';
    let priceHTML = '';
    let addToCartHTML = '';

    if (product.listing_type === 'service') {
        priceHTML = `
            <h2 id="product-price" class="price-service">
                UGX ${product.price ? product.price.toLocaleString() : 'N/A'}
                ${product.service_duration ? `<span>/ ${product.service_duration}</span>` : ''}
            </h2>`;
        
        if (product.service_location_type) {
            const icon = product.service_location_type === 'Online' ? 'fa-solid fa-wifi' : 'fa-solid fa-person-walking';
            specsHTML += `<div class="product-spec"><i class="${icon}"></i><span><strong>Location:</strong> ${product.service_location_type}</span></div>`;
        }
        if (product.service_availability) {
            specsHTML += `<div class="product-spec"><i class="fa-solid fa-clock"></i><span><strong>Availability:</strong> ${product.service_availability}</span></div>`;
        }
        
        stockStatusHTML = '';
        addToCartHTML = '';

    } else {
        priceHTML = `<h2 id="product-price">UGX ${product.price ? product.price.toLocaleString() : 'N/A'}</h2>`;
        
        const quantity = product.quantity;
        if (product.isSold || (quantity !== undefined && quantity <= 0)) {
            stockStatusHTML = `<p class="stock-info out-of-stock">Out of Stock</p>`;
        } else if (quantity > 5) {
            stockStatusHTML = `<p class="stock-info in-stock">In Stock</p>`;
        } else if (quantity > 0 && quantity <= 5) {
            stockStatusHTML = `<p class="stock-info low-stock">Only ${quantity} left in stock - order soon!</p>`;
        }

        if (product.location) {
            specsHTML += `<div class="product-spec"><i class="fa-solid fa-location-dot"></i><span><strong>Location:</strong> ${product.location}</span></div>`;
        }
        if (product.condition) {
            const conditionText = product.condition.charAt(0).toUpperCase() + product.condition.slice(1);
            specsHTML += `<div class="product-spec"><i class="fa-solid fa-tag"></i><span><strong>Condition:</strong> ${conditionText}</span></div>`;
        }
        if (product.listing_type) {
            const typeText = product.listing_type === 'sale' ? 'For Sale' : 'For Rent';
            specsHTML += `<div class="product-spec"><i class="fa-solid fa-clipboard-list"></i><span><strong>Type:</strong> ${typeText}</span></div>`;
        }
        
        addToCartHTML = `
            <button id="add-to-cart-btn" class="cta-button primary-action-btn">
                <i class="fa-solid fa-cart-plus"></i> Add to Cart
            </button>`;
    }

    const specsGridHTML = specsHTML ? `<div class="product-specs-grid">${specsHTML}</div>` : '';
    const isVerified = (seller.badges || []).includes('verified') || seller.isVerified;
    const prominentVerifiedBadgeHTML = isVerified 
        ? `<div class="prominent-verified-badge"><i class="fa-solid fa-circle-check"></i> Verified Seller</div>` 
        : '';

    const primaryColor = '#007aff';
    const hoverColor = '#0056b3';

    productElement.innerHTML = `
        <div class="product-images">
            ${(product.imageUrls && product.imageUrls.length > 0) 
                ? product.imageUrls.map(url => `<img src="${url}" alt="${product.name}">`).join('')
                : `<img src="https://placehold.co/600x600/e0e0e0/777?text=No+Image" alt="No image available">`
            }
        </div>
        
        <div class="product-info">
        
            <div class="product-title-header">
                <h1 id="product-name">${product.name}</h1>
            </div>
            
            ${priceHTML}
            ${prominentVerifiedBadgeHTML}
            ${stockStatusHTML}
            ${specsGridHTML}
            
            <p id="product-description">${product.description.replace(/\n/g, '<br>')}</p>
            
            <button id="share-btn"
                style="
                    background-color: ${primaryColor};
                    color: white;
                    padding: 12px;
                    border-radius: 8px;
                    text-decoration: none;
                    font-weight: bold;
                    text-align: center;
                    border: none;
                    font-family: inherit;
                    font-size: 1em;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    width: 100%;
                    margin-top: 15px;
                    margin-bottom: 10px;
                    transition: background-color 0.2s;
                "
                onmouseover="this.style.backgroundColor='${hoverColor}'"
                onmouseout="this.style.backgroundColor='${primaryColor}'"
            >
                <i class="fa-solid fa-share-alt"></i> Share This Listing
            </button>
            
            <div class="seller-card">
                <h4>About the Seller</h4>
                <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
                    <img src="${seller.profilePhotoUrl || 'https://placehold.co/100x100/e0e0e0/777?text=User'}" alt="${seller.name}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;">
                    <div>
                        <strong>${seller.name || 'Seller'}</strong>
                        <div id="user-badges">
                            ${isVerified ? '<span class="badge-icon verified"><i class="fa-solid fa-circle-check"></i> Verified</span>' : ''}
                        </div>
                    </div>
                </div>

                <div class="contact-buttons">
                
                    ${addToCartHTML}
                    
                    <button id="wishlist-btn" class="cta-button wishlist-btn" style="display: none;"><i class="fa-regular fa-heart"></i> Add to Wishlist</button>
                    
                    <a href="/chat.html?recipientId=${product.sellerId}" id="contact-seller-btn" class="cta-button message-btn"><i class="fa-solid fa-comment-dots"></i> Message Seller</a>
                    
                    <a href="${whatsappLink}" target="_blank" class="cta-button whatsapp-btn"><i class="fa-brands fa-whatsapp"></i> Contact via WhatsApp</a>
                    
                    <a href="/profile.html?sellerId=${product.sellerId}"
                        style="
                            background-color: ${primaryColor};
                            color: white;
                            padding: 12px;
                            border-radius: 8px;
                            text-decoration: none;
                            font-weight: bold;
                            text-align: center;
                            border: none;
                            font-family: inherit;
                            font-size: 1em;
                            cursor: pointer;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            gap: 8px;
                            margin-top: 10px;
                            transition: background-color 0.2s;
                        "
                        onmouseover="this.style.backgroundColor='${hoverColor}'"
                        onmouseout="this.style.backgroundColor='${primaryColor}'"
                    >
                        View Public Profile
                    </a>
                </div>
            </div>
        </div>`;

    productDetailContent.appendChild(productElement);

    setupShareButton(product);
    if (addToCartHTML !== '') {
        setupAddToCartButton(product);
    }
    if (currentUser && currentUser.uid !== product.sellerId) {
        setupWishlistButton(product);
    }
    if (currentUser && currentUser.uid === product.sellerId) {
        const contactBtn = productElement.querySelector('#contact-seller-btn');
        const whatsappBtn = productElement.querySelector('.whatsapp-btn');
        if (contactBtn) {
            contactBtn.style.pointerEvents = 'none';
            contactBtn.style.backgroundColor = '#6c757d';
            contactBtn.textContent = 'This is your listing';
        }
        if (whatsappBtn) whatsappBtn.style.display = 'none';
    }
}

// === THIS IS THE UPDATED FUNCTION WITH DEBUG LOGS ===
async function fetchAndRenderSuggestions(productCategory, currentProductId) {
    if (!suggestionsGrid || !suggestionsSection) return;

    console.log(`%c[Debug] Fetching suggestions for category: "${productCategory}"`, "color: #007aff; font-weight: bold;"); // <-- DEBUG 1

    try {
        const q = query(
            collection(db, 'products'),
            where('category', '==', productCategory),
            where('isSold', '==', false),
            orderBy('createdAt', 'desc'),
            limit(5) // Fetch 5, in case the current product is one of them
        );
        
        const snapshot = await getDocs(q);
        
        const products = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(p => p.id !== currentProductId) // Filter out the current product
            .slice(0, 4); // Take the first 4

        console.log(`%c[Debug] Found ${snapshot.size} docs from query, ${products.length} products after filtering.`, "color: #007aff;"); // <-- DEBUG 2

        if (products.length > 0) {
            console.log('%c[Debug] ✅ Found suggestions, showing section.', "color: green; font-weight: bold;"); // <-- DEBUG 3
            renderProductCards(suggestionsGrid, products);
            suggestionsSection.style.display = 'block'; // Show the section
        } else {
            console.log('%c[Debug] ❌ No suggestions found, section will remain hidden.', "color: red; font-weight: bold;"); // <-- DEBUG 4
            suggestionsSection.style.display = 'none'; // Hide if no suggestions
        }

    } catch (error) {
        console.error("Error fetching suggestions:", error);
        suggestionsSection.style.display = 'none';
    }
}
// === END OF UPDATED FUNCTION ===

// === NEW FUNCTION: Renders product cards (simplified from main.js) ===
function renderProductCards(gridElement, products) {
    gridElement.innerHTML = ""; // Clear skeletons
    
    if (products.length === 0) {
        gridElement.innerHTML = "<p>No related items found.</p>";
        return;
    }

    const fragment = document.createDocumentFragment();
    products.forEach(product => {
        const thumbnailUrl = getCloudinaryTransformedUrl(product.imageUrls?.[0], 'thumbnail');
        const placeholderUrl = getCloudinaryTransformedUrl(product.imageUrls?.[0], 'placeholder');

        const verifiedTextHTML = (product.sellerBadges?.includes('verified') || product.sellerIsVerified) 
            ? `<p class="verified-text">✓ Verified Seller</p>` 
            : '';

        let priceHTML = `<p class="price">UGX ${product.price ? product.price.toLocaleString() : "N/A"}</p>`;
        if (product.listing_type === 'service') {
             priceHTML = `<p class="price price-service">UGX ${product.price ? product.price.toLocaleString() : "N/A"} 
                ${product.service_duration ? `<span style="font-size: 0.7em; color: var(--text-secondary);">/ ${product.service_duration}</span>` : ''}
            </p>`;
        }
        
        const productLink = document.createElement("a");
        productLink.href = `/product.html?id=${product.id}`;
        productLink.className = "product-card-link";
        
        productLink.innerHTML = `
          <div class="product-card">
            <img src="${placeholderUrl}" data-src="${thumbnailUrl}" alt="${product.name}" class="lazy-suggestion">
            <div class="product-card-info">
                <h3>${product.name}</h3>
                ${priceHTML}
                ${product.location ? `<p class="location-name"><i class="fa-solid fa-location-dot"></i> ${product.location}</p>` : ''}
                ${product.sellerName ? `<p class="seller-name">by ${product.sellerName}</p>` : ''} 
                ${verifiedTextHTML}
            </div>
          </div>
        `;
        
        fragment.appendChild(productLink);
    });

    gridElement.appendChild(fragment);

    // Basic lazy loading for suggestion images
    const imagesToLoad = gridElement.querySelectorAll('img.lazy-suggestion');
    imagesToLoad.forEach(img => {
        img.src = img.dataset.src;
        img.onload = () => img.classList.add('loaded');
    });
}


// --- (All functions below are your existing functions) ---

function setupAddToCartButton(product) {
    const addToCartBtn = document.getElementById('add-to-cart-btn');
    if (!addToCartBtn) return;

    if (product.isSold || (product.quantity !== undefined && product.quantity <= 0)) {
        addToCartBtn.disabled = true;
        addToCartBtn.innerHTML = '<i class="fa-solid fa-times-circle"></i> Out of Stock';
        return;
    }
    
    if (currentUser && currentUser.uid === product.sellerId) {
        addToCartBtn.disabled = true;
        addToCartBtn.textContent = 'This is your item';
        return;
    }

    addToCartBtn.addEventListener('click', async () => {
        if (!currentUser) {
            showModal({
                icon: '🔑',
                title: 'Please Log In',
                message: 'You need to be logged in to add items to your cart.',
                theme: 'info',
                buttons: [
                    { text: 'Not Now', class: 'secondary', onClick: hideModal },
                    { text: 'Log In', class: 'primary', onClick: () => { window.location.href = `/login/?redirect=/product.html?id=${productId}`; } }
                ]
            });
            return;
        }

        addToCartBtn.disabled = true;
        addToCartBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Adding...';

        try {
            const cartRef = doc(db, 'users', currentUser.uid, 'cart', productId);
            
            const cartItem = {
                productName: product.name,
                price: product.price,
                imageUrl: product.imageUrls ? product.imageUrls[0] : '',
                quantity: 1,
                sellerId: product.sellerId,
                addedAt: serverTimestamp()
            };

            await setDoc(cartRef, cartItem);
            
            showModal({
                icon: '✅',
                title: 'Added to Cart!',
                message: `${product.name} has been successfully added to your cart.`,
                theme: 'success',
                buttons: [
                    { text: 'Continue Shopping', class: 'secondary', onClick: hideModal },
                    { text: 'View Cart', class: 'primary', onClick: () => { window.location.href = '/cart.html'; } }
                ]
            });
            
            addToCartBtn.disabled = false;
            addToCartBtn.innerHTML = '<i class="fa-solid fa-cart-plus"></i> Add to Cart';

        } catch (error) {
            console.error("Error adding to cart:", error);
            showModal({
                icon: '⚠️',
                title: 'Error',
                message: 'Could not add item to cart. Please try again.',
                theme: 'error',
                buttons: [ { text: 'OK', class: 'primary', onClick: hideModal } ]
            });
            addToCartBtn.innerHTML = '<i class="fa-solid fa-cart-plus"></i> Add to Cart';
            addToCartBtn.disabled = false;
        }
    });
}

function setupShareButton(product) {
    const shareBtn = document.getElementById('share-btn'); 
    if (!shareBtn) return;
    
    shareBtn.addEventListener('click', async () => {
        const sellerName = product.sellerName || 'Kabale Online Seller'; 
        const productPrice = product.price ? `UGX ${product.price.toLocaleString()}` : 'Price N/A';

        const shareText = `${product.name}\n${productPrice}\nSeller: ${sellerName}\nView details here:`;
        const shareUrl = window.location.href;

        const shareData = { 
            title: product.name, 
            text: shareText, 
            url: shareUrl 
        };

        try {
            if (navigator.share) { 
                await navigator.share(shareData); 
            } else { 
                await navigator.clipboard.writeText(`${shareText} ${shareUrl}`); 
                showModal({
                    icon: '📋',
                    title: 'Link Copied!',
                    message: 'Listing details and link copied to clipboard. You can now paste it anywhere!',
                    theme: 'success',
                    buttons: [{ text: 'Got It!', class: 'primary', onClick: hideModal }]
                });
            }
        } catch (err) { 
            console.error("Share failed:", err); 
            if (err.name !== 'AbortError') {
                 showModal({
                    icon: '⚠️',
                    title: 'Share Failed',
                    message: 'Could not share the listing details. Please try again.',
                    theme: 'error',
                    buttons: [{ text: 'OK', class: 'primary', onClick: hideModal }]
                });
            }
        }
    });
}

async function setupWishlistButton(product) {
    const wishlistBtn = document.getElementById('wishlist-btn');
    if (!wishlistBtn) return;
    wishlistBtn.style.display = 'flex';
    const wishlistRef = doc(db, 'users', currentUser.uid, 'wishlist', productId);
    let isInWishlist = false;

    try {
        const wishlistSnap = await getDoc(wishlistRef);
        isInWishlist = wishlistSnap.exists();
    } catch (e) {
        console.error("Error checking wishlist:", e);
    }

    function updateButtonState() {
        if (isInWishlist) {
            wishlistBtn.innerHTML = `<i class="fa-solid fa-heart"></i> In Wishlist`;
            wishlistBtn.classList.add('active');
        } else {
            wishlistBtn.innerHTML = `<i class="fa-regular fa-heart"></i> Add to Wishlist`;
            wishlistBtn.classList.remove('active');
        }
    }
    
    updateButtonState();

    wishlistBtn.addEventListener('click', async () => {
        wishlistBtn.disabled = true;
        try {
            if (isInWishlist) { 
                await deleteDoc(wishlistRef); 
            } else { 
                await setDoc(wishlistRef, { 
                    name: product.name, 
                    price: product.price, 
                    imageUrl: product.imageUrls ? product.imageUrls[0] : '', 
                    addedAt: serverTimestamp() 
                }); 
            }
            isInWishlist = !isInWishlist;
            updateButtonState();
        } catch (e) {
            console.error("Error updating wishlist:", e);
        } finally {
            wishlistBtn.disabled = false;
        }
    });
}

function loadQandA(sellerId) {
    const qandaRef = collection(db, 'products', productId, 'qanda');
    const q = query(qandaRef, orderBy('timestamp', 'desc'));
    try {
        onSnapshot(q, (snapshot) => {
            qaList.innerHTML = '';
            if (snapshot.empty) { 
                qaList.innerHTML = '<p>No questions have been asked yet.</p>'; 
            } else { 
                snapshot.forEach(docSnap => { 
                    const qa = docSnap.data(); 
                    const div = document.createElement('div'); 
                    div.className = 'question-item'; 
                    const question = qa.question.replace(/<g, "&lt;").replace(/>/g, "&gt;");
                    const answer = qa.answer ? qa.answer.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, '<br>') : null;

                    div.innerHTML = `<p><strong>Q: ${question}</strong></p>${answer ? `<div class="answer-item"><p><strong>A:</strong> ${answer}</p></div>` : ''}`; 
                    qaList.appendChild(div); 
                }); 
            }
        });

        if (currentUser) {
            qaFormContainer.innerHTML = `<h4>Ask a Question</h4><form id="qa-form" class="qa-form"><textarea id="question-input" placeholder="Type your question here..." required></textarea><button type="submit" class="cta-button message-btn" style="margin-top: 10px;">Submit Question</button><p id="qa-form-message"></p></form>`;
            document.getElementById('qa-form').addEventListener('submit', (e) => submitQuestion(e, sellerId));
        } else {
            qaFormContainer.innerHTML = `<p style="text-align: center;">Please <a href="/login/?redirect=/product.html?id=${productId}" style="font-weight: bold;">login or register</a> to ask a question.</p>`;
        }
    } catch (error) { 
        console.error("Error loading Q&A:", error); 
        qaList.innerHTML = '<p style="color: red;">Could not load questions.</p>'; 
    }
}

async function submitQuestion(e, sellerId) {
    e.preventDefault();
    const form = e.target;
    const button = form.querySelector('button');
    const questionInput = form.querySelector('#question-input');
    const messageEl = form.querySelector('#qa-form-message');
    const questionText = questionInput.value.trim();
    if (!questionText || !currentUser) return;

    button.disabled = true;
    button.textContent = 'Submitting...';

    try {
        await addDoc(collection(db, 'products', productId, 'qanda'), { 
            question: questionText, 
            answer: null, 
            askerId: currentUser.uid, 
            askerName: currentUser.displayName || currentUser.email, 
            sellerId: sellerId, 
            timestamp: serverTimestamp() 
        });
        questionInput.value = '';
        messageEl.textContent = 'Your question has been submitted!';
        messageEl.style.color = 'green';
    } catch (err) {
        console.error("Error submitting question:", err);
        messageEl.textContent = 'Failed to submit question.';
        messageEl.style.color = 'red';
    } finally {
        button.disabled = false;
        button.textContent = 'Submit Question';
        setTimeout(() => messageEl.textContent = '', 3000);
    }
}