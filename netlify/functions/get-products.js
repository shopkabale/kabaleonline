// In netlify/functions/get-products.js

const cache = new Map();
const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minute cache

exports.handler = async (event) => {
  const { BASEROW_API_TOKEN, BASEROW_PRODUCTS_TABLE_ID } = process.env;

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

  const { type, pageSize, page, searchTerm, category } = event.queryStringParameters;
  
  const pageNumber = parseInt(page, 10) || 1;
  const size = parseInt(pageSize, 10) || 16;
  
  // The ID for your "PublishDate" field
  const orderByFieldId = 'field_5235558';

  const queryParams = new URLSearchParams({
    user_field_names: true,
    size: size,
    page: pageNumber,
    order_by: `-${orderByFieldId}`
  });

  // --- FINAL FILTER LOGIC WITH YOUR IDs ---
  const conditions = [];

  // The ID for your "Status" field
  conditions.push({ type: 'equal', field: 'field_5235549', value: 'Approved' });

  // The IDs for your boolean (checkbox) fields
  const typeToFieldMapping = {
    'featured': 'field_5235554',
    'sponsored': 'field_5235555',
    'verified': 'field_5235556',
    'sale': 'field_5235557'
  };

  if (type) {
    const fieldForType = typeToFieldMapping[type];
    if (fieldForType) {
        conditions.push({ type: 'boolean', field: fieldForType, value: true });
    }
  } else {
    // The IDs for your Category and Name fields
    if (category && category !== 'All') {
        conditions.push({ type: 'equal', field: 'field_5235550', value: category });
    }
    if (searchTerm) {
        conditions.push({ type: 'contains_ci', field: 'field_5235543', value: searchTerm });
    }
  }

  if (conditions.length > 0) {
    const filtersObject = {
        filter_type: 'AND',
        filters: conditions
    };
    queryParams.append('filters', JSON.stringify(filtersObject));
  }

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
    
    if (cache.size > 20) { cache.clear(); }
    cache.set(cacheKey, { timestamp: now, data: baserowData });
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(baserowData),
    };

  } catch (error) {
    console.error(error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
