// NOTE: Airtable credentials are now removed from this file.

const sellForm = document.getElementById('sell-item-form');
const submitButton = document.getElementById('submit-btn');
const statusMessage = document.getElementById('submission-status');

sellForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    submitButton.disabled = true;
    submitButton.textContent = 'Submitting...';
    statusMessage.style.display = 'none';

    // We only send the raw data, the backend will add Status and ManagementKey
    const productData = {
        'Name': document.getElementById('product-name').value,
        'Category': document.getElementById('product-category').value,
        'District': document.getElementById('product-district').value,
        'Neighborhood': document.getElementById('product-neighborhood').value,
        'Price': parseInt(document.getElementById('product-price').value, 10),
        'Description': document.getElementById('product-description').value,
        'SellerName': document.getElementById('seller-name').value,
        'SellerPhone': document.getElementById('seller-phone').value,
    };

    try {
        const response = await fetch('/.netlify/functions/submit-product', {
            method: 'POST',
            body: JSON.stringify(productData),
        });

        if (response.ok) {
            const result = await response.json();
            const managementUrl = `${window.location.origin}/manage/?id=${result.id}&key=${result.managementKey}`;

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
