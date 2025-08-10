// --- Advanced Caching Setup ---
// We use a Map to store results for multiple different queries (e.g., sponsored, verified, page 2 of electronics, etc.)
const cache = new Map();
// Cache duration in milliseconds (50 minutes * 60 seconds * 1000 milliseconds)
const CACHE_DURATION_MS = 50 * 60 * 1000;


// This is the main function that runs when a request comes in
exports.handler = async (event) => {
  const { AIRTABLE_PAT, AIRTABLE_BASE_ID, AIRTABLE_TABLE_NAME } = process.env;

  // The unique identifier for this specific request is its query string
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

  // 2. If no valid cache entry is found, fetch fresh data from Airtable
  console.log(`CACHE MISS. Fetching from Airtable for query: ${cacheKey}`);

  const { type, pageSize, offset, filterByFormula: clientFormula } = event.queryStringParameters;
  
  let finalFilterFormula = clientFormula || "{Status}='Approved'";

  // Logic to build a specific formula for our carousels
  if (type === 'sponsored') {
    finalFilterFormula = "AND({Status}='Approved', {IsSponsored}=1)";
  } else if (type === 'verified') {
    finalFilterFormula = "AND({Status}='Approved', {IsVerifiedSeller}=1)";
  } else if (type === 'sale') {
    finalFilterFormula = "AND({Status}='Approved', {IsOnSale}=1)";
  }
  
  // Build the final Airtable URL
  const queryParams = new URLSearchParams({
    'sort[0][field]': 'PublishDate',
    'sort[0][direction]': 'desc',
    filterByFormula: finalFilterFormula
  });

  if (pageSize) queryParams.set('pageSize', pageSize);
  if (offset) queryParams.set('offset', offset);

  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}?${queryParams.toString()}`;

  try {
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${AIRTABLE_PAT}` },
    });
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Airtable Error: ${response.status} ${errorBody}`);
    }
    
    const airtableData = await response.json();

    // 3. Update our cache with the fresh data before returning it
    // To prevent memory issues, we'll clear the cache if it gets too big
    if (cache.size > 20) {
        cache.clear();
        console.log('Cache cleared to prevent memory overflow.');
    }
    cache.set(cacheKey, {
        timestamp: now,
        data: airtableData
    });
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(airtableData),
    };

  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
