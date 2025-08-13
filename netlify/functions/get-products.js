// In netlify/functions/get-products.js

// --- Advanced Caching Setup ---
const cache = new Map();
const CACHE_DURATION_MS = 50 * 60 * 1000; // 50 minutes

// This is the main function that runs when a request comes in
exports.handler = async (event) => {
  const { BASEROW_API_TOKEN, BASEROW_DATABASE_ID, BASEROW_PRODUCTS_TABLE_ID } = process.env;

  const cacheKey = event.rawQuery;
  const now = Date.now();

  // 1. Check if we have a recent, valid cache for this specific request
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

  // 2. If no valid cache entry is found, fetch fresh data from Baserow
  console.log(`CACHE MISS. Fetching from Baserow for query: ${cacheKey}`);

  const { type, pageSize, page, searchTerm, category, district } = event.queryStringParameters;
  
  const pageNumber = parseInt(page, 10) || 1;
  const size = parseInt(pageSize, 10) || 16;
  
  const queryParams = new URLSearchParams({
    user_field_names: true,
    size: size,
    page: pageNumber,
    order_by: '-PublishDate'
  });

  let filters = {
    filter_type: 'AND',
    filters: [
      { type: 'equal', field: 'Status', value: 'Approved' }
    ]
  };

  if (type === 'featured') {
      filters.filters.push({ type: 'boolean', field: 'IsFeatured', value: true });
  } else if (type === 'sponsored') {
      filters.filters.push({ type: 'boolean', field: 'IsSponsored', value: true });
  } else if (type === 'verified') {
      filters.filters.push({ type: 'boolean', field: 'IsVerifiedSeller', value: true });
  } else if (type === 'sale') {
      filters.filters.push({ type: 'boolean', field: 'IsOnSale', value: true });
  }

  if (!type) {
    if (category && category !== 'All') {
        filters.filters.push({ type: 'equal', field: 'Category', value: category });
    }
    if (district && district !== 'All') {
        filters.filters.push({ type: 'equal', field: 'District', value: district });
    }
    if (searchTerm) {
        filters.filters.push({ type: 'contains_ci', field: 'Name', value: searchTerm });
    }
  }

  queryParams.append('filters', JSON.stringify(filters));

  const url = `https://api.baserow.io/api/database/rows/table/${BASEROW_PRODUCTS_TABLE_ID}/?${queryParams.toString()}`;

  try {
    const response = await fetch(url, {
      headers: { 'Authorization': `Token ${BASEROW_API_TOKEN}` },
    });
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Baserow Error: ${response.status} ${errorBody}`);
    }
    
    const baserowData = await response.json();

    // 3. Update our cache with the fresh data
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
