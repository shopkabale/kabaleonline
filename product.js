import { db } from './firebase.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const productDetailContent = document.getElementById('product-detail-content');

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (!productId) {
        productDetailContent.innerHTML = '<p>Product not found. Please go back and select a product.</p>';
        return;
    }

    try {
        const productRef = doc(db, 'products', productId);
        const docSnap = await getDoc(productRef);

        if (docSnap.exists()) {
            const product = docSnap.data();
            document.title = `${product.name} | Kabale Online`;

            let imagesHTML = '';
            if (product.imageUrls && product.imageUrls.length > 0) {
                product.imageUrls.forEach(url => {
                    imagesHTML += `<img src="${url}" alt="${product.name}">`;
                });
            }

            const storyHTML = product.story ? `<div class="product-story"><p>"${product.story}"</p></div>` : '';
            const verifiedBadge = product.sellerIsVerified ? '<span title="Verified Seller" style="color: green; font-weight: bold;">✔️</span>' : '';
            
            // Fetch the seller's name as a fallback
            let sellerName = product.sellerName || 'A Seller';
            if (!product.sellerName && product.sellerId) {
                 const userRef = doc(db, 'users', product.sellerId);
                 const userSnap = await getDoc(userRef);
                 if (userSnap.exists()) {
                    sellerName = userSnap.data().name || 'A Seller';
                 }
            }

            productDetailContent.innerHTML = `
                <div class="product-detail-container">
                    <div class="product-images">
                        ${imagesHTML}
                    </div>
                    <div class="product-info">
                        <h1>${product.name}</h1>
                        <p class="price" style="font-size: 1.8em; color: #007bff; font-weight: bold;">UGX ${product.price.toLocaleString()}</p>
                        
                        ${storyHTML}

                        <h3>Description</h3>
                        <p>${product.description.replace(/\n/g, '<br>')}</p>
                        
                        <div class="seller-card">
                            <h3>About the Seller</h3>
                            <p><strong>Sold by:</strong> ${sellerName} ${verifiedBadge}</p>
                            <a href="profile.html?sellerId=${product.sellerId}" class="cta-button" style="width:100%; text-align:center;">See Seller Profile to Contact</a>
                        </div>
                    </div>
                </div>
            `;
        } else {
            productDetailContent.innerHTML = '<p>Sorry, this product could not be found. It may have been sold or removed.</p>';
        }
    } catch (error) {
        console.error("Error fetching product:", error);
        productDetailContent.innerHTML = '<p>There was an error loading this product. Please try again later.</p>';
    }
});
