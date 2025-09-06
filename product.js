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
                            <h3>About the Seller</h3>
                            <div class="contact-buttons">
                                <a href="${whatsappLink}" class="cta-button whatsapp-btn" target="_blank" style="background-color: #25D366;"><i class="fa-brands fa-whatsapp"></i> Chat on WhatsApp</a>
                                <a href="profile.html?sellerId=${product.sellerId}" class="cta-button profile-btn" style="background-color: #6c757d;">See Seller Profile</a>
                            </div>
                        </div>
                    </div>
                </div>`;

            // --- NEW SHARE BUTTON LOGIC START ---
            const shareBtn = document.getElementById('share-btn');
            shareBtn.addEventListener('click', async () => {
                const shareData = {
                    title: product.name,
                    text: `Check out this listing on Kabale Online: ${product.name}`,
                    url: window.location.href
                };
                try {
                    if (navigator.share) {
                        // Use the modern Web Share API on mobile
                        await navigator.share(shareData);
                    } else {
                        // Fallback for desktop: copy link to clipboard
                        await navigator.clipboard.writeText(window.location.href);
                        alert('Product link copied to clipboard!');
                    }
                } catch (err) {
                    console.error('Error sharing:', err);
                    alert('Could not share or copy link.');
                }
            });
            // --- NEW SHARE BUTTON LOGIC END ---
            
        } else {
            productDetailContent.innerHTML = '<p>Sorry, this product could not be found.</p>';
        }
    } catch (error) {
        console.error("Error fetching product:", error);
        productDetailContent.innerHTML = '<p>There was an error loading this product.</p>';
    }
});
