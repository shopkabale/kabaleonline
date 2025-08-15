// The complete and corrected script for Product/script.js
document.addEventListener('DOMContentLoaded', async () => {
    const productContainer = document.getElementById('product-detail-container');

    // Get the product ID from the URL (e.g., ?id=1)
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id');

    if (!productId) {
        productContainer.innerHTML = '<h2>Product not found</h2><p>No product ID was provided in the URL.</p>';
        return;
    }

    try {
        // --- THIS IS THE CORRECTED FUNCTION NAME ---
        const response = await fetch(`/.netlify/functions/get-product-detail?id=${productId}`);
        
        if (!response.ok) {
            throw new Error('Product could not be loaded.');
        }
        const product = await response.json();

        // Format the data for display
        const imageUrl = product.ImageURL || '';
        const formattedPrice = new Intl.NumberFormat('en-US').format(product.Price);
        
        // Create a clean WhatsApp link, removing any non-digit characters from the phone number
        const whatsappLink = `https://wa.me/${product.SellerPhone.replace(/\D/g,'')}`;

        // Create and display the product details on the page
        productContainer.innerHTML = `
            <div class="product-detail-layout">
                <div class="product-detail-image">
                    ${imageUrl ? `<img src="${imageUrl}" alt="${product.Name}">` : '<div class="product-image-placeholder"></div>'}
                </div>
                <div class="product-detail-info">
                    <h1>${product.Name}</h1>
                    <p class="product-detail-price">UGX ${formattedPrice}</p>
                    <hr>
                    <h3>Product Details</h3>
                    <p>${product.Description.replace(/\n/g, '<br>')}</p>
                    <hr>
                    <h3>Seller Information</h3>
                    <p><strong>Name:</strong> ${product.SellerName}</p>
                    <p><strong>Phone:</strong> ${product.SellerPhone}</p>
                    <a href="${whatsappLink}" class="btn-whatsapp" target="_blank">
                        <i class="fa-brands fa-whatsapp"></i> Contact Seller on WhatsApp
                    </a>
                </div>
            </div>
        `;
    } catch (error) {
        productContainer.innerHTML = `<h2>Error</h2><p>${error.message}</p>`;
    }
});
