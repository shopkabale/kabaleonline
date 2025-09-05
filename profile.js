import { db } from './firebase.js';
import { collection, query, where, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const profileHeader = document.getElementById('profile-header');
const sellerProductGrid = document.getElementById('seller-product-grid');
const listingsTitle = document.getElementById('listings-title');

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const sellerId = urlParams.get('sellerId');

    if (!sellerId) {
        profileHeader.innerHTML = '<h1>Seller not found.</h1>';
        sellerProductGrid.innerHTML = '';
        return;
    }

    try {
        const q = query(
            collection(db, "products"), 
            where("sellerId", "==", sellerId), 
            orderBy("createdAt", "desc")
        );

        const querySnapshot = await getDocs(q);
        sellerProductGrid.innerHTML = ''; // Clear loading message

        if (querySnapshot.empty) {
            profileHeader.innerHTML = '<h1>Seller Profile</h1>';
            listingsTitle.textContent = 'No active listings';
            sellerProductGrid.innerHTML = '<p>This user does not have any items or services listed for sale at the moment.</p>';
            return;
        }
        
        const firstProduct = querySnapshot.docs[0].data();
        const sellerEmail = firstProduct.sellerEmail || 'this seller';
        profileHeader.innerHTML = `<h1>Seller Profile</h1><p>Viewing all listings from <strong>${sellerEmail}</strong></p>`;
        document.title = `Profile for ${sellerEmail} | Kabale Online`;

        querySnapshot.forEach((doc) => {
            const product = doc.data();
            const productId = doc.id;
            
            const primaryImage = (product.imageUrls && product.imageUrls.length > 0) ? product.imageUrls[0] : 'placeholder.webp';
            
            const productLink = document.createElement('a');
            productLink.href = `product.html?id=${productId}`;
            productLink.className = 'product-card-link';
            productLink.innerHTML = `
                <div class="product-card">
                    <img src="${primaryImage}" alt="${product.name}">
                    <h3>${product.name}</h3>
                    <p class="price">UGX ${product.price.toLocaleString()}</p>
                </div>
            `;
            sellerProductGrid.appendChild(productLink);
        });
    } catch (error) {
        console.error("Error fetching seller profile:", error);
        profileHeader.innerHTML = '<h1>Error</h1>';
        sellerProductGrid.innerHTML = '<p>Could not load this seller\'s profile. Please try again.</p>';
    }
});
