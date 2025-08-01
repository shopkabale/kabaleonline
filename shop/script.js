// -------------------------------------------------------------------
//  1. PASTE YOUR AIRTABLE CREDENTIALS HERE
// -------------------------------------------------------------------
const AIRTABLE_PAT = 'patzDYgydGNXIeZI5.0eb7d58cd9de9dc8f6f224a8723aef57282ca03695d136347dfce34563fe8ecb'; // Use the SAME token as sell.js
const AIRTABLE_BASE_ID = 'app6fysZN2R6mvvXY'; // Use the SAME Base ID as sell.js
const AIRTABLE_TABLE_NAME = 'Products';


// -------------------------------------------------------------------
//  2. DO NOT EDIT BELOW THIS LINE
// -------------------------------------------------------------------
const productGrid = document.getElementById('product-grid');
const placeholderImage = 'https://i.imgur.com/WJ9S92O.png'; // A simple placeholder

async function fetchAndDisplayProducts() {
    try {
        // This URL fetches only records where the 'Status' is 'Approved'
        const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}?filterByFormula={Status}='Approved'`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${AIRTABLE_PAT}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        productGrid.innerHTML = ''; // Clear the "Loading..." message

        if (data.records.length === 0) {
            productGrid.innerHTML = '<p>No products found. Check back later!</p>';
            return;
        }

        data.records.forEach(record => {
            const fields = record.fields;

            // Get image URL or use placeholder
            const imageUrl = fields.Image && fields.Image.length > 0 ? fields.Image[0].url : placeholderImage;
            
            // Format phone number for WhatsApp link (remove leading 0, add 256)
            let whatsappNumber = fields.SellerPhone || '';
            if (whatsappNumber.startsWith('0')) {
                whatsappNumber = '256' + whatsappNumber.substring(1);
            }

            const productCard = document.createElement('article');
            productCard.className = 'product-card';
            productCard.innerHTML = `
                <img src="${imageUrl}" alt="${fields.Name || 'Product Image'}">
                <h3>${fields.Name || 'No Name'}</h3>
                <p class="product-price">UGX ${fields.Price ? fields.Price.toLocaleString() : 'N/A'}</p>
                <p class="product-description">Seller: ${fields.SellerName || 'N/A'}</p>
                <a href="https://wa.me/${whatsappNumber}" class="btn-contact" target="_blank">Contact Seller</a>
            `;
            productGrid.appendChild(productCard);
        });

    } catch (error) {
        console.error('Error fetching products:', error);
        productGrid.innerHTML = '<p>Sorry, we could not load the products. Please try refreshing the page.</p>';
    }
}

// Run the function when the page loads
fetchAndDisplayProducts();
