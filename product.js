import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { doc, getDoc, setDoc, deleteDoc, collection, addDoc, query, onSnapshot, serverTimestamp, orderBy } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const productDetailContent = document.getElementById('product-detail-content');
const qaList = document.getElementById('qa-list');
const qaFormContainer = document.getElementById('qa-form-container');

let currentUser = null;
const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get('id');

// A function to show a pop-up modal (assuming it exists in a shared script or on the page)
function showModal({ icon, title, message, theme = 'info', buttons }) {
    // This function requires the modal HTML and CSS to be on your product-details.html page.
    const modal = document.getElementById('custom-modal'); // You'll need to add this modal HTML to your page
    if (!modal) {
        alert(message); // Fallback to a simple alert if modal doesn't exist
        buttons.find(b => b.class === 'primary')?.onClick(); // Simulate primary button click for redirection
        return;
    }
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

async function loadProductAndSeller() {
    try {
        const productRef = doc(db, 'products', productId);
        const productSnap = await getDoc(productRef);

        if (!productSnap.exists()) {
            productDetailContent.innerHTML = '<h1>Product Not Found</h1><p>This listing may have been removed.</p>';
            return;
        }

        const productData = productSnap.data();
        const sellerRef = doc(db, 'users', productData.sellerId);
        const sellerSnap = await getDoc(sellerRef);
        const sellerData = sellerSnap.exists() ? sellerSnap.data() : {};

        renderProductDetails(productData, sellerData);
        loadQandA(productData.sellerId);

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

    // Logic for stock status
    let stockStatusHTML = '';
    const quantity = product.quantity;
    if (quantity > 5) {
        stockStatusHTML = `<p class="stock-info in-stock">In Stock</p>`;
    } else if (quantity > 0 && quantity <= 5) {
        stockStatusHTML = `<p class="stock-info low-stock">Only ${quantity} left in stock - order soon!</p>`;
    } else {
        stockStatusHTML = `<p class="stock-info out-of-stock">Out of Stock</p>`;
    }
    
    // --- NEW: Product Specs (Location, Condition, Type) ---
    let specsHTML = '';
    if (product.location) {
        specsHTML += `<div class="product-spec"><i class="fa-solid fa-location-dot"></i><span><strong>Location:</strong> ${product.location}</span></div>`;
    }
    if (product.condition) {
        // Capitalize the first letter (e.g., "new" -> "New")
        const conditionText = product.condition.charAt(0).toUpperCase() + product.condition.slice(1);
        specsHTML += `<div class="product-spec"><i class="fa-solid fa-tag"></i><span><strong>Condition:</strong> ${conditionText}</span></div>`;
    }
    if (product.listing_type) {
        // Make it user-friendly (e.g., "sale" -> "For Sale")
        const typeText = product.listing_type === 'sale' ? 'For Sale' : 'For Rent';
        specsHTML += `<div class="product-spec"><i class="fa-solid fa-clipboard-list"></i><span><strong>Type:</strong> ${typeText}</span></div>`;
    }
    // Only show the grid if there is at least one spec to show
    const specsGridHTML = specsHTML ? `<div class="product-specs-grid">${specsHTML}</div>` : '';
    // --- END NEW ---

    productElement.innerHTML = `
        <div class="product-images">
            ${(product.imageUrls || []).map(url => `<img src="${url}" alt="${product.name}">`).join('')}
        </div>
        <div class="product-info">
            <div class="product-title-header">
                <h1 id="product-name">${product.name}</h1>
                <button id="share-btn" title="Share"><i class="fa-solid fa-share-alt"></i></button>
            </div>
            <h2 id="product-price">UGX ${product.price.toLocaleString()}</h2>
            ${stockStatusHTML}
            
            ${specsGridHTML}
            
            <p id="product-description">${product.description}</p>
            <div class="seller-card">
                <h4>About the Seller</h4>
                <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
                    <img src="${seller.profilePhotoUrl || 'placeholder.webp'}" alt="${seller.name}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;">
                    <div>
                        <strong>${seller.name || 'Seller'}</strong>
                        <div id="user-badges">
                            ${(seller.badges || []).includes('verified') ? '<span class="badge-icon verified"><i class="fa-solid fa-circle-check"></i> Verified</span>' : ''}
                        </div>
                    </div>
                </div>
                <div class="contact-buttons">
                    <button id="add-to-cart-btn" class="cta-button primary-action-btn">
                        <i class="fa-solid fa-cart-plus"></i> Add to Cart
                    </button>
                    <button id="wishlist-btn" class="cta-button wishlist-btn" style="display: none;"><i class="fa-regular fa-heart"></i> Add to Wishlist</button>
                    <a href="/chat.html?recipientId=${product.sellerId}" id="contact-seller-btn" class="cta-button message-btn"><i class="fa-solid fa-comment-dots"></i> Message Seller</a>
                    <a href="${whatsappLink}" target="_blank" class="cta-button whatsapp-btn"><i class="fa-brands fa-whatsapp"></i> Contact via WhatsApp</a>
                    <a href="/profile.html?sellerId=${product.sellerId}" class="cta-button profile-btn">View Public Profile</a>
                </div>
            </div>
        </div>`;

    productDetailContent.appendChild(productElement);

    // --- SETUP ALL BUTTONS ---
    setupShareButton(product);
    setupAddToCartButton(product);
    if (currentUser && currentUser.uid !== product.sellerId) {
        setupWishlistButton(product);
    }
    if (currentUser && currentUser.uid === product.sellerId) {
        const contactBtn = productElement.querySelector('#contact-seller-btn');
        contactBtn.style.pointerEvents = 'none';
        contactBtn.style.backgroundColor = '#ccc';
        contactBtn.textContent = 'This is your listing';
    }
}

function setupAddToCartButton(product) {
    const addToCartBtn = document.getElementById('add-to-cart-btn');
    if (!addToCartBtn) return;

    // Handle out of stock case
    if (!product.quantity || product.quantity <= 0) {
        addToCartBtn.disabled = true;
        addToCartBtn.innerHTML = '<i class="fa-solid fa-times-circle"></i> Out of Stock';
        return;
    }
    
    // Handle self-purchase case
    if (currentUser && currentUser.uid === product.sellerId) {
        addToCartBtn.disabled = true;
        addToCartBtn.textContent = 'This is your item';
        return;
    }

    addToCartBtn.addEventListener('click', async () => {
        if (!currentUser) {
            alert("Please log in to add items to your cart.");
            window.location.href = `/login/?redirect=/product.html?id=${productId}`;
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
            
            // Show a success pop-up
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
            
            // Reset the button
            addToCartBtn.disabled = false;
            addToCartBtn.innerHTML = '<i class="fa-solid fa-cart-plus"></i> Add to Cart';

        } catch (error) {
            console.error("Error adding to cart:", error);
            addToCartBtn.innerHTML = 'Error! Try Again';
            setTimeout(() => {
                addToCartBtn.disabled = false;
                addToCartBtn.innerHTML = '<i class="fa-solid fa-cart-plus"></i> Add to Cart';
            }, 2000);
        }
    });
}

function setupShareButton(product) {
    const shareBtn = document.getElementById('share-btn');
    if (!shareBtn) return;
    shareBtn.addEventListener('click', async () => {
        const shareData = { title: product.name, text: `Check out this listing on Kabale Online: ${product.name}`, url: window.location.href };
        try {
            if (navigator.share) { await navigator.share(shareData); } 
            else { await navigator.clipboard.writeText(window.location.href); alert('Link copied to clipboard!'); }
        } catch (err) { console.error("Share failed:", err); }
    });
}

async function setupWishlistButton(product) {
    const wishlistBtn = document.getElementById('wishlist-btn');
    if (!wishlistBtn) return;
    wishlistBtn.style.display = 'flex';
    const wishlistRef = doc(db, 'users', currentUser.uid, 'wishlist', productId);
    const wishlistSnap = await getDoc(wishlistRef);
    let isInWishlist = wishlistSnap.exists();
    function updateButtonState() {
        if (isInWishlist) {
            wishlistBtn.innerHTML = `<i class="fa-solid fa-heart"></i> In Wishlist`;
            wishlistBtn.classList.add('active');
        } else {
            wishlistBtn.innerHTML = `<i class="fa-regular fa-heart"></i> Add to Wishlist`;
            wishlistBtn.classList.remove('active');
        }
    }
    updateButtonS