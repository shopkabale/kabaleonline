// In shop/product.js
document.addEventListener('DOMContentLoaded', async () => {
    const productContainer = document.getElementById('product-detail-container');

    // Get the product ID from the URL (e.g., ?id=123)
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id');

    if (!productId) {
        productContainer.innerHTML = '<h2>Product not found</h2><p>No product ID was provided.</p>';
        return;
    }

    try {
        // Fetch the details for this specific product
        const response = await fetch(`/.netlify/functions/get-product-by-id?id=${productId}`);
        if (!response.ok) {
            throw new Error('Product could not be loaded.');
        }
        const product = await response.json();

        // Format the data
        const imageUrl = product.ImageURL || '';
        const formattedPrice = new Intl.NumberFormat('en-US').format(product.Price);
        const whatsappLink = `https://wa.me/${product.SellerPhone.replace(/\D/g,'')}`; // Formats a clean WhatsApp link

        // Display the product details on the page
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
