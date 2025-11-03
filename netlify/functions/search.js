const algoliasearch = require("algoliasearch");

// --- INITIALIZATION ---
const APP_ID = process.env.ALGOLIA_APP_ID;
const SEARCH_KEY = process.env.ALGOLIA_SEARCH_API_KEY;

if (!APP_ID || !SEARCH_KEY) {
    console.error("FATAL: Algolia environment variables are not set.");
}

const algoliaClient = algoliasearch(APP_ID, SEARCH_KEY);

// --- INDEX DEFINITIONS ---
const mainIndex = algoliaClient.initIndex('products');
const replicaIndex = algoliaClient.initIndex('products_createdAt_desc');
const heroReplicaIndex = algoliaClient.initIndex('products_heroTimestamp_desc');


// --- NETLIFY FUNCTION HANDLER ---
exports.handler = async (event) => {
    // Check for keys inside the handler
    if (!APP_ID || !SEARCH_KEY) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Search is not configured correctly on the server." }),
        };
    }

    // --- 1. Get All Parameters ---
    const { 
        searchTerm = "",
        category,
        type,
        page = 0,
        filter,
        limit = 16 
    } = event.queryStringParameters;

    try {
        // --- 2. Set Search Options ---
        const searchOptions = {
            hitsPerPage: parseInt(limit, 10),
            page: parseInt(page, 10)
        };

        // --- 3. Build Filter List ---
        const filterClauses = []; 
        
        // Standard Filters (from shop page or sidebar)
        if (type) {
            filterClauses.push(`listing_type:"${type}"`);
        }
        if (category) {
            filterClauses.push(`category:"${category}"`);
        }

        // Homepage/See All Filters
        if (filter === 'deals') {
            filterClauses.push('isDeal:true');
        }
        if (filter === 'hero') {
            filterClauses.push('isHero:true');
        }
        if (filter === 'sponsored') {
            filterClauses.push('isSponsored:true');
        }
        if (filter === 'save') {
            filterClauses.push('isSaveOnMore:true');
        }
        
        // --- MODIFICATION ---
        // The 'isSold:false' filter has been REMOVED as requested.
        // All products will now be shown.
        // --- END MODIFICATION ---

        // Apply all filters
        if (filterClauses.length > 0) {
            searchOptions.filters = filterClauses.join(' AND ');
        }
        
        // --- 4. Choose Correct Index (for Sorting) ---
        let indexToUse;

        if (filter === 'hero') {
            indexToUse = heroReplicaIndex;
        } else if (!searchTerm) {
            indexToUse = replicaIndex;
        } else {
            indexToUse = mainIndex;
        }

        // --- 5. Perform Search ---
        const { hits, nbPages } = await indexToUse.search(searchTerm, searchOptions);

        const products = hits.map(hit => {
            const { objectID, ...data } = hit;
            return { id: objectID, ...data };
        });

        // --- 6. Return Data ---
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
            body: JSON.stringify({ error: "Failed to perform search.", details: error.message }),
        };
    }
};