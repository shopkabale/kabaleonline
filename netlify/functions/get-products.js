// In netlify/functions/get-products.js

const cache = new Map();
const CACHE_DURATION_MS = 10 * 60 * 60 * 1000; // 10 hours

exports.handler = async (event) => {
  // CORRECTED: Using AIRTABLE_TABLE_NAME to match your setup
  const { AIRTABLE_PAT, AIRTABLE_BASE_ID, AIRTABLE_TABLE_NAME } = process.env;

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

  console.log(`CACHE MISS. Fetching from Airtable for query: ${cacheKey}`);

  const { type, pageSize, offset, filterByFormula: clientFormula } = event.queryStringParameters;
  
  let finalFilterFormula = clientFormula || "{Status}='Approved'";

  if (type === 'sponsored') {
    finalFilterFormula = "AND({Status}='Approved', {IsSponsored}=1)";
  } else if (type === 'verified') {
    finalFilterFormula = "AND({Status}='Approved', {IsVerifiedSeller}=1)";
  } else if (type === 'sale') {
    finalFilterFormula = "AND({Status}='Approved', {IsOnSale}=1)";
  }
  
  const queryParams = new URLSearchParams({
    'sort[0][field]': 'PublishDate',
    'sort[0][direction]': 'desc',
    filterByFormula: finalFilterFormula
  });

  if (pageSize) queryParams.set('pageSize', pageSize);
  if (offset) queryParams.set('offset', offset);

  // CORRECTED: Using AIRTABLE_TABLE_NAME here as well
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
