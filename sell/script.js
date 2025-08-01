// -------------------------------------------------------------------
//  1. PASTE YOUR AIRTABLE CREDENTIALS HERE
// -------------------------------------------------------------------
const AIRTABLE_PAT = 'patzDYgydGNXIeZI5.0eb7d58cd9de9dc8f6f224a8723aef57282ca03695d136347dfce34563fe8ecb'; // Starts with 'pat...'
const AIRTABLE_BASE_ID = 'app6fysZN2R6mvvXY'; // Starts with 'app...'
const AIRTABLE_TABLE_NAME = 'Products';


// -------------------------------------------------------------------
//  2. DO NOT EDIT BELOW THIS LINE
// -------------------------------------------------------------------
const sellForm = document.getElementById('sell-item-form');
const submitButton = document.getElementById('submit-btn');
const statusMessage = document.getElementById('submission-status');

sellForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    submitButton.disabled = true;
    submitButton.textContent = 'Submitting...';
    statusMessage.style.display = 'none';

    // Get form data
    const productName = document.getElementById('product-name').value;
    const productPrice = parseInt(document.getElementById('product-price').value, 10);
    const productDescription = document.getElementById('product-description').value;
    const sellerName = document.getElementById('seller-name').value;
    const sellerPhone = document.getElementById('seller-phone').value;
    // --- NEW LINE TO GET THE CATEGORY ---
    const productCategory = document.getElementById('product-category').value;
    
    // Prepare data for Airtable
    const dataToSend = {
        fields: {
            'Name': productName,
            'Price': productPrice,
            'Description': productDescription,
            'SellerName': sellerName,
            'SellerPhone': sellerPhone,
            'Status': 'Pending Approval', // Automatically set status
            // --- NEW LINE TO SEND THE CATEGORY ---
            'Category': productCategory
        }
    };

    // Send data to Airtable API
    try {
        const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_PAT}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dataToSend)
        });

        if (response.ok) {
            statusMessage.textContent = 'Success! Your item has been submitted for approval. An admin will contact you soon for photos.';
            statusMessage.className = 'success';
            sellForm.reset(); // Clear the form
        } else {
            const error = await response.json();
            console.error('Airtable Error:', error);
            statusMessage.textContent = 'Error submitting item. Please try again.';
            statusMessage.className = 'error';
        }

    } catch (error) {
        console.error('Network Error:', error);
        statusMessage.textContent = 'Network error. Please check your connection and try again.';
        statusMessage.className = 'error';
    } finally {
        statusMessage.style.display = 'block';
        submitButton.disabled = false;
        submitButton.textContent = 'Submit for Approval';
    }
});
