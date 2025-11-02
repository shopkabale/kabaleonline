// Filename: functions/fix-algolia-settings.js
// --- NEW, SIMPLIFIED VERSION ---

const algoliasearch = require('algoliasearch');

const APP_ID = process.env.ALGOLIA_APP_ID;
const ADMIN_KEY = process.env.ALGOLIA_ADMIN_API_KEY; // The key you added

const client = algoliasearch(APP_ID, ADMIN_KEY);

exports.handler = async (event) => {
  
  if (!APP_ID || !ADMIN_KEY) {
      return {
        statusCode: 500,
        body: "Algolia App ID or Admin Key are not set in Netlify.",
      };
  }

  try {
    console.log("Connecting to Algolia to fix price sorting...");
    
    // --- 1. SETTINGS FOR PRICE SORTING REPLICAS ---
    // This will create or update your price sorting.
    
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
    
    // --- 2. TELL MAIN INDEX THESE REPLICAS EXIST ---
    // This connects them to your main 'products' index.
    // We also INCLUDE your existing working replica so we don't break it.
    const mainIndex = client.initIndex('products');
    const replicaSettings = {
      replicas: [
        'products_createdAt_desc', // <-- Your working one
        'products_price_asc',      // <-- New one
        'products_price_desc'      // <-- New one
      ]
    };
    
    console.log("Updating main index replica list...");
    await mainIndex.setSettings(replicaSettings).wait();

    console.log("✅ SUCCESS: Algolia PRICE SORTING is now fixed!");

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "SUCCESS: Algolia settings for price sorting are now configured.",
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