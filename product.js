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
        
        // Find the primary button's action (like redirecting) and run it
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
        
        // Set page title dynamically
        document.title = `${productData.name || 'Product'} | Kabale Online`;

        const sellerRef = doc(db, 'users', productData.sellerId);
        const sellerSnap = await getDoc(sellerRef);
        const sellerData = sellerSnap.exists() ? sellerSnap.data() : {};
        
        productData.sellerName = sellerData.name || 'Seller';

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
    if (product.isSold || (!quantity && quantity !== 0) || quantity <= 0) {
        stockStatusHTML = `<p class="stock-info out-of-stock">Out of Stock</p>`;
    } else if (quantity > 5) {
        stockStatusHTML = `<p class="stock-info in-stock">In Stock</p>`;
    } else if (quantity > 0 && quantity <= 5) {
        stockStatusHTML = `<p class="stock-info low-stock">Only ${quantity} left in stock - order soon!</p>`;
    }

    // --- Product Specs (Location, Condition, Type) ---
    let specsHTML = '';
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
    const specsGridHTML = specsHTML ? `<div class="product-specs-grid">${specsHTML}</div>` : '';

    // --- Create a prominent Verified Seller badge ---
    const isVerified = (seller.badges || []).includes('verified') || seller.isVerified; // Check both user data fields
    const prominentVerifiedBadgeHTML = isVerified 
        ? `<div class="prominent-verified-badge"><i class="fa-solid fa-circle-check"></i> Verified Seller</div>` 
        : '';

    // Primary and hover colors from your site's theme
    const primaryColor = '#007aff'; // Your site's blue
    const hoverColor = '#0056b3'; // Darker blue for hover

    productElement.innerHTML = `
        <div class="product-images">
            ${(product.imageUrls && product.imageUrls.length > 0) 
                ? product.imageUrls.map(url => `<img src="${url}" alt="${product.name}">`).join('')
                : `<img src="https://placehold.co/600x600/e0e0e0/777?text=No+Image" alt="No image available">`
            }
        </div>
        
        <!-- This div has the corrected class="product-info" (no typo) -->
        <div class="product-info">
        
            <div class="product-title-header">
                <h1 id="product-name">${product.name}</h1>
            </div>
            <h2 id="product-price">UGX ${product.price ? product.price.toLocaleString() : 'N/A'}</h2>
            
            ${prominentVerifiedBadgeHTML}
            ${stockStatusHTML}
            ${specsGridHTML}
            
            <p id="product-description">${product.description.replace(/\n/g, '<br>')}</p>
            
            <!-- Share Button with ALL styles inline (This one was already working) -->
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
                <i class="fa-solid fa-share-alt"></i> Share This Product
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

                <!-- This container will stack all buttons vertically -->
                <div class="contact-buttons">
                
                    <button id="add-to-cart-btn" class="cta-button primary-action-btn">
                        <i class="fa-solid fa-cart-plus"></i> Add to Cart
                    </button>
                    
                    <button id="wishlist-btn" class="cta-button wishlist-btn" style="display: none;"><i class="fa-regular fa-heart"></i> Add to Wishlist</button>
                    
                    <a href="/chat.html?recipientId=${product.sellerId}" id="contact-seller-btn" class="cta-button message-btn"><i class="fa-solid fa-comment-dots"></i> Message Seller</a>
                    
                    <a href="${whatsappLink}" target="_blank" class="cta-button whatsapp-btn"><i class="fa-brands fa-whatsapp"></i> Contact via WhatsApp</a>
                    
                    <!-- 
                      *****************************************************************
                      * THIS IS THE NEW "VIEW PUBLIC PROFILE" BUTTON FIX
                      * All classes are REMOVED.
                      * All styles are INLINE, just like the Share button.
                      * It does NOT have "width: 100%" so it will fit correctly.
                      *****************************************************************
                    -->
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
                            width: 100%; /* This is needed to match the other buttons */
                            margin-top: 10px; /* This was 20px, changing to 10px to match others */
                            transition: background-color 0.2s;
                        "
                        onmouseover="this.style.backgroundColor='${hoverColor}'"
                        onmouseout="this.style.backgroundColor='${primaryColor}'"
                    >
                        View Public Profile
                    </a>
                    <!-- * END OF NEW PROFILE BUTTON FIX * -->

                </div>
            </div>
        </div>`;

    productDetailContent.appendChild(productElement);

    // --- SETUP ALL BUTTONS ---
    setupShareButton(product); // This function is still needed for the *click action*
    setupAddToCartButton(product);
    if (currentUser && currentUser.uid !== product.sellerId) {
        setupWishlistButton(product);
    }
    if (currentUser && currentUser.uid === product.sellerId) {
        const contactBtn = productElement.querySelector('#contact-seller-btn');
        const whatsappBtn = productElement.querySelector('.whatsapp-btn');
        contactBtn.style.pointerEvents = 'none';
        contactBtn.style.backgroundColor = '#6c757d'; // 'disabled' grey
        contactBtn.textContent = 'This is your listing';
        whatsappBtn.style.display = 'none'; // Hide WhatsApp button for own listing
    }
}

function setupAddToCartButton(product) {
    const addToCartBtn = document.getElementById('add-to-cart-btn');
    if (!addToCartBtn) return;

    // Handle out of stock case
    if (product.isSold || !product.quantity || product.quantity <= 0) {
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
    
    // The button is ALREADY STYLED by the inline styles we added in renderProductDetails.
    // This function just adds the click logic.
    
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
                    message: 'Product details and link copied to clipboard. You can now paste it anywhere!',
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
                    message: 'Could not share the product details. Please try again.',
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
    wishlistBtn.style.display = 'flex'; // Make it visible
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
    
    updateButtonS_tate();

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
                    // Sanitize output (simple text replacement)
                    const question = qa.question.replace(/</g, "&lt;").replace(/>/g, "&gt;");
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
            askerName: currentUser.displayName || currentUser.email, // Store asker's name
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

// Typo fix in setupWishlistButton
function updateButtonS_tate() {
    const wishlistBtn = document.getElementById('wishlist-btn');
    if (!wishlistBtn) return;
    const isInWishlist = wishlistBtn.classList.contains('active-internal'); // Use a different way to track state

    if (isInWishlist) {
        wishlistBtn.innerHTML = `<i class="fa-solid fa-heart"></i> In Wishlist`;
        wishlistBtn.classList.add('active');
    } else {
        wishlistBtn.innerHTML = `<i class="fa-regular fa-heart"></i> Add to Wishlist`;
        wishlistBtn.classList.remove('active');
    }
}