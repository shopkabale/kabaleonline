const algoliasearch = require("algoliasearch");

// --- IMPORTANT ---
// These environment variables MUST be set in your Netlify project settings.
// Go to Site settings > Build & deploy > Environment > Environment variables.
const APP_ID = process.env.ALGOLIA_APP_ID;
const SEARCH_KEY = process.env.ALGOLIA_SEARCH_API_KEY;

// --- Initialization ---
// Check if the keys exist before trying to initialize the client.
if (!APP_ID || !SEARCH_KEY) {
    console.error("FATAL: Algolia environment variables (ALGOLIA_APP_ID or ALGOLIA_SEARCH_API_KEY) are not set.");
    // No need to initialize if keys are missing. The handler will return an error.
}

const algoliaClient = algoliasearch(APP_ID, SEARCH_KEY);
const index = algoliaClient.initIndex('products');

// --- Netlify Function Handler ---
exports.handler = async (event) => {
    // Immediately stop if the environment is not configured.
    if (!APP_ID || !SEARCH_KEY) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Search is not configured correctly on the server." }),
        };
    }
    
    console.log("Search function triggered with params:", event.queryStringParameters);

    const { searchTerm = "", type, page = 0 } = event.queryStringParameters;

    try {
        const searchOptions = {
            hitsPerPage: 30,
            page: parseInt(page, 10)
        };

        if (type) {
            searchOptions.filters = `type:${type}`;
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
        // Log the specific error from Algolia for easier debugging.
        console.error("Algolia search error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Failed to perform search." }),
        };
    }
};
