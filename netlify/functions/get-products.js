// This is the cache object. It lives in the function's memory.
let cache = {
  timestamp: 0,
  data: null,
  queryString: '', 
};

// Cache duration in milliseconds is now set to 30 minutes
const CACHE_DURATION_MS = 50 * 60 * 1000;

// This is the main function that runs when a request comes in
exports.handler = async (event) => {
  const now = Date.now();
  const incomingQueryString = event.rawQuery;

  // 1. Check if we have a recent, valid cache for this specific query
  if (cache.data && (now - cache.timestamp < CACHE_DURATION_MS) && cache.queryString === incomingQueryString) {
    console.log(`Serving from CACHE for query: ${incomingQueryString}`);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cache.data),
    };
  }

  // 2. If cache is old, empty, or for a different query, fetch fresh data
  console.log(`CACHE MISS. Fetching from Airtable for query: ${incomingQueryString}`);
  
  const { AIRTABLE_PAT, AIRTABLE_BASE_ID, AIRTABLE_TABLE_NAME } = process.env;
  
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}?${incomingQueryString}`;

  try {
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${AIRTABLE_PAT}` },
    });
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Airtable Error: ${response.status} ${errorBody}`);
    }
    
    const airtableData = await response.json();

    // 3. Update our cache with the fresh data
    cache = {
      timestamp: Date.now(),
      data: airtableData,
      queryString: incomingQueryString,
    };
    
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
