const algoliasearch = require("algoliasearch");

// Environment variables must be set in your Netlify project settings.
const APP_ID = process.env.ALGOLIA_APP_ID;
const SEARCH_KEY = process.env.ALGOLIA_SEARCH_API_KEY;

// Check for keys on initialization.
if (!APP_ID || !SEARCH_KEY) {
    console.error("FATAL: Algolia environment variables are not set.");
}

const algoliaClient = algoliasearch(APP_ID, SEARCH_KEY);
const index = algoliaClient.initIndex('products');

// --- Netlify Function Handler ---
exports.handler = async (event) => {
    // Stop if the environment is not configured.
    if (!APP_ID || !SEARCH_KEY) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Search is not configured correctly on the server." }),
        };
    }
    
    const { searchTerm = "", type, page = 0 } = event.queryStringParameters;

    try {
        const searchOptions = {
            hitsPerPage: 30,
            page: parseInt(page, 10)
        };

        // --- THE FIX IS HERE ---
        // If a 'type' parameter exists (e.g., 'service'), add a filter.
        // We now correctly filter on the 'listing_type' attribute to match your database.
        if (type) {
            searchOptions.filters = `listing_type:${type}`;
        }

        const searchResult = await index.search(searchTerm, searchOptions);
        const { hits, nbPages } = searchResult;

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
