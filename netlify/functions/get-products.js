// In netlify/functions/get-products.js

const cache = new Map();
const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minute cache

exports.handler = async (event) => {
  const { BASEROW_API_TOKEN, BASEROW_PRODUCTS_TABLE_ID } = process.env;

  const cacheKey = event.rawQuery;
  const now = Date.now();

  // Serve from cache if available
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
  
  // Field IDs
  const FIELD_ID = {
    Category: '5235550',
    Status: '5235549',
    IsFeatured: '5235554',
    IsVerifiedSeller: '5235556',
    IsSponsored: '5235555',
    IsOnSale: '5235557',
    PublishDate: '5235558',
    Image: '5235548',
    SellerPhone: '5235547',
    SellerName: '5235546',
    Price: '5235545',
    Description: '5235544',
    Name: '5235543'
  };

  // Sort by newest PublishDate
  const orderByFieldId = FIELD_ID.PublishDate;

  const queryParams = new URLSearchParams({
    user_field_names: false, // Use field IDs instead of names
    size: size,
    page: pageNumber,
    order_by: `-${orderByFieldId}`,
    include: Object.values(FIELD_ID).join(','), // Only return these fields
  });

  // --- FILTERS ---
  const conditions = [];

  // Only show rows where Status is "Approved"
  conditions.push({ type: 'equal', field: FIELD_ID.Status, value: 'Approved' });

  // Map URL "type" to boolean field IDs
  const typeToFieldMapping = {
    'featured': FIELD_ID.IsFeatured,
    'sponsored': FIELD_ID.IsSponsored,
    'verified': FIELD_ID.IsVerifiedSeller,
    'sale': FIELD_ID.IsOnSale
  };

  if (type) {
    const fieldForType = typeToFieldMapping[type];
    if (fieldForType) {
      conditions.push({ type: 'boolean', field: fieldForType, value: true });
    }
  } else {
    if (category && category !== 'All') {
      conditions.push({ type: 'equal', field: FIELD_ID.Category, value: category });
    }
    if (searchTerm) {
      conditions.push({ type: 'contains_ci', field: FIELD_ID.Name, value: searchTerm });
    }
  }

  if (conditions.length > 0) {
    const filtersObject = {
      filter_type: 'AND',
      filters: conditions
    };
    queryParams.append('filters', JSON.stringify(filtersObject));
  }

  // API request
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
    
    // Cache result
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