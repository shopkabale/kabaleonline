import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { doc, getDoc, collection, addDoc, query, onSnapshot, serverTimestamp, orderBy } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// Main content containers from your product.html
const productDetailContent = document.getElementById('product-detail-content');
const qaList = document.getElementById('qa-list');
const qaFormContainer = document.getElementById('qa-form-container');

let currentUser = null;
const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get('id');

// --- Main execution starts here ---

if (!productId) {
    productDetailContent.innerHTML = '<h1>Product Not Found</h1><p>The product ID is missing from the URL.</p>';
} else {
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        loadProductAndSeller();
    });
}

// --- Main Function to Load and Render Everything ---

async function loadProductAndSeller() {
    try {
        // Step 1: Fetch the product document
        const productRef = doc(db, 'products', productId);
        const productSnap = await getDoc(productRef);

        if (!productSnap.exists()) {
            productDetailContent.innerHTML = '<h1>Product Not Found</h1><p>This listing may have been removed.</p>';
            return;
        }

        const productData = productSnap.data();

        // Step 2: Fetch the seller's public profile data
        const sellerRef = doc(db, 'users', productData.sellerId);
        const sellerSnap = await getDoc(sellerRef);
        const sellerData = sellerSnap.exists() ? sellerSnap.data() : {};

        // Step 3: Render the product details on the page
        renderProductDetails(productData, sellerData);

        // Step 4: Load Q&A. This is now separate and won't crash the page.
        loadQandA(productData.sellerId);

    } catch (error) {
        console.error("Critical error loading product:", error);
        productDetailContent.innerHTML = '<h1>Error</h1><p>Could not load product details. Please try again later.</p>';
    }
}


// --- Rendering Functions ---

function renderProductDetails(product, seller) {
    // Clean the main container
    productDetailContent.innerHTML = '';

    // Create the HTML structure using the fetched data
    const productElement = document.createElement('div');
    productElement.className = 'product-detail-container';

    // Format WhatsApp link
    const whatsappLink = `https://wa.me/${product.whatsapp}?text=Hello, I'm interested in your listing for '${product.name}' on Kabale Online.`;

    productElement.innerHTML = `
        <div style="flex: 1; min-width: 300px;">
            <div class="product-images">
                ${(product.imageUrls || []).map(url => `<img src="${url}" alt="${product.name}">`).join('')}
            </div>
        </div>

        <div style="flex: 1; min-width: 300px;">
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
                            ${(seller.badges || []).includes('verified') ? '<span class="badge-icon verified"><i class="fa-solid fa-circle-check"></i> Verified Seller</span>' : ''}
                        </div>
                    </div>
                </div>
                <div class="contact-buttons">
                    <a href="/chat.html?recipientId=${product.sellerId}" id="contact-seller-btn" class="cta-button message-btn">
                        <i class="fa-solid fa-comment-dots"></i> Contact Seller
                    </a>
                    <a href="${whatsappLink}" target="_blank" class="cta-button whatsapp-btn">
                        <i class="fa-brands fa-whatsapp"></i> Chat on WhatsApp
                    </a>
                    <a href="/profile.html?sellerId=${product.sellerId}" class="cta-button profile-btn">View Profile</a>
                </div>
            </div>
        </div>
    `;

    productDetailContent.appendChild(productElement);

    // Disable contact button if user is viewing their own product
    if (currentUser && currentUser.uid === product.sellerId) {
        const contactBtn = productElement.querySelector('#contact-seller-btn');
        contactBtn.style.pointerEvents = 'none';
        contactBtn.style.backgroundColor = '#ccc';
        contactBtn.textContent = 'This is your listing';
    }
}


// --- Q&A Functions ---

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
                    div.innerHTML = `
                        <p><strong>Q: ${qa.question}</strong></p>
                        ${qa.answer ? `<div class="answer-item"><p><strong>A:</strong> ${qa.answer}</p></div>` : ''}
                    `;
                    qaList.appendChild(div);
                });
            }
        });

        // Setup the form for asking a new question
        if (currentUser) {
            qaFormContainer.innerHTML = `
                <h4>Ask a Question</h4>
                <form id="qa-form" class="qa-form">
                    <textarea id="question-input" placeholder="Type your question here..." required></textarea>
                    <button type="submit" class="cta-button wishlist-btn" style="margin-top: 10px;">Submit Question</button>
                    <p id="qa-form-message" class="qa-form-message"></p>
                </form>
            `;
            document.getElementById('qa-form').addEventListener('submit', (e) => submitQuestion(e, sellerId));
        } else {
            qaFormContainer.innerHTML = `<p style="text-align: center;">Please <a href="/sell/" style="font-weight: bold;">login or register</a> to ask a question.</p>`;
        }

    } catch (error) {
        console.error("Error loading Q&A:", error);
        qaList.innerHTML = '<p style="color: red;">Could not load questions at this time. The seller may need to configure this section.</p>';
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
