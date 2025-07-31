document.addEventListener('DOMContentLoaded', () => {
    
    const businessWhatsAppNumber = '256784655792';

    const sellForm = document.getElementById('sell-item-form');

    // Create a div to hold the thank you message
    const thankYouMessage = document.createElement('div');
    thankYouMessage.id = 'thank-you-message';
    thankYouMessage.style.marginTop = '1rem';
    thankYouMessage.style.color = 'green';
    thankYouMessage.style.fontWeight = 'bold';
    sellForm.parentNode.insertBefore(thankYouMessage, sellForm.nextSibling); // Place it right after the form

    sellForm.addEventListener('submit', (event) => {
        event.preventDefault();

        // Get values
        const productName = document.getElementById('product-name').value;
        const productPrice = document.getElementById('product-price').value;
        const productQuality = document.getElementById('product-quality').value;
        const productCategory = document.getElementById('product-category').value;
        const productDescription = document.getElementById('product-description').value;
        const sellerName = document.getElementById('seller-name').value;

        const formattedPrice = new Intl.NumberFormat('en-US').format(productPrice);

        const message = `
*New Item Submission for Kabale Online*

*Product Name:* ${productName}
*Price:* UGX ${formattedPrice}
*Condition:* ${productQuality}
*Category:* ${productCategory}

*Description:*
${productDescription || 'No description provided.'}

---
*Seller Name:* ${sellerName}
        `;

        const encodedMessage = encodeURIComponent(message.trim());
        const whatsappURL = `https://wa.me/${businessWhatsAppNumber}?text=${encodedMessage}`;

        // ✅ Show thank you message and clear form BEFORE opening WhatsApp
        thankYouMessage.textContent = '✅ Thank you! Your product information has been sent via WhatsApp.';
        sellForm.reset();

        // ✅ Now open WhatsApp
        window.open(whatsappURL, '_blank');
    });
});