import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { doc, getDoc, setDoc, deleteDoc, collection, addDoc, query, onSnapshot, serverTimestamp, orderBy } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- GLOBAL VARIABLES ---
const qaList = document.getElementById('qa-list');
const qaFormContainer = document.getElementById('qa-form-container');
let currentUser = null;

// --- INITIALIZE PAGE ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Get the data that the server embedded in the page
    const dataScript = document.getElementById('product-data');
    if (!dataScript) {
        console.error('Product data script not found!');
        return;
    }
    const { product, seller } = JSON.parse(dataScript.textContent);

    if (!product || !seller) {
        console.error('Product or seller data is missing!');
        return;
    }

    // 2. Set up interactivity once we know the user's auth state
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        initializeInteractiveFeatures(product, seller);
    });
});

// --- MAIN INTERACTIVITY FUNCTION ---
function initializeInteractiveFeatures(product, seller) {
    // These functions now just find elements and attach listeners
    setupShareButton(product, seller);
    loadQandA(product, seller);

    if (currentUser && currentUser.uid !== product.sellerId) {
        setupWishlistButton(product);
    }
    
    // Disable contact buttons if the current user is the seller
    if (currentUser && currentUser.uid === product.sellerId) {
        const contactBtn = document.getElementById('contact-seller-btn');
        if(contactBtn) {
            contactBtn.style.pointerEvents = 'none';
            contactBtn.style.backgroundColor = '#ccc';
            contactBtn.textContent = 'This is your listing';
        }
    }
}


// --- INTERACTIVE FEATURE FUNCTIONS ---

function setupShareButton(product, seller) {
    const shareBtn = document.getElementById('share-btn');
    if (!shareBtn) return;
    shareBtn.addEventListener('click', async () => {
        let shortDescription = product.description;
        if (shortDescription && shortDescription.length > 120) {
            shortDescription = shortDescription.substring(0, 120) + '...';
        }
        const shareText = `*PRODUCT DETAILS*\n\n` +
                        `*Seller:* ${seller.name || 'Seller'}\n` +
                        `*Price:* UGX ${product.price.toLocaleString()}\n` +
                        `*Description:* ${shortDescription}\n\n` +
                        `*Link:* ${window.location.href}\n\n` +
                        `#kabaleonline_market`;
        const shareData = { title: `Check out: ${product.name}`, text: shareText, url: window.location.href };
        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(shareText);
                alert('Product details copied to clipboard!');
            }
        } catch (err) {
            console.error("Share failed:", err);
            await navigator.clipboard.writeText(window.location.href);
            alert('Sharing failed. Link copied to clipboard instead.');
        }
    });
}

async function setupWishlistButton(product) {
    const wishlistBtn = document.getElementById('wishlist-btn');
    if (!wishlistBtn) return;
    wishlistBtn.style.display = 'flex';
    const wishlistRef = doc(db, 'users', currentUser.uid, 'wishlist', product.id);
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

function loadQandA(product) {
    const qandaRef = collection(db, 'products', product.id, 'qanda');
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
            document.getElementById('qa-form').addEventListener('submit', (e) => submitQuestion(e, product));
        } else {
            qaFormContainer.innerHTML = `<p style="text-align: center;">Please <a href="/login/" style="font-weight: bold;">login or register</a> to ask a question.</p>`;
        }
    } catch (error) {
        console.error("Error loading Q&A:", error);
        qaList.innerHTML = '<p style="color: red;">Could not load questions.</p>';
    }
}

async function submitQuestion(e, product) {
    e.preventDefault();
    const form = e.target;
    const questionInput = form.querySelector('#question-input');
    const messageEl = form.querySelector('#qa-form-message');
    const questionText = questionInput.value.trim();
    if (!questionText) return;
    try {
        await addDoc(collection(db, 'products', product.id, 'qanda'), {
            question: questionText,
            answer: null,
            askerId: currentUser.uid,
            sellerId: product.sellerId,
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