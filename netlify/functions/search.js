// Filename: functions/search.js

const algoliasearch = require("algoliasearch");

// --- INITIALIZATION ---
const APP_ID = process.env.ALGOLIA_APP_ID;
const SEARCH_KEY = process.env.ALGOLIA_SEARCH_API_KEY; // Use the Search key, not Admin key, for frontend queries

if (!APP_ID || !SEARCH_KEY) {
    console.error("FATAL: Algolia environment variables (ALGOLIA_APP_ID or ALGOLIA_SEARCH_API_KEY) are not set.");
}

const algoliaClient = algoliasearch(APP_ID, SEARCH_KEY);

// Initialize the main index (for relevance-based search)
const mainIndex = algoliaClient.initIndex('products');

// ⭐ FIX: Initialize the new replica index that is sorted by date
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
            hitsPerPage: 40,
            page: parseInt(page, 10)
        };

        // --- FILTERING LOGIC (remains the same) ---
        const filterClauses = [`isSold:false`]; // Always filter out sold items
        if (type) {
            filterClauses.push(`listing_type:${type}`);
        }
        if (category) {
            filterClauses.push(`category:"${category}"`);
        }
        searchOptions.filters = filterClauses.join(' AND ');
        
        // --- ⭐ FIX: CHOOSE THE CORRECT INDEX FOR SORTING ⭐ ---
        // If the user provided a search term, use the main index to sort by relevance.
        // If the search term is empty, use the replica to sort by newest first.
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