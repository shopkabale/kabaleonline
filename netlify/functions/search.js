// Filename: functions/search.js

const algoliasearch = require("algoliasearch");

// --- INITIALIZATION ---
const APP_ID = process.env.ALGOLIA_APP_ID;
const SEARCH_KEY = process.env.ALGOLIA_SEARCH_API_KEY;

if (!APP_ID || !SEARCH_KEY) {
    console.error("FATAL: Algolia environment variables are not set.");
}

const algoliaClient = algoliasearch(APP_ID, SEARCH_KEY);
const mainIndex = algoliaClient.initIndex('products');
const replicaIndex = algoliaClient.initIndex('products_createdAt_desc');


// --- NETLIFY FUNCTION HANDLER ---
exports.handler = async (event) => {
    if (!APP_ID || !SEARCH_KEY) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Search is not configured correctly on the server." }),
        };
    }

    const { searchTerm = "", type, category, page = 0 } = event.queryStringParameters;

    try {
        const searchOptions = {
            hitsPerPage: 16,
            page: parseInt(page, 10)
        };

        // --- FILTERING LOGIC ---
        // ⭐ THIS IS THE FIX ⭐
        // We start with an empty array. The `isSold:false` filter has been removed.
        const filterClauses = []; 
        
        if (type) {
            filterClauses.push(`listing_type:${type}`);
        }
        if (category) {
            filterClauses.push(`category:"${category}"`);
        }

        // Only add the filters if there are any to add.
        if (filterClauses.length > 0) {
            searchOptions.filters = filterClauses.join(' AND ');
        }
        
        // --- CHOOSE THE CORRECT INDEX FOR SORTING ---
        // This logic remains the same and is correct.
        const indexToUse = searchTerm ? mainIndex : replicaIndex;

        // Perform the search on the chosen index
        const { hits, nbPages } = await indexToUse.search(searchTerm, searchOptions);

        const products = hits.map(hit => {
            const { objectID, ...data } = hit;
            return { id: objectID, ...data };
        });

        return {
            statusCode: 200,
            body: JSON.stringify({
                products: products,
                totalPages: nbPages
            }),
        };

    } catch (error) {
        console.error("Algolia search error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Failed to perform search." }),
        };
    }
};