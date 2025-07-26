document.addEventListener('DOMContentLoaded', () => {
    const sellForm = document.getElementById('sellForm');
    const whatsappBtn = document.getElementById('whatsapp-btn');
    
    // --- Business Contact Information (Change these to your actual contacts) ---
    const businessEmail = 'submissions@kabaleonlineshop.com'; 
    const businessWhatsAppNumber = '256784655792'; // Your business WhatsApp number (e.g., for Kabale)

    // --- 1. Handle Submission via Email ---
    sellForm.addEventListener('submit', function(event) {
        event.preventDefault(); // Prevents the form from submitting the default way

        const formData = new FormData(sellForm);
        const productName = formData.get('productName');
        const phoneNumber = formData.get('phoneNumber');
        const condition = formData.get('condition');
        const productInfo = formData.get('productInfo');

        const subject = `New Product Listing: ${productName}`;
        const body = `Hello Kabale Online,

Please find my product submission below:

Product Name: ${productName}
My WhatsApp Number: ${phoneNumber}
Condition: ${condition}
--------------------------
Other Information (Price, Description, Location, etc.):
${productInfo}
--------------------------

Thank you!

`;

        const mailtoLink = `mailto:${businessEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = mailtoLink;
    });

    // --- 2. Handle Submission via WhatsApp ---
    if (whatsappBtn) {
        whatsappBtn.addEventListener('click', function() {
            // First, check if the form is valid
            if (!sellForm.checkValidity()) {
                sellForm.reportValidity(); // This will show the browser's default validation messages
                return;
            }

            const formData = new FormData(sellForm);
            const productName = formData.get('productName');
            const phoneNumber = formData.get('phoneNumber');
            const condition = formData.get('condition');
            const productInfo = formData.get('productInfo');

            // Construct the message for WhatsApp (using markdown for bold)
            const message = `*New Product Listing Submission*

*Product Name:* ${productName}
*My WhatsApp Number:* ${phoneNumber}
*Condition:* ${condition}
*Other Info:* ${productInfo}

(I will send the product image in the next message).`;

            // Create the WhatsApp URL and open it in a new tab
            const whatsappUrl = `https://wa.me/${businessWhatsAppNumber}?text=${encodeURIComponent(message)}`;
            window.open(whatsappUrl, '_blank');
        });
    }
});
