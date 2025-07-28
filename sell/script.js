document.addEventListener('DOMContentLoaded', () => {
    const sellForm = document.getElementById('sellForm');
    const whatsappBtn = document.getElementById('whatsapp-btn');
    
    // Your business WhatsApp number (include country code, no + or spaces)
    const businessWhatsAppNumber = '256740373021'; // IMPORTANT: Replace with your actual number

    // Your business Email address
    const businessEmail = 'shopkabale@gmail.com'; // IMPORTANT: Replace with your email

    const generateMessage = () => {
        // Helper function to get form values safely
        const getValue = (id) => document.getElementById(id)?.value.trim() || 'N/A';
        const getFileName = () => {
            const fileInput = document.getElementById('productImage');
            return fileInput.files.length > 0 ? fileInput.files[0].name : 'No image attached';
        };

        const formData = {
            productName: getValue('productName'),
            category: getValue('category'),
            condition: getValue('condition'),
            price: `UGX ${getValue('price')}`,
            description: getValue('productInfo'),
            image: getFileName(),
            sellerPhone: getValue('phoneNumber'),
        };

        // Construct the message
        return `*New Product Submission - KABALE ONLINE*

*Product Name:* ${formData.productName}
*Category:* ${formData.category}
*Condition:* ${formData.condition}
*Price:* ${formData.price}

*Description & Location:*
${formData.description}

*Seller's WhatsApp:* ${formData.sellerPhone}

---
*Image Attached:* ${formData.image}
(Please send the image in the chat after this message)
`;
    };
    
    // --- Handle WhatsApp Submission ---
    whatsappBtn.addEventListener('click', () => {
        if (!sellForm.checkValidity()) {
            sellForm.reportValidity();
            return;
        }

        const message = generateMessage();
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/${businessWhatsAppNumber}?text=${encodedMessage}`;
        
        window.open(whatsappUrl, '_blank');
    });

    // --- Handle Email Submission ---
    sellForm.addEventListener('submit', (e) => {
        e.preventDefault(); // Prevent default form submission
        
        const messageBody = generateMessage().replace(/\*/g, ''); // Remove markdown for email
        const subject = `Product Submission: ${document.getElementById('productName').value}`;
        
        const encodedSubject = encodeURIComponent(subject);
        const encodedBody = encodeURIComponent(messageBody + "\n\nNote: The product image is attached to this email.");

        // This creates a mailto link. The user must manually attach the image.
        const mailtoLink = `mailto:${businessEmail}?subject=${encodedSubject}&body=${encodedBody}`;

        // For a true file submission, you'd need a server backend.
        // This is the best approach for a client-side only solution.
        alert("Your email client will now open. Please remember to attach your product image before sending.");
        window.location.href = mailtoLink;
    });
});
