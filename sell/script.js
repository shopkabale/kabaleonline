// -------------------------------------------------------------------
//  1. PASTE YOUR AIRTABLE CREDENTIALS HERE
// -------------------------------------------------------------------
const AIRTABLE_PAT = 'patzDYgydGNXIeZI5.0eb7d58cd9de9dc8f6f224a8723aef57282ca03695d136347dfce34563fe8ecb';
const AIRTABLE_BASE_ID = 'app6fysZN2R6mvvXY';
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

    const managementKey = Math.random().toString(36).substring(2, 15);

    const dataToSend = {
        fields: {
            'Name': document.getElementById('product-name').value,
            'Category': document.getElementById('product-category').value,
            'District': document.getElementById('product-district').value,
            'Neighborhood': document.getElementById('product-neighborhood').value,
            'Price': parseInt(document.getElementById('product-price').value, 10),
            'Description': document.getElementById('product-description').value,
            'SellerName': document.getElementById('seller-name').value,
            'SellerPhone': document.getElementById('seller-phone').value,
            'Status': 'Pending Approval',
            'ManagementKey': managementKey
        }
    };

    try {
        const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${AIRTABLE_PAT}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(dataToSend)
        });

        if (response.ok) {
            const newRecord = await response.json();
            const recordId = newRecord.id;
            const managementUrl = `${window.location.origin}/manage/?id=${recordId}&key=${managementKey}`;

            statusMessage.innerHTML = `
                <p><strong>Success! Your item has been submitted.</strong></p>
                <p>An admin will contact you for photos.</p>
                <hr>
                <p><strong>IMPORTANT:</strong> Copy and save this private link to manage your item later:</p>
                <input type="text" value="${managementUrl}" readonly id="management-link-input" style="width: 100%; padding: 5px;">
                <button type="button" id="copy-link-btn" style="margin-top: 5px;">Copy Link</button>
            `;
            statusMessage.className = 'success';
            sellForm.reset();

            document.getElementById('copy-link-btn').addEventListener('click', () => {
                const linkInput = document.getElementById('management-link-input');
                linkInput.select();
                document.execCommand('copy');
                alert('Link copied to clipboard!');
            });

        } else {
            throw new Error('Failed to submit item.');
        }

    } catch (error) {
        statusMessage.textContent = 'Error submitting item. Please try again.';
        statusMessage.className = 'error';
    } finally {
        statusMessage.style.display = 'block';
        submitButton.disabled = false;
        submitButton.textContent = 'Submit for Approval';
    }
});
