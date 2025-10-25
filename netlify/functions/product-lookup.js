// File Path: netlify/functions/product-lookup.js

const algoliasearch = require("algoliasearch");

// --- INITIALIZE ALGOLIA CLIENT ---
// This uses the same environment variables as your main search.js function.
const APP_ID = process.env.ALGOLIA_APP_ID;
const SEARCH_KEY = process.env.ALGOLIA_SEARCH_API_KEY;

if (!APP_ID || !SEARCH_KEY) {
    console.error("FATAL: Algolia environment variables are not set.");
}

const algoliaClient = algoliasearch(APP_ID, SEARCH_KEY);
const index = algoliaClient.initIndex('products'); // Your main products index

// --- NETLIFY FUNCTION HANDLER ---
exports.handler = async (event) => {
    // Security Check: Only allow POST requests.
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        // 1. Get the product name from the chatbot's request.
        const { productName } = JSON.parse(event.body);
        if (!productName) {
            return { statusCode: 400, body: 'Product name is required.' };
        }

        // 2. Perform the Search with Algolia.
        const searchResult = await index.search(productName, {
            hitsPerPage: 3, // Limit to 3 results
            filters: 'isSold:false' // Only show available items
        });

        // 3. Handle the "Not Found" Case.
        if (searchResult.hits.length === 0) {
            return {
                statusCode: 200,
                body: JSON.stringify({ 
                    text: `🤔 I couldn't find any available products matching "${productName}". You can try searching on the <a href="/shop/" target="_blank">shop page</a> for a wider selection.`
                }),
            };
        }

        // 4. Format the "Found" Response.
        const products = searchResult.hits.map(hit => ({ id: hit.objectID, ...hit }));

        let responseText = `Here's what I found for "${productName}":<ul>`;
        products.forEach(product => {
            const price = product.price ? `UGX ${product.price.toLocaleString()}` : 'Price not set';
            const imageUrl = product.imageUrls && product.imageUrls.length > 0 ? product.imageUrls[0] : null;

            if (imageUrl) {
                // Use Cloudinary for a small, fast-loading thumbnail
                const thumbnailUrl = imageUrl.replace('/upload/', '/upload/w_100,h_100,c_fill,q_auto,f_auto/');
                responseText += `<li><img src="${thumbnailUrl}" style="width:50px; height:50px; border-radius:5px; object-fit:cover; vertical-align:middle; margin-right:10px;"><b>${product.name}</b> - ${price}. <a href="/product.html?id=${product.id}" target="_blank">View</a>.</li>`;
            } else {
                responseText += `<li><b>${product.name}</b> - ${price}. <a href="/product.html?id=${product.id}" target="_blank">View details</a>.</li>`;
            }
        });
        responseText += `</ul>`;

        // 5. Send the successful response back to the chatbot.
        return {
            statusCode: 200,
            body: JSON.stringify({ text: responseText }),
        };

    } catch (error) {
        // 6. Handle any unexpected errors.
        console.error("Product lookup (Algolia) error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ text: "Sorry, I ran into a search error. Please try again later." }),
        };
    }
};