const algoliasearch = require("algoliasearch");

const algoliaClient = algoliasearch(
    process.env.ALGOLIA_APP_ID, 
    process.env.ALGOLIA_SEARCH_API_KEY // Use the SEARCH key for reading
);
const index = algoliaClient.initIndex('products'); // Ensure this matches your Algolia index name

exports.handler = async (event) => {
    const { searchTerm, type } = event.queryStringParameters;

    try {
        const searchOptions = {
            hitsPerPage: 30 // This corresponds to your PRODUCTS_PER_PAGE
        };

        if (type) {
            // This is how you filter by type in Algolia
            searchOptions.filters = `listing_type:"${type}"`;
        }
        
        // This is the main Algolia search call
        const { hits } = await index.search(searchTerm, searchOptions);
        
        // Algolia results come with an 'objectID'. We need to map it to 'id'
        const products = hits.map(hit => {
            const { objectID, ...data } = hit;
            return { id: objectID, ...data };
        });

        return {
            statusCode: 200,
            body: JSON.stringify(products),
        };
    } catch (error) {
        console.error("Algolia search error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Failed to perform search." }),
        };
    }
};
