const algoliasearch = require("algoliasearch");

// --- INITIALIZATION ---
// This function MUST use your ADMIN API Key
const APP_ID = process.env.ALGOLIA_APP_ID;
const ADMIN_KEY = process.env.ALGOLIA_ADMIN_API_KEY; // <-- Note: ADMIN_KEY, not SEARCH_KEY

if (!APP_ID || !ADMIN_KEY) {
    console.error("FATAL: Algolia Admin environment variables are not set.");
}

const algoliaClient = algoliasearch(APP_ID, ADMIN_KEY);

// --- NETLIFY FUNCTION HANDLER ---
exports.handler = async (event) => {
    if (!APP_ID || !ADMIN_KEY) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Algolia Admin Key is not configured." }),
        };
    }

    try {
        const mainIndex = algoliaClient.initIndex('products');
        const replica1 = algoliaClient.initIndex('products_createdAt_desc');
        const replica2 = algoliaClient.initIndex('products_heroTimestamp_desc');

        console.log("Configuring main 'products' index...");

        // --- Task 1: Configure the Main Index ---
        // This sets facets, searchable attributes, and defines the replicas
        const mainSettings = mainIndex.setSettings({
            // 1. For Filtering (Facets)
            attributesForFaceting: [
                'category',         // For your sidebar
                'listing_type',     // For Rent/Sale
                'condition',        // For New/Used
                'filterOnly(isSold)', // Booleans for filtering
                'filterOnly(isDeal)',
                'filterOnly(isSponsored)',
                'filterOnly(isSaveOnMore)',
                'filterOnly(isHero)'
            ],
            // 2. For Searching
            searchableAttributes: [
                'name',
                'sellerName',
                'category',
                'location',
                'description'
            ],
            // 3. For Replicas
            replicas: [
                'products_createdAt_desc',
                'products_heroTimestamp_desc'
            ]
        });

        console.log("Configuring 'createdAt' replica...");
        
        // --- Task 2: Configure the "Recent Items" Replica ---
        const replica1Settings = replica1.setSettings({
            ranking: ['desc(createdAt)', 'typo', 'geo', 'words', 'filters', 'proximity', 'attribute', 'exact', 'custom']
        });

        console.log("Configuring 'heroTimestamp' replica...");

        // --- Task 3: Configure the "Featured Items" Replica ---
        const replica2Settings = replica2.setSettings({
            ranking: ['desc(heroTimestamp)', 'typo', 'geo', 'words', 'filters', 'proximity', 'attribute', 'exact', 'custom']
        });

        // Wait for all settings to be applied
        await Promise.all([mainSettings, replica1Settings, replica2Settings]);
        
        console.log("Algolia configuration complete!");

        return {
            statusCode: 200,
            body: JSON.stringify({ 
                message: "SUCCESS: Your Algolia index and replicas are now configured.",
                settings_applied: {
                    mainIndex: "Facets, Searchable Attributes, and Replicas defined.",
                    replica_createdAt: "Sorting set to desc(createdAt).",
                    replica_heroTimestamp: "Sorting set to desc(heroTimestamp)."
                }
            }),
        };

    } catch (error) {
        console.error("Algolia configuration error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Failed to configure Algolia.", details: error.message }),
        };
    }
};