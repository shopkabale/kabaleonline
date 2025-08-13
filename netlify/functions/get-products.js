// netlify/functions/get-products.js

const cache = new Map();
const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minute cache

exports.handler = async (event) => {
  const { BASEROW_API_TOKEN, BASEROW_PRODUCTS_TABLE_ID } = process.env;

  const cacheKey = event.rawQuery;
  const now = Date.now();

  // Serve from cache if valid
  if (cache.has(cacheKey)) {
    const cachedItem = cache.get(cacheKey);
    if (now - cachedItem.timestamp < CACHE_DURATION_MS) {
      console.log(`Serving from CACHE for query: ${cacheKey}`);
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cachedItem.data),
      };
    }
  }

  console.log(`CACHE MISS. Fetching from Baserow for query: ${cacheKey}`);

  const { type, pageSize, page, searchTerm, category } =
    event.queryStringParameters || {};

  const pageNumber = parseInt(page, 10) || 1;
  const size = parseInt(pageSize, 10) || 16;

  // Field IDs mapped to friendly names
  const FIELD_ID = {
    category: "5235550",
    status: "5235549",
    isFeatured: "5235554",
    isVerifiedSeller: "5235556",
    isSponsored: "5235555",
    isOnSale: "5235557",
    publishDate: "5235558",
    image: "5235548",
    sellerPhone: "5235547",
    sellerName: "5235546",
    price: "5235545",
    description: "5235544",
    name: "5235543",
  };

  const orderByFieldId = `field_${FIELD_ID.publishDate}`;

  const queryParams = new URLSearchParams({
    user_field_names: false, // using field IDs
    size: size,
    page: pageNumber,
    order_by: `-${orderByFieldId}`,
    include: Object.values(FIELD_ID)
      .map((id) => `field_${id}`)
      .join(","),
  });

  // --- FILTERS ---
  const conditions = [];

  // Only rows where Status is "Approved"
  conditions.push({
    type: "equal",
    field: `field_${FIELD_ID.status}`,
    value: "Approved",
  });

  // Map URL ?type= to boolean field IDs
  const typeToFieldMapping = {
    featured: FIELD_ID.isFeatured,
    sponsored: FIELD_ID.isSponsored,
    verified: FIELD_ID.isVerifiedSeller,
    sale: FIELD_ID.isOnSale,
  };

  if (type) {
    const fieldForType = typeToFieldMapping[type];
    if (fieldForType) {
      conditions.push({
        type: "boolean",
        field: `field_${fieldForType}`,
        value: true,
      });
    }
  } else {
    if (category && category !== "All") {
      conditions.push({
        type: "equal",
        field: `field_${FIELD_ID.category}`,
        value: category,
      });
    }
    if (searchTerm) {
      conditions.push({
        type: "contains_ci",
        field: `field_${FIELD_ID.name}`,
        value: searchTerm,
      });
    }
  }

  if (conditions.length > 0) {
    const filtersObject = {
      filter_type: "AND",
      filters: conditions,
    };
    queryParams.append("filters", JSON.stringify(filtersObject));
  }

  // Build URL
  const url = `https://api.baserow.io/api/database/rows/table/${BASEROW_PRODUCTS_TABLE_ID}/?${queryParams.toString()}`;

  try {
    const response = await fetch(url, {
      headers: { Authorization: `Token ${BASEROW_API_TOKEN}` },
    });
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Baserow Error: ${response.status} ${errorBody}`);
    }

    const baserowData = await response.json();

    // Convert field IDs to friendly names
    const mappedResults = baserowData.results.map((row) => {
      const mappedRow = {};
      for (const [friendlyName, id] of Object.entries(FIELD_ID)) {
        mappedRow[friendlyName] = row[`field_${id}`];
      }
      return mappedRow;
    });

    const finalResponse = {
      ...baserowData,
      results: mappedResults,
    };

    // Cache result
    if (cache.size > 20) cache.clear();
    cache.set(cacheKey, { timestamp: now, data: finalResponse });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(finalResponse),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};