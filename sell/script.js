document.addEventListener('DOMContentLoaded', () => {
    
    // Replace this with your actual WhatsApp number, including the country code without '+' or '00'.
    const businessWhatsAppNumber = '256784655792'; // Example for Uganda: 256xxxxxxxxx

    const sellForm = document.getElementById('sell-item-form');

    sellForm.addEventListener('submit', (event) => {
        // Prevent the form from submitting the traditional way
        event.preventDefault();

        // Get values from the form fields
        const productName = document.getElementById('product-name').value;
        const productPrice = document.getElementById('product-price').value;
        const productQuality = document.getElementById('product-quality').value;
        const productCategory = document.getElementById('product-category').value;
        const productDescription = document.getElementById('product-description').value;
        const sellerName = document.getElementById('seller-name').value;

        // Format the price with commas for readability
        const formattedPrice = new Intl.NumberFormat('en-US').format(productPrice);

        // Construct the message for WhatsApp
        // Using asterisks for bold and other formatting that WhatsApp recognizes
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
        
        // Encode the message for use in a URL
        const encodedMessage = encodeURIComponent(message.trim());

        // Create the WhatsApp URL
        const whatsappURL = `https://wa.me/${businessWhatsAppNumber}?text=${encodedMessage}`;

        // Open the URL in a new tab
        window.open(whatsappURL, '_blank');
    });
});
