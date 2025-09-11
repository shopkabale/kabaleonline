import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { doc, getDoc, setDoc, deleteDoc, collection, addDoc, query, onSnapshot, serverTimestamp, orderBy } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const productDetailContent = document.getElementById('product-detail-content');
const qaList = document.getElementById('qa-list');
const qaFormContainer = document.getElementById('qa-form-container');

let currentUser = null;
const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get('id');

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
                    <button id="wishlist-btn" class="cta-button wishlist-btn" style="display: none;"><i class="fa-regular fa-heart"></i> Add to Wishlist</button>
                    <a href="/chat.html?recipientId=${product.sellerId}" id="contact-seller-btn" class="cta-button message-btn"><i class="fa-solid fa-comment-dots"></i> Message Seller</a>
                    <a href="${whatsappLink}" target="_blank" class="cta-button whatsapp-btn"><i class="fa-brands fa-whatsapp"></i> Contact via WhatsApp</a>
                    <a href="/profile.html?sellerId=${product.sellerId}" class="cta-button profile-btn">View Public Profile</a>
                </div>
            </div>
        </div>`;

    productDetailContent.appendChild(productElement);

    // --- SETUP BUTTONS ---
    setupShareButton(product);
    
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

function setupShareButton(product) {
    const shareBtn = document.getElementById('share-btn');
    if (!shareBtn) return;
    
    shareBtn.addEventListener('click', async () => {
        const shareData = {
            title: product.name,
            text: `Check out this listing on Kabale Online: ${product.name}`,
            url: window.location.href
        };
        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                // Fallback for desktop browsers
                await navigator.clipboard.writeText(window.location.href);
                alert('Link copied to clipboard!');
            }
        } catch (err) {
            console.error("Share failed:", err);
        }
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
    
    updateButtonState();

    wishlistBtn.addEventListener('click', async () => {
        wishlistBtn.disabled = true;
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
        wishlistBtn.disabled = false;
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
                    div.innerHTML = `<p><strong>Q: ${qa.question}</strong></p>${qa.answer ? `<div class="answer-item"><p><strong>A:</strong> ${qa.answer}</p></div>` : ''}`;
                    qaList.appendChild(div);
                });
            }
        });
        if (currentUser) {
            qaFormContainer.innerHTML = `<h4>Ask a Question</h4><form id="qa-form" class="qa-form"><textarea id="question-input" placeholder="Type your question here..." required></textarea><button type="submit" class="cta-button message-btn" style="margin-top: 10px;">Submit Question</button><p id="qa-form-message"></p></form>`;
            document.getElementById('qa-form').addEventListener('submit', (e) => submitQuestion(e, sellerId));
        } else {
            qaFormContainer.innerHTML = `<p style="text-align: center;">Please <a href="/sell/" style="font-weight: bold;">login or register</a> to ask a question.</p>`;
        }
    } catch (error) {
        console.error("Error loading Q&A:", error);
        qaList.innerHTML = '<p style="color: red;">Could not load questions.</p>';
    }
}

async function submitQuestion(e, sellerId) {
    e.preventDefault();
    const form = e.target;
    const questionInput = form.querySelector('#question-input');
    const messageEl = form.querySelector('#qa-form-message');
    const questionText = questionInput.value.trim();
    if (!questionText) return;
    try {
        await addDoc(collection(db, 'products', productId, 'qanda'), {
            question: questionText,
            answer: null,
            askerId: currentUser.uid,
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
        setTimeout(() => messageEl.textContent = '', 3000);
    }
}
