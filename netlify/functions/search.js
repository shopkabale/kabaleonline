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
const createdIndex = algoliaClient.initIndex('products_createdAt_desc');
const priceAscIndex = algoliaClient.initIndex('products_price_asc');
const priceDescIndex = algoliaClient.initIndex('products_price_desc');


// --- NETLIFY FUNCTION HANDLER ---
exports.handler = async (event) => {
    if (!APP_ID || !SEARCH_KEY) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Search is not configured correctly on the server." }),
        };
    }

    // (UPDATED) Get all new query params
    const { 
        searchTerm = "", 
        type, 
        category, 
        page = 0, 
        sortBy = "createdAt_desc",
        condition,  // (NEW)
        location,   // (NEW)
        minPrice,   // (NEW)
        maxPrice    // (NEW)
    } = event.queryStringParameters;

    try {
        const searchOptions = {
            hitsPerPage: 16,
            page: parseInt(page, 10)
        };

        // --- (UPDATED) FILTERING LOGIC ---
        const filterClauses = []; 

        if (type) {
            filterClauses.push(`listing_type:"${type}"`);
        }
        if (category) {
            filterClauses.push(`category:"${category}"`);
        }
        // (NEW) Add new filters
        if (condition) {
            filterClauses.push(`condition:"${condition}"`);
        }
        if (location) {
            filterClauses.push(`location:"${location}"`);
        }
        // (NEW) Add numeric price filters
        if (minPrice) {
            filterClauses.push(`price >= ${parseInt(minPrice, 10)}`);
        }
        if (maxPrice) {
            filterClauses.push(`price <= ${parseInt(maxPrice, 10)}`);
        }

        if (filterClauses.length > 0) {
            searchOptions.filters = filterClauses.join(' AND ');
        }

        // --- SMART INDEX SELECTION LOGIC (FOR SORTING) ---
        let indexToUse;

        if (searchTerm && sortBy === 'createdAt_desc') {
            indexToUse = mainIndex;
        } else {
            switch (sortBy) {
                case 'price_asc':
                    indexToUse = priceAscIndex;
                    break;
                case 'price_desc':
                    indexToUse = priceDescIndex;
                    break;
                case 'createdAt_desc':
                default:
                    indexToUse = createdIndex;
                    break;
            }
        }

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