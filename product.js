import { db } from './firebase.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const productDetailContent = document.getElementById('product-detail-content');

// Get the product ID from the URL query parameter
const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get('id');

async function fetchProductDetails() {
    if (!productId) {
        productDetailContent.innerHTML = '<p>Product not found. Please go back to the homepage.</p>';
        return;
    }

    try {
        const productRef = doc(db, "products", productId);
        const docSnap = await getDoc(productRef);

        if (docSnap.exists()) {
            const product = docSnap.data();
            
            // Set the page title to the product name
            document.title = product.name + ' | Kabale Online';

            // Create the WhatsApp message
            const message = encodeURIComponent(`Hello, I'm interested in your product: ${product.name} - Price: UGX ${product.price}`);
            const whatsappLink = `https://wa.me/${product.whatsapp}?text=${message}`;

            // Create HTML for all images, with a safeguard for old data
            let imagesHTML = '';
            // This line checks for the new 'imageUrls' array, but falls back to the old 'imageUrl' if needed
            const imageUrls = product.imageUrls || [product.imageUrl]; 

            if (imageUrls && imageUrls.length > 0) {
                imageUrls.forEach(url => {
                    if(url) { // Make sure the url is not null or empty
                        imagesHTML += `<img src="${url}" alt="${product.name}">`;
                    }
                });
            }

            // Populate the page with product data
            productDetailContent.innerHTML = `
                <div class="product-detail-layout">
                    <div class="product-detail-image-gallery">
                        ${imagesHTML}
                    </div>
                    <div class="product-detail-info">
                        <h1>${product.name}</h1>
                        <p class="price">UGX ${product.price.toLocaleString()}</p>
                        <p class="description">${product.description}</p>
                        <a href="${whatsappLink}" target="_blank" class="whatsapp-btn">
                            Contact Seller on WhatsApp
                        </a>
                    </div>
                </div>
            `;
        } else {
            productDetailContent.innerHTML = '<p>Sorry, this product does not exist.</p>';
        }
    } catch (error) {
        console.error("Error fetching product details:", error);
        productDetailContent.innerHTML = '<p>There was an error loading this product.</p>';
    }
}

fetchProductDetails();
