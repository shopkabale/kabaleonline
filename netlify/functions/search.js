// Filename: functions/search.js

const algoliasearch = require("algoliasearch");

// --- INITIALIZATION ---
// Ensure your Environment Variables are set in your Netlify project settings.
const APP_ID = process.env.ALGOLIA_APP_ID;
const SEARCH_KEY = process.env.ALGOLIA_SEARCH_API_KEY;

// Safety check on startup
if (!APP_ID || !SEARCH_KEY) {
    console.error("FATAL: Algolia environment variables (ALGOLIA_APP_ID or ALGOLIA_SEARCH_API_KEY) are not set.");
}

const algoliaClient = algoliasearch(APP_ID, SEARCH_KEY);
const index = algoliaClient.initIndex('products');


// --- NETLIFY FUNCTION HANDLER ---
exports.handler = async (event) => {
    // Stop if the environment is not configured.
    if (!APP_ID || !SEARCH_KEY) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Search is not configured correctly on the server." }),
        };
    }

    // Get parameters from the frontend URL.
    const { searchTerm = "", type, category, page = 0 } = event.queryStringParameters;

    try {
        const searchOptions = {
            hitsPerPage: 12, // Sets the number of items per page
            page: parseInt(page, 10)
        };

        // --- FILTERING LOGIC ---
        // Build an array of filter strings to be joined with 'AND'
        const filterClauses = [];
        if (type) {
            filterClauses.push(`listing_type:${type}`);
        }
        if (category) {
            filterClauses.push(`category:"${category}"`); // Use quotes for categories with spaces like "Clothing & Apparel"
        }

        // If any filters exist, add them to the search options
        if (filterClauses.length > 0) {
            searchOptions.filters = filterClauses.join(' AND ');
        }
        // --- END FILTERING LOGIC ---

        // Perform the search with the given term and options (filters, pagination).
        const searchResult = await index.search(searchTerm, searchOptions);
        const { hits, nbPages } = searchResult;

        // Format the results to send back to the frontend.
        const products = hits.map(hit => {
            const { objectID, ...data } = hit;
            return { id: objectID, ...data };
        });

        // Return a successful response
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
