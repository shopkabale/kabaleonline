// Filename: functions/fix-algolia-settings.js

const algoliasearch = require('algoliasearch');

// This function uses your ADMIN API KEY from Netlify environment variables
const APP_ID = process.env.ALGOLIA_APP_ID;
const ADMIN_KEY = process.env.ALGOLIA_ADMIN_API_KEY; // The key you just added

// Initialize the client with ADMIN rights
const client = algoliasearch(APP_ID, ADMIN_KEY);

exports.handler = async (event) => {
  
  if (!APP_ID || !ADMIN_KEY) {
      return {
        statusCode: 500,
        body: "Algolia App ID or Admin Key are not set in Netlify. Cannot run function.",
      };
  }

  try {
    console.log("Connecting to Algolia...");
    
    // --- 1. SETTINGS FOR NEW FILTERS ---
    // We will add the new filterable attributes to your MAIN 'products' index
    const mainIndex = client.initIndex('products');
    const filterSettings = {
      attributesForFiltering: [
        'listing_type',
        'category',
        'condition',  // <-- NEW
        'location',   // <-- NEW
        'price'       // <-- NEW
      ]
    };

    console.log("Applying filter settings to 'products' index...");
    await mainIndex.setSettings(filterSettings, {
      forwardToReplicas: true // This sends the filter settings to all your replicas
    }).wait();
    
    // --- 2. SETTINGS FOR PRICE SORTING REPLICAS ---
    // We will create/update the two price replicas
    
    const ascIndex = client.initIndex('products_price_asc');
    const ascSettings = {
      ranking: ['asc(price)'] // <-- THE FIX: Forcing ascending price
    };
    
    const descIndex = client.initIndex('products_price_desc');
    const descSettings = {
      ranking: ['desc(price)'] // <-- For descending price
    };

    console.log("Applying settings to 'products_price_asc'...");
    await ascIndex.setSettings(ascSettings).wait();

    console.log("Applying settings to 'products_price_desc'...");
    await descIndex.setSettings(descSettings).wait();
    
    // --- 3. TELL MAIN INDEX THESE REPLICAS EXIST ---
    // This connects them to your main 'products' index.
    // We also INCLUDE your existing working replica so we don't break it.
    const replicaSettings = {
      replicas: [
        'products_createdAt_desc', // <-- Your working one
        'products_price_asc',      // <-- New one
        'products_price_desc'      // <-- New one
      ]
    };
    
    console.log("Updating main index replica list...");
    await mainIndex.setSettings(replicaSettings).wait();

    console.log("✅ SUCCESS: Algolia settings for FILTERS and PRICE SORTING are applied!");

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "SUCCESS: Algolia settings for new filters and price sorting are now configured.",
        filters_added: filterSettings.attributesForFiltering,
        replicas_configured: replicaSettings.replicas
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