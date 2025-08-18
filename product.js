// In product.js
async function fetchProductDetails() {
    // ... (get productId from URL)
    try {
        const docSnap = await getDoc(doc(db, "products", productId));
        if (docSnap.exists()) {
            const product = docSnap.data();
            // ... (set title, create whatsappLink)
            let imagesHTML = '';
            if (product.imageUrls && product.imageUrls.length > 0) {
                product.imageUrls.forEach(url => {
                    imagesHTML += `<img src="${url}" alt="${product.name}">`;
                });
            }
            productDetailContent.innerHTML = `
                <div class="product-detail-layout">
                    <div class="product-detail-image-gallery">
                        ${imagesHTML}
                    </div>
                    <div class="product-detail-info">
                        </div>
                </div>
            `;
        } // ...
    } catch (error) { /* ... */ }
}
