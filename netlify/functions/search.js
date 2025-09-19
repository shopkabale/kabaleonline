// Filename: functions/search.js

const algoliasearch = require("algoliasearch");

const APP_ID = process.env.ALGOLIA_APP_ID;
const SEARCH_KEY = process.env.ALGOLIA_SEARCH_API_KEY;

if (!APP_ID || !SEARCH_KEY) {
    console.error("FATAL: Algolia environment variables are not set.");
}

const algoliaClient = algoliasearch(APP_ID, SEARCH_KEY);
const index = algoliaClient.initIndex('products');

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
            hitsPerPage: 20, // Set to 20 items per page
            page: parseInt(page, 10)
        };

        const filterClauses = [];
        if (type) {
            filterClauses.push(`listing_type:${type}`);
        }
        if (category) {
            filterClauses.push(`category:"${category}"`);
        }

        if (filterClauses.length > 0) {
            searchOptions.filters = filterClauses.join(' AND ');
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
