const algoliasearch = require("algoliasearch");

// --- Initialization ---
// It's best practice to initialize the client outside the handler
// to reuse the connection for subsequent function invocations.
const algoliaClient = algoliasearch(
    process.env.ALGOLIA_APP_ID, 
    process.env.ALGOLIA_SEARCH_API_KEY
);
const index = algoliaClient.initIndex('products');

// --- Netlify Function Handler ---
exports.handler = async (event) => {
    // Destructure all expected parameters from the query string.
    // Provide a default for 'page' to handle the initial load.
    const { searchTerm = "", type, page = 0 } = event.queryStringParameters;

    try {
        // --- Build Algolia Search Options ---
        const searchOptions = {
            hitsPerPage: 30, // The number of items to return per page.
            page: parseInt(page, 10) // The current page number to fetch.
        };

        // --- FIXED: Add filtering for 'type' ---
        // If a 'type' parameter (e.g., 'service') is present in the URL,
        // add a 'filters' attribute to the Algolia options.
        // This tells Algolia to only return hits where the 'type' attribute matches.
        if (type) {
            searchOptions.filters = `type:${type}`;
        }

        // --- Fetch data from Algolia ---
        // We now await the full result object, not just the 'hits',
        // because we also need metadata like the total number of pages ('nbPages').
        const searchResult = await index.search(searchTerm, searchOptions);
        
        const { hits, nbPages } = searchResult;

        // Map the Algolia hits to a cleaner format, converting objectID to id.
        const products = hits.map(hit => {
            const { objectID, ...data } = hit;
            return { id: objectID, ...data };
        });

        // --- Return the enhanced response ---
        // The response now includes both the products for the current page
        // AND the total number of pages available for this query.
        return {
            statusCode: 200,
            body: JSON.stringify({
                products: products,
                totalPages: nbPages 
            }),
        };

    } catch (error)
    {
        console.error("Algolia search error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Failed to perform search." }),
        };
    }
};