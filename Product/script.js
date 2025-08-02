// -------------------------------------------------------------------
//  1. PASTE YOUR AIRTABLE CREDENTIALS HERE (SAME AS BEFORE)
// -------------------------------------------------------------------
const AIRTABLE_PAT = 'pat_YOUR_PERSONAL_ACCESS_TOKEN';
const AIRTABLE_BASE_ID = 'app_YOUR_BASE_ID';
const AIRTABLE_TABLE_NAME = 'Products';

// -------------------------------------------------------------------
//  2. DO NOT EDIT BELOW THIS LINE
// -------------------------------------------------------------------
const productDetailContainer = document.getElementById('product-detail-container');
const placeholderImage = 'https://i.imgur.com/WJ9S92O.png';

async function fetchProductDetails() {
    // This new line gets the product ID from the page's URL
    const productId = new URLSearchParams(window.location.search).get('id');

    if (!productId) {
        productDetailContainer.innerHTML = '<p>Error: No product ID provided. Please go back to the shop and select a product.</p>';
        return;
    }

    try {
        // This URL structure is different: it asks for ONE specific record by its ID
        const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}/${productId}`;
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${AIRTABLE_PAT}` }
        });

        if (!response.ok) throw new Error('Product not found.');

        const product = await response.json();
        const fields = product.fields;
        
        // Change the page title to the product name
        document.title = `${fields.Name} - Kabale Online`;

        const imageUrl = fields.Image && fields.Image.length > 0 ? fields.Image[0].url : placeholderImage;
        let whatsappNumber = fields.SellerPhone || '';
        if (whatsappNumber.startsWith('0')) {
            whatsappNumber = '256' + whatsappNumber.substring(1);
        }

        const message = `Hello, I'm interested in your ${fields.Name} listed on Kabale Online.`;
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;

        // Create the HTML for the detailed view
        productDetailContainer.innerHTML = `
            <div class="product-detail-layout">
                <div class="product-detail-image">
                    <img src="${imageUrl}" alt="${fields.Name}">
                </div>
                <div class="product-detail-info">
                    <h1>${fields.Name}</h1>
                    <p class="product-detail-price">UGX ${fields.Price ? fields.Price.toLocaleString() : 'N/A'}</p>
                    <h3>Description</h3>
                    <p>${fields.Description ? fields.Description.replace(/\n/g, '<br>') : 'No description available.'}</p>
                    <hr>
                    <h3>Seller Information</h3>
                    <p><strong>Seller:</strong> ${fields.SellerName}</p>
                    <p><strong>Category:</strong> ${fields.Category}</p>
                    <a href="${whatsappUrl}" class="btn-cta" target="_blank">Contact Seller on WhatsApp</a>
                </div>
            </div>
        `;

    } catch (error) {
        console.error('Error fetching product details:', error);
        productDetailContainer.innerHTML = '<p>Sorry, we could not find this product. It may have been removed.</p>';
    }
}

fetchProductDetails();
