// In netlify/functions/get-products.js

const cache = new Map();
const CACHE_DURATION_MS = 50 * 60 * 1000; // 50 minutes

exports.handler = async (event) => {
  const { BASEROW_API_TOKEN, BASEROW_DATABASE_ID, BASEROW_PRODUCTS_TABLE_ID } = process.env;

  const cacheKey = event.rawQuery;
  const now = Date.now();

  if (cache.has(cacheKey)) {
    const cachedItem = cache.get(cacheKey);
    if (now - cachedItem.timestamp < CACHE_DURATION_MS) {
      console.log(`Serving from CACHE for query: ${cacheKey}`);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cachedItem.data),
      };
    }
  }

  console.log(`CACHE MISS. Fetching from Baserow for query: ${cacheKey}`);

  const { pageSize, page } = event.queryStringParameters;
  
  const pageNumber = parseInt(page, 10) || 1;
  const size = parseInt(pageSize, 10) || 16;
  
  const queryParams = new URLSearchParams({
    user_field_names: true,
    size: size,
    page: pageNumber,
    order_by: '-PublishDate' 
  });

  // --- TEMPORARY DEBUGGING STEP ---
  // We are sending an empty filter object to test the basic connection.
  // This will temporarily load ALL products, ignoring their status, category, etc.
  const filters = {};

  queryParams.append('filters', JSON.stringify(filters));

  const url = `https://api.baserow.io/api/database/rows/table/${BASEROW_PRODUCTS_TABLE_ID}/?${queryParams.toString()}`;

  try {
    const response = await fetch(url, {
      headers: { 'Authorization': `Token ${BASEROW_API_TOKEN}` },
    });
    if (!response.ok) {
      const errorBody = await response.text();
      // Log the specific error body from Baserow for better debugging
      console.error(`Baserow Error Body: ${errorBody}`);
      throw new Error(`Baserow Error: ${response.status} ${errorBody}`);
    }
    
    const baserowData = await response.json();
    
    if (cache.size > 20) {
        cache.clear();
        console.log('Cache cleared to prevent memory overflow.');
    }
    cache.set(cacheKey, {
        timestamp: now,
        data: baserowData
    });
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(baserowData),
    };

  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
