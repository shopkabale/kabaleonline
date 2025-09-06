import { db } from './firebase.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const productDetailContent = document.getElementById('product-detail-content');

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (!productId) {
        productDetailContent.innerHTML = '<p>Product not found.</p>';
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
                product.imageUrls.forEach(url => { imagesHTML += `<img src="${url}" alt="${product.name}">`; });
            }

            const storyHTML = product.story ? `<div class="product-story"><p>"${product.story}"</p></div>` : '';
            const verifiedBadge = product.sellerIsVerified ? '<span title="Verified Seller" style="color: green; font-weight: bold;">✔️</span>' : '';
            
            let sellerName = product.sellerName || 'A Seller';
            let whatsappNumber = product.whatsapp;

            if (product.sellerId) {
                 const userRef = doc(db, 'users', product.sellerId);
                 const userSnap = await getDoc(userRef);
                 if (userSnap.exists()) {
                    const userData = userSnap.data();
                    sellerName = userData.name || 'A Seller';
                    // Use profile WhatsApp number if it exists, otherwise use product's number
                    whatsappNumber = userData.whatsapp || product.whatsapp;
                 }
            }
            
            const whatsappLink = `https://wa.me/${whatsappNumber}?text=Hi, I saw your listing for '${product.name}' on Kabale Online.`;

            productDetailContent.innerHTML = `
                <div class="product-detail-container">
                    <div class="product-images">${imagesHTML}</div>
                    <div class="product-info">
                        <h1>${product.name}</h1>
                        <p class="price">UGX ${product.price.toLocaleString()}</p>
                        ${storyHTML}
                        <h3>Description</h3>
                        <p>${product.description.replace(/\n/g, '<br>')}</p>
                        <div class="seller-card">
                            <h3>About the Seller</h3>
                            <p><strong>Sold by:</strong> ${sellerName} ${verifiedBadge}</p>
                            <div class="contact-buttons">
                                <a href="${whatsappLink}" class="cta-button whatsapp-btn" target="_blank"><i class="fa-brands fa-whatsapp"></i> Chat on WhatsApp</a>
                                <a href="profile.html?sellerId=${product.sellerId}" class="cta-button profile-btn">See Seller Profile</a>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            // Add some simple styling for the new buttons
            const style = document.createElement('style');
            style.innerHTML = `
                .seller-card .contact-buttons { display: flex; flex-direction: column; gap: 10px; margin-top: 15px; }
                .seller-card .cta-button { width: 100%; text-align: center; box-sizing: border-box; }
                .whatsapp-btn { background-color: #25D366; }
                .profile-btn { background-color: #6c757d; }
            `;
            document.head.appendChild(style);

        } else {
            productDetailContent.innerHTML = '<p>Sorry, this product could not be found.</p>';
        }
    } catch (error) {
        console.error("Error fetching product:", error);
        productDetailContent.innerHTML = '<p>There was an error loading this product.</p>';
    }
});
