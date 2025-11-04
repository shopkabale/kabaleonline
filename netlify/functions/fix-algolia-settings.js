// Filename: functions/fix-algolia-settings.js
// --- COMPLETE & UPDATED VERSION ---

const algoliasearch = require('algoliasearch');

const APP_ID = process.env.ALGOLIA_APP_ID;
const ADMIN_KEY = process.env.ALGOLIA_ADMIN_API_KEY;

const client = algoliasearch(APP_ID, ADMIN_KEY);

exports.handler = async (event) => {
  
  if (!APP_ID || !ADMIN_KEY) {
      return {
        statusCode: 500,
        body: "Algolia App ID or Admin Key are not set in Netlify.",
      };
  }

  try {
    console.log("Connecting to Algolia to update all index settings...");
    
    // --- 1. SETTINGS FOR REPLICA INDICES ---
    // These indices are *only* for sorting.
    
    // Price Ascending Replica
    const ascIndex = client.initIndex('products_price_asc');
    await ascIndex.setSettings({
      ranking: ['asc(price)']
    }).wait();
    console.log("Applied settings to 'products_price_asc'");

    // Price Descending Replica
    const descIndex = client.initIndex('products_price_desc');
    await descIndex.setSettings({
      ranking: ['desc(price)']
    }).wait();
    console.log("Applied settings to 'products_price_desc'");

    // Newest (Default) Replica
    const createdAtIndex = client.initIndex('products_createdAt_desc');
    await createdAtIndex.setSettings({
        ranking: ['desc(createdAt)'] // Sort by newest first
    }).wait();
    console.log("Applied settings to 'products_createdAt_desc'");

    
    // --- 2. SETTINGS FOR MAIN 'products' INDEX ---
    // This index handles searching, filtering, and default ranking.
    
    const mainIndex = client.initIndex('products');
    
    const mainIndexSettings = {
      // --- Replicas ---
      // This tells the main index which sorting replicas exist
      replicas: [
        'products_createdAt_desc', // For "Newest" sort
        'products_price_asc',      // For "Price: Low to High"
        'products_price_desc'      // For "Price: High to Low"
      ],

      // --- Searchable Attributes ---
      // What fields to search in. 'name' is most important.
      searchableAttributes: [
        'name',
        'name_lowercase',
        'unordered(description)', // 'unordered' means matches can be anywhere
        'unordered(category)',
        'unordered(location)',
        'unordered(sellerName)',
        'unordered(service_duration)' // So people can search "per hour"
      ],

      // --- Filtering and Faceting ---
      // What fields you can use to filter results (e.g., in a sidebar).
      attributesForFaceting: [
        'category',
        'condition',
        'listing_type',
        'service_location_type',
        'filterOnly(isSold)', // 'filterOnly' is efficient for booleans
        'filterOnly(sellerIsVerified)',
        'location'
      ],

      // --- Default Ranking ---
      // How to rank results when no sort-by replica is used.
      // We make the default sort by newest items first.
      customRanking: [
        'desc(createdAt)'
      ],

      // --- Snippeting & Highlighting ---
      // Shows which part of the result matched the search
      attributesToHighlight: [
        'name',
        'description'
      ],
      attributesToSnippet: [
        'description:10' // Show a 10-word snippet from the description
      ],
      
      // --- Typo Tolerance ---
      // 'min' is strict for 1-3 char queries, more flexible for longer ones
      typoTolerance: 'min' 
    };

    console.log("Applying all settings to main 'products' index...");
    await mainIndex.setSettings(mainIndexSettings).wait();

    console.log("✅ SUCCESS: All Algolia settings are now configured!");

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "SUCCESS: All Algolia settings (main index + 3 replicas) are now configured.",
        settings_applied: mainIndexSettings
      })
    };

  } catch (error) {
    console.error("Error setting Algolia settings:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to set Algolia settings.", details: error.message })
    };
  }
};