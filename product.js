import { db, auth } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { doc, getDoc, collection, query, orderBy, addDoc, onSnapshot, updateDoc, setDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const productDetailContent = document.getElementById('product-detail-content');
const qaList = document.getElementById('qa-list');
const qaFormContainer = document.getElementById('qa-form-container');

let currentProductId = null;
let currentUserId = null;
let currentProductSellerId = null;

onAuthStateChanged(auth, async (user) => {
    currentUserId = user ? user.uid : null;
    renderQaForm();

    // NEW: Logic to show/hide user-specific buttons
    if (user && currentProductSellerId && user.uid !== currentProductSellerId) {
        // Show Wishlist Button
        const wishlistBtn = document.getElementById('add-to-wishlist-btn');
        if (wishlistBtn) {
            wishlistBtn.style.display = 'block';
            // Check if already in wishlist
            const wishlistItemRef = doc(db, `users/${user.uid}/wishlist`, currentProductId);
            const wishlistItemSnap = await getDoc(wishlistItemRef);
            if (wishlistItemSnap.exists()) {
                wishlistBtn.innerHTML = '<i class="fa-solid fa-heart"></i> In Wishlist';
                wishlistBtn.disabled = true;
            }
        }
        // Show Message Button
        const messageBtn = document.getElementById('message-seller-btn');
         if(messageBtn) {
            messageBtn.style.display = 'block';
            // Create a unique chat room ID by sorting the two user IDs
            const chatRoomId = [user.uid, currentProductSellerId].sort().join('_');
            messageBtn.href = `/chat.html?chatId=${chatRoomId}&recipientId=${currentProductSellerId}`;
        }
    }
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

            let imagesHTML = '';
            if (product.imageUrls && product.imageUrls.length > 0) {
                product.imageUrls.forEach(url => { imagesHTML += `<img src="${url}" alt="${product.name}">`; });
            }

            const storyHTML = product.story ? `<div class="product-story"><p>"${product.story}"</p></div>` : '';
            let sellerName = product.sellerName || 'A Seller';
            let whatsappNumber = product.whatsapp;
            if (product.sellerId) {
                 const userRef = doc(db, 'users', product.sellerId);
                 const userSnap = await getDoc(userRef);
                 if (userSnap.exists()) {
                    sellerName = userSnap.data().name || 'A Seller';
                    whatsappNumber = userSnap.data().whatsapp || product.whatsapp;
                 }
            }
            const whatsappLink = `https://wa.me/${whatsappNumber}?text=Hi, I saw your listing for '${product.name}' on Kabale Online.`;

            productDetailContent.innerHTML = `
                <div class="product-detail-container">
                    <div class="product-images">${imagesHTML}</div>
                    <div class="product-info">
                        <div class="product-title-header">
                            <h1>${product.name}</h1>
                            <button id="share-btn" title="Share Product"><i class="fa-solid fa-share-nodes"></i></button>
                        </div>
                        <p class="price" style="font-size: 1.8em; color: #007bff; font-weight: bold;">UGX ${product.price.toLocaleString()}</p>
                        ${storyHTML}
                        <h3>Description</h3>
                        <p>${product.description.replace(/\n/g, '<br>')}</p>
                        <div class="seller-card">
                            <h3>Contact Seller</h3>
                            <div class="contact-buttons">
                                <a href="${whatsappLink}" class="cta-button whatsapp-btn" target="_blank"><i class="fa-brands fa-whatsapp"></i> Chat on WhatsApp</a>
                                <a id="message-seller-btn" href="#" class="cta-button" style="background-color: #5a6268; display: none;"><i class="fa-regular fa-comments"></i> Message Seller</a>
                                <button id="add-to-wishlist-btn" class="cta-button" style="background-color: #007bff; display: none;"><i class="fa-regular fa-heart"></i> Add to Wishlist</button>
                                
                                <a href="profile.html?sellerId=${product.sellerId}" class="cta-button profile-btn" style="background-color: #34495e;">See Seller Profile</a>
                            </div>
                        </div>
                    </div>
                </div>`;

            const shareBtn = document.getElementById('share-btn');
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
                        await navigator.clipboard.writeText(window.location.href);
                        alert('Product link copied to clipboard!');
                    }
                } catch (err) {
                    console.error('Error sharing:', err);
                    alert('Could not share or copy link.');
                }
            });
            
            // NEW: Add event listener for the wishlist button
            const wishlistBtn = document.getElementById('add-to-wishlist-btn');
            if (wishlistBtn) {
                wishlistBtn.addEventListener('click', () => addToWishlist(product));
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


// NEW: Function to add a product to the user's wishlist
async function addToWishlist(productData) {
    if (!currentUserId || !currentProductId) {
        alert("You must be logged in to add items to your wishlist.");
        return;
    }

    const wishlistBtn = document.getElementById('add-to-wishlist-btn');
    wishlistBtn.disabled = true;
    wishlistBtn.innerHTML = 'Adding...';

    try {
        const wishlistItemRef = doc(db, `users/${currentUserId}/wishlist`, currentProductId);
        await setDoc(wishlistItemRef, {
            productId: currentProductId,
            addedAt: new Date(),
            name: productData.name,
            price: productData.price,
            imageUrl: productData.imageUrls?.[0] || ''
        });
        wishlistBtn.innerHTML = '<i class="fa-solid fa-heart"></i> Added to Wishlist';
    } catch (error) {
        console.error("Error adding to wishlist: ", error);
        alert("Failed to add item to wishlist. Please try again.");
        wishlistBtn.innerHTML = '<i class="fa-regular fa-heart"></i> Add to Wishlist';
        wishlistBtn.disabled = false;
    }
}

function renderQaForm() {
    if (currentUserId) {
        qaFormContainer.innerHTML = `
            <form id="qa-form" class="qa-form">
                <p id="qa-message" style="display:none;"></p>
                <textarea id="qa-input" placeholder="Ask a public question..." required></textarea>
                <button type="submit" class="cta-button">Post Question</button>
            </form>
        `;
        document.getElementById('qa-form').addEventListener('submit', handleQuestionSubmit);
    } else {
        qaFormContainer.innerHTML = `<p style="text-align: center;">Please <a href="/sell/" style="font-weight: bold;">login or register</a> to ask a question.</p>`;
    }
}

async function handleQuestionSubmit(e) {
    e.preventDefault();
    const input = document.getElementById('qa-input');
    const messageEl = document.getElementById('qa-message');
    const question = input.value.trim();

    if (!currentUserId || !currentProductSellerId) {
        messageEl.textContent = 'Failed to submit question. Please try again.';
        messageEl.style.display = 'block';
        messageEl.style.color = 'red';
        return;
    }

    if (!question) {
        messageEl.textContent = 'Please type a question.';
        messageEl.style.display = 'block';
        messageEl.style.color = 'red';
        return;
    }

    try {
        await addDoc(collection(db, `products/${currentProductId}/qanda`), {
            question: question,
            askerId: currentUserId,
            sellerId: currentProductSellerId,
            createdAt: new Date()
        });

        input.value = '';
        messageEl.textContent = 'Question submitted successfully!';
        messageEl.style.display = 'block';
        messageEl.style.color = 'green';
    } catch (error) {
        console.error("Error adding question:", error);
        messageEl.textContent = 'Failed to submit question. Please try again.';
        messageEl.style.display = 'block';
        messageEl.style.color = 'red';
    }
}

function fetchQuestions() {
    if (!currentProductId) return;

    const q = query(collection(db, `products/${currentProductId}/qanda`), orderBy('createdAt', 'desc'));

    onSnapshot(q, async (querySnapshot) => {
        qaList.innerHTML = '';
        if (querySnapshot.empty) {
            qaList.innerHTML = '<p>No questions yet. Be the first to ask!</p>';
            return;
        }

        const questionsPromises = querySnapshot.docs.map(async docSnapshot => {
            const qaData = docSnapshot.data();
            const askerDoc = await getDoc(doc(db, 'users', qaData.askerId));
            const askerName = askerDoc.exists() ? askerDoc.data().name : 'Anonymous';

            let answerHtml = '';
            if (qaData.answer) {
                answerHtml = `<div class="answer-item"><strong>Seller's Answer:</strong> ${qaData.answer}</div>`;
            }

            return `
                <div class="question-item">
                    <strong>${askerName} asked:</strong> ${qaData.question}
                    ${answerHtml}
                </div>
            `;
        });

        const questionsHtmlArray = await Promise.all(questionsPromises);
        qaList.innerHTML = questionsHtmlArray.join('');
    });
}
