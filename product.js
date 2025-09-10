import { db, auth } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { doc, getDoc, collection, query, orderBy, addDoc, onSnapshot, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const productDetailContent = document.getElementById('product-detail-content');
const qaList = document.getElementById('qa-list');
const qaFormContainer = document.getElementById('qa-form-container');

let currentProductId = null;
let currentUserId = null; // We will still track this to know if the user is logged in
let currentProductSellerId = null;

// Listen for authentication changes to keep track of the current user's ID
onAuthStateChanged(auth, (user) => {
    currentUserId = user ? user.uid : null;
    renderQaForm(); // This function can still update based on login status
});

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    currentProductId = productId;

    if (!productId) {
        productDetailContent.innerHTML = '<p>Product not found.</p>';
        return;
    }

    try {
        const productRef = doc(db, 'products', productId);
        const docSnap = await getDoc(productRef);

        if (docSnap.exists()) {
            const product = docSnap.data();
            currentProductSellerId = product.sellerId;
            document.title = `${product.name} | Kabale Online`;
            
            let imagesHTML = product.imageUrls?.map(url => `<img src="${url}" alt="${product.name}">`).join('') || '';
            const storyHTML = product.story ? `<div class="product-story"><p>"${product.story}"</p></div>` : '';
            const whatsappLink = `https://wa.me/${product.whatsapp}?text=Hi, I saw your listing for '${product.name}' on Kabale Online.`;

            // --- MODIFIED HTML BLOCK ---
            // The user-action-buttons container is now always visible.
            // We removed style="display: none;"
            productDetailContent.innerHTML = `
                <div class="product-detail-container">
                    <div class="product-images">${imagesHTML}</div>
                    <div class="product-info">
                        <div class="product-title-header"><h1>${product.name}</h1></div>
                        <p class="price">UGX ${product.price.toLocaleString()}</p>
                        ${storyHTML}
                        <h3>Description</h3>
                        <p>${product.description.replace(/\n/g, '<br>')}</p>
                        <div class="seller-card">
                            <h3>About the Seller</h3>
                            <div class="contact-buttons">
                                <a href="${whatsappLink}" class="cta-button whatsapp-btn" target="_blank"><i class="fa-brands fa-whatsapp"></i> Chat on WhatsApp</a>
                                <a href="profile.html?sellerId=${product.sellerId}" class="cta-button profile-btn">See Seller Profile</a>
                            </div>
                            <div id="user-action-buttons" class="contact-buttons" style="margin-top: 10px; flex-direction: column; gap: 10px;">
                                <a id="message-seller-btn" href="#" class="cta-button message-btn"><i class="fa-regular fa-comments"></i> Send Message</a>
                                <button id="add-to-wishlist-btn" class="cta-button wishlist-btn"><i class="fa-regular fa-heart"></i> Add to Wishlist</button>
                            </div>
                        </div>
                    </div>
                </div>`;
            
            // Re-attach event listeners to the newly created elements
            document.getElementById('message-seller-btn').addEventListener('click', handleSendMessageClick);
            document.getElementById('add-to-wishlist-btn').addEventListener('click', () => handleAddToWishlistClick(product));
            
            // If the logged-in user is the seller, hide the buttons after they've been created.
            if (currentUserId && currentUserId === currentProductSellerId) {
                document.getElementById('user-action-buttons').style.display = 'none';
            }
            
            fetchQuestions();

        } else {
            productDetailContent.innerHTML = '<p>Sorry, this product could not be found.</p>';
        }
    } catch (error) {
        console.error("Error fetching product:", error);
        productDetailContent.innerHTML = '<p>There was an error loading this product.</p>';
    }
});

// --- NEW Event Handlers with Login Prompts ---

function handleSendMessageClick(e) {
    e.preventDefault(); // Prevent the link from navigating immediately
    if (currentUserId) {
        // If the user is logged in, build the chat link and go there
        const chatRoomId = [currentUserId, currentProductSellerId].sort().join('_');
        window.location.href = `/chat.html?chatId=${chatRoomId}&recipientId=${currentProductSellerId}`;
    } else {
        // If the user is NOT logged in, prompt them to sign in
        alert("Please log in or create an account to send a message.");
        window.location.href = '/sell/'; // Redirect to login/signup page
    }
}

async function handleAddToWishlistClick(productData) {
    if (!currentUserId) {
        // If the user is NOT logged in, prompt them to sign in
        alert("Please log in or create an account to save items to your wishlist.");
        window.location.href = '/sell/'; // Redirect to login/signup page
        return;
    }

    // If the user IS logged in, proceed with adding to wishlist
    const wishlistBtn = document.getElementById('add-to-wishlist-btn');
    wishlistBtn.disabled = true;
    wishlistBtn.innerHTML = 'Adding...';

    try {
        const wishlistItemRef = doc(db, `users/${currentUserId}/wishlist`, currentProductId);
        await setDoc(wishlistItemRef, {
            productId: currentProductId,
            addedAt: serverTimestamp(),
            name: productData.name,
            price: productData.price,
            imageUrl: productData.imageUrls?.[0] || ''
        });
        wishlistBtn.innerHTML = '<i class="fa-solid fa-heart"></i> Added to Wishlist';
    } catch (error) {
        console.error("Error adding to wishlist: ", error);
        alert("Failed to add item to wishlist.");
        wishlistBtn.disabled = false;
        wishlistBtn.innerHTML = '<i class="fa-regular fa-heart"></i> Add to Wishlist';
    }
}

// --- Q&A Functions (No changes below this line) ---

function renderQaForm() {
    if (currentUserId) {
        qaFormContainer.innerHTML = `
            <form id="qa-form" class="qa-form">
                <textarea id="qa-input" placeholder="Ask a public question..." required></textarea>
                <button type="submit" class="cta-button">Post Question</button>
            </form>`;
        document.getElementById('qa-form').addEventListener('submit', handleQuestionSubmit);
    } else {
        qaFormContainer.innerHTML = `<p style="text-align: center;">Please <a href="/sell/">log in</a> to ask a question.</p>`;
    }
}

async function handleQuestionSubmit(e) {
    e.preventDefault();
    const input = document.getElementById('qa-input');
    const question = input.value.trim();
    if (!question) return;
    try {
        await addDoc(collection(db, `products/${currentProductId}/qanda`), {
            question: question,
            askerId: currentUserId,
            sellerId: currentProductSellerId,
            createdAt: serverTimestamp(),
            answer: null
        });
        input.value = '';
    } catch (error) {
        console.error("Error submitting question:", error);
        alert("Could not submit your question.");
    }
}

function fetchQuestions() {
    const q = query(collection(db, `products/${currentProductId}/qanda`), orderBy('createdAt', 'desc'));
    onSnapshot(q, async (querySnapshot) => {
        if (querySnapshot.empty) {
            qaList.innerHTML = '<p>No questions yet. Be the first to ask!</p>';
            return;
        }
        const questionsPromises = querySnapshot.docs.map(async (docSnapshot) => {
            const qaData = docSnapshot.data();
            const askerDoc = await getDoc(doc(db, 'users', qaData.askerId));
            const askerName = askerDoc.exists() ? askerDoc.data().name : 'Anonymous';
            const answerHtml = qaData.answer ? `<div class="answer-item"><strong>Seller's Answer:</strong> ${qaData.answer}</div>` : '';
            return `<div class="question-item"><strong>${askerName} asked:</strong> ${qaData.question}${answerHtml}</div>`;
        });
        const questionsHtmlArray = await Promise.all(questionsPromises);
        qaList.innerHTML = questionsHtmlArray.join('');
    });
}
