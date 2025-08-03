// NOTE: Airtable credentials are now removed from this file, making it secure.

const productDetailContainer = document.getElementById('product-detail-container');
const placeholderImage = 'https.i.imgur.com/WJ9S92O.png';

async function fetchProductDetails() {
    const productId = new URLSearchParams(window.location.search).get('id');

    if (!productId) {
        productDetailContainer.innerHTML = '<p>Error: No product ID provided.</p>';
        return;
    }

    try {
        // This now calls our new, secure caching function
        const url = `/.netlify/functions/get-product-detail?id=${productId}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Product not found.');
        
        const product = await response.json();
        const fields = product.fields;
        
        document.title = `${fields.Name} - Kabale Online`;

        const images = fields.Image && fields.Image.length > 0 ? fields.Image : [{ url: placeholderImage }];
        let thumbnailsHTML = '';
        images.forEach((image, index) => {
            thumbnailsHTML += `<img src="${image.url}" alt="Thumbnail ${index + 1}" class="${index === 0 ? 'active' : ''}" data-index="${index}">`;
        });
        
        const whatsappUrl = createWhatsAppLink(fields.SellerPhone, fields.Name);

        productDetailContainer.innerHTML = `
            <div class="product-detail-layout">
                <div class="product-detail-image">
                    <img src="${images[0].url}" alt="${fields.Name}" class="product-detail-main-image" id="main-image">
                    <div class="gallery-thumbnails" id="thumbnail-container">
                        ${thumbnailsHTML}
                    </div>
                </div>
                <div class="product-detail-info">
                    <h1>${fields.Name}</h1>
                    <p class="product-detail-price">UGX ${fields.Price ? fields.Price.toLocaleString() : 'N/A'}</p>
                    <h3>Description</h3>
                    <p>${fields.Description ? fields.Description.replace(/\n/g, '<br>') : 'No description available.'}</p>
                    <hr>
                    <h3>Item Information</h3>
                    <p><strong>Seller:</strong> ${fields.SellerName || 'N/A'}</p>
                    <p><strong>Category:</strong> ${fields.Category || 'N/A'}</p>
                    <p><strong>District:</strong> ${fields.District || 'N/A'}</p>
                    <p><strong>Neighborhood:</strong> ${fields.Neighborhood || 'N/A'}</p>
                    <a href="${whatsappUrl}" class="btn-cta" target="_blank">Contact Seller on WhatsApp</a>
                </div>
            </div>
        `;
        
        setupThumbnailListeners(images);

    } catch (error) {
        console.error('Error fetching product details:', error);
        productDetailContainer.innerHTML = '<p>Sorry, we could not find this product. It may have been removed.</p>';
    }
}

function setupThumbnailListeners(images) {
    const mainImage = document.getElementById('main-image');
    const thumbnailContainer = document.getElementById('thumbnail-container');

    thumbnailContainer.addEventListener('click', (event) => {
        if (event.target.tagName === 'IMG') {
            const imageIndex = event.target.dataset.index;
            mainImage.src = images[imageIndex].url;
            document.querySelectorAll('#thumbnail-container img').forEach(img => img.classList.remove('active'));
            event.target.classList.add('active');
        }
    });
}

function createWhatsAppLink(phone, productName) {
    let whatsappNumber = phone || '';
    if (whatsappNumber.startsWith('0')) {
        whatsappNumber = '256' + whatsappNumber.substring(1);
    }
    const message = `Hello, I'm interested in your ${productName} listed on Kabale Online.`;
    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
}

fetchProductDetails();
