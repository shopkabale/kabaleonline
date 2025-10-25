// File Path: netlify/functions/product-lookup.js

const algoliasearch = require("algoliasearch");

// --- INITIALIZE ALGOLIA CLIENT ---
const APP_ID = process.env.ALGOLIA_APP_ID;
const SEARCH_KEY = process.env.ALGOLIA_SEARCH_API_KEY;

if (!APP_ID || !SEARCH_KEY) {
    console.error("FATAL: Algolia environment variables are not set.");
}

const algoliaClient = algoliasearch(APP_ID, SEARCH_KEY);
const index = algoliaClient.initIndex('products');

// --- NETLIFY FUNCTION HANDLER ---
exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { productName, categoryName } = JSON.parse(event.body);

        let searchResult;
        let queryDescription;

        // --- NEW: DUAL SEARCH LOGIC ---
        if (categoryName) {
            // If a category is provided, search within that category
            queryDescription = `the "${categoryName}" category`;
            searchResult = await index.search("", { // Empty query string to browse
                hitsPerPage: 6, // Fetch 6 items for the preview
                filters: `category:"${categoryName}" AND isSold:false`
            });
        } else if (productName) {
            // If a product name is provided, search for that product
            queryDescription = `"${productName}"`;
            searchResult = await index.search(productName, {
                hitsPerPage: 3,
                filters: 'isSold:false'
            });
        } else {
            return { statusCode: 400, body: 'A productName or categoryName is required.' };
        }

        // --- Handle "Not Found" Case ---
        if (searchResult.hits.length === 0) {
            return {
                statusCode: 200,
                body: JSON.stringify({ 
                    text: `🤔 I couldn't find any available items for ${queryDescription}. You can <a href="/shop/" target="_blank">browse all items</a> to see what's available.`
                }),
            };
        }

        // --- Format the "Found" Response ---
        const products = searchResult.hits.map(hit => ({ id: hit.objectID, ...hit }));
        let responseText = `Here are the first few items I found for ${queryDescription}:<ul>`;
        
        products.forEach(product => {
            const price = product.price ? `UGX ${product.price.toLocaleString()}` : 'Price not set';
            const imageUrl = product.imageUrls && product.imageUrls.length > 0 ? product.imageUrls[0] : null;
            if (imageUrl) {
                const thumbnailUrl = imageUrl.replace('/upload/', '/upload/w_100,h_100,c_fill,q_auto,f_auto/');
                responseText += `<li><img src="${thumbnailUrl}" style="width:50px; height:50px; border-radius:5px; object-fit:cover; vertical-align:middle; margin-right:10px;"><b>${product.name}</b> - ${price}. <a href="/product.html?id=${product.id}" target="_blank">View</a>.</li>`;
            } else {
                responseText += `<li><b>${product.name}</b> - ${price}. <a href="/product.html?id=${product.id}" target="_blank">View details</a>.</li>`;
            }
        });
        responseText += `</ul>`;
        
        // Add a "See More" button ONLY for category searches
        if (categoryName) {
            responseText += `<a href="/shop/?category=${encodeURIComponent(categoryName)}" target="_blank" class="see-more-btn">See More in ${categoryName}</a>`;
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ text: responseText }),
        };

    } catch (error) {
        console.error("Product/Category lookup error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ text: "Sorry, I ran into a search error. Please try again later." }),
        };
    }
};