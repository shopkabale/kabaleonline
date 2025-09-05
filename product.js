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
            } else {
                imagesHTML = '<img src="placeholder.webp" alt="No image available">';
            }

            const storyHTML = product.story ? `<div class="product-story"><p>"${product.story}"</p></div>` : '';
            const whatsappLink = `https://wa.me/${product.whatsapp}?text=Hi, I'm interested in your '${product.name}' listing on Kabale Online.`;

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
                            <h3>Seller Information</h3>
                            <p>Contact the seller directly to arrange purchase and pickup.</p>
                            <p><strong>Seller:</strong> <a href="profile.html?sellerId=${product.sellerId}">${product.sellerEmail || 'View Profile'}</a></p>
                            <a href="${whatsappLink}" class="cta-button" target="_blank"><i class="fa-brands fa-whatsapp"></i> Chat on WhatsApp</a>
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
