const algoliasearch = require("algoliasearch");

const algoliaClient = algoliasearch(
    process.env.ALGOLIA_APP_ID, 
    process.env.ALGOLIA_SEARCH_API_KEY
);
const index = algoliaClient.initIndex('products');

exports.handler = async (event) => {
    const { searchTerm } = event.queryStringParameters;

    try {
        const searchOptions = {
            hitsPerPage: 30
        };

        // This is the main Algolia search call, without any 'type' filter.
        // It will now fetch ALL products, whether you're on the homepage or the Services page.
        const { hits } = await index.search(searchTerm, searchOptions);
        
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
