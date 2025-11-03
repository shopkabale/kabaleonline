const algoliasearch = require("algoliasearch");

// --- INITIALIZATION ---
const APP_ID = process.env.ALGOLIA_APP_ID;
const SEARCH_KEY = process.env.ALGOLIA_SEARCH_API_KEY;

if (!APP_ID || !SEARCH_KEY) {
    console.error("FATAL: Algolia environment variables are not set.");
}

const algoliaClient = algoliasearch(APP_ID, SEARCH_KEY);

// --- INDEX DEFINITIONS ---
// The main index, sorted by relevance
const mainIndex = algoliaClient.initIndex('products');
// Replica for browsing, sorted by date
const replicaIndex = algoliaClient.initIndex('products_createdAt_desc');
// Replica for "Featured" section, sorted by when you featured it
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
    // These parameters now serve BOTH the homepage and the shop page
    const { 
        searchTerm = "",    // For search bar
        category,           // For category sidebar
        type,               // For "rent" or "sale"
        page = 0,           // For shop page "Load More"
        filter,             // For homepage carousels ('deals', 'hero', etc.)
        limit = 16          // Homepage requests 8 or 10, shop page defaults to 16
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
        
        // --- CRITICAL: isSold Logic ---
        // We always hide sold items when browsing (homepage or shop categories)
        // But we MUST show sold items if a user is searching for something specific
        if (!searchTerm) {
             filterClauses.push('isSold:false');
        }

        // Apply all filters
        if (filterClauses.length > 0) {
            searchOptions.filters = filterClauses.join(' AND ');
        }
        
        // --- 4. Choose Correct Index (for Sorting) ---
        let indexToUse;

        if (filter === 'hero') {
            // 1. Homepage "Featured" section: Use the Hero-sorted replica
            indexToUse = heroReplicaIndex;
        } else if (!searchTerm) {
            // 2. Browsing (Homepage or Shop categories): Use the Date-sorted replica
            indexToUse = replicaIndex;
        } else {
            // 3. Searching (User typed in search bar): Use the Main (relevance) index
            indexToUse = mainIndex;
        }

        // --- 5. Perform Search ---
        const { hits, nbPages } = await indexToUse.search(searchTerm, searchOptions);

        // Re-format products to include the objectID as 'id'
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