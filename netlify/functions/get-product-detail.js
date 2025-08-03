// A simple in-memory cache for individual products.
// The key will be the product ID.
const productCache = {};

// Cache duration for a single product (e.g., 60 minutes).
// Individual products don't change often, so we can use a longer cache time.
const CACHE_DURATION_MS = 60 * 60 * 1000;

const { AIRTABLE_PAT, AIRTABLE_BASE_ID, AIRTABLE_TABLE_NAME } = process.env;

exports.handler = async (event) => {
  const { id } = event.queryStringParameters;

  if (!id) {
    return { statusCode: 400, body: 'Product ID is required' };
  }

  const now = Date.now();
  
  // 1. Check if we have a recent, valid cache for this specific product ID
  if (productCache[id] && (now - productCache[id].timestamp < CACHE_DURATION_MS)) {
    console.log(`Serving product ${id} from CACHE`);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productCache[id].data),
    };
  }

  // 2. If no cache, fetch fresh data from Airtable
  console.log(`CACHE MISS for product ${id}. Fetching from Airtable.`);
  
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}/${id}`;

  try {
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${AIRTABLE_PAT}` },
    });
    if (!response.ok) throw new Error('Failed to fetch product from Airtable');
    
    const productData = await response.json();

    // 3. Update the cache for this specific product ID
    productCache[id] = {
      timestamp: Date.now(),
      data: productData,
    };
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData),
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
