import { db } from './firebase.js';
import { collection, query, where, getDocs, doc, getDoc, orderBy } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const sellerUsernameElement = document.getElementById('seller-username');
const sellerProductsGrid = document.getElementById('seller-products-grid');

const urlParams = new URLSearchParams(window.location.search);
const sellerId = urlParams.get('id');

async function fetchSellerInfo() {
    if (!sellerId) {
        sellerUsernameElement.textContent = "Seller not found.";
        return;
    }
    const userDocRef = doc(db, 'users', sellerId);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
        const userData = userDoc.data();
        const displayName = userData.username || "Anonymous Seller";
        sellerUsernameElement.textContent = `${displayName}'s Profile`;
        document.title = `${displayName}'s Profile | Kabale Online`;
    } else {
        sellerUsernameElement.textContent = "Seller does not exist.";
    }
}

async function fetchSellerProducts() {
    if (!sellerId) {
        sellerProductsGrid.innerHTML = "<p>Could not find seller's listings.</p>";
        return;
    }
    const q = query(collection(db, "products"), where("sellerId", "==", sellerId), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    sellerProductsGrid.innerHTML = '';
    if (querySnapshot.empty) {
        sellerProductsGrid.innerHTML = "<p>This seller has no active listings.</p>";
        return;
    }
    querySnapshot.forEach((doc) => {
        const product = doc.data();
        const primaryImage = (product.imageUrls && product.imageUrls.length > 0) ? product.imageUrls[0] : 'placeholder.webp';
        const productCardContainer = document.createElement('div');
        productCardContainer.className = 'product-card-link'; // Use same class for styling
        productCardContainer.innerHTML = `
            <a href="product.html?id=${doc.id}">
                <div class="product-card">
                    <img src="${primaryImage}" alt="${product.name}">
                    <div class="product-card-content">
                        <h3>${product.name}</h3>
                        <p class="price">UGX ${product.price.toLocaleString()}</p>
                    </div>
                </div>
            </a>
        `;
        sellerProductsGrid.appendChild(productCardContainer);
    });
}

fetchSellerInfo();
fetchSellerProducts();
