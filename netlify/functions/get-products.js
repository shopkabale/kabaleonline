// netlify/functions/get-products.js

exports.handler = async (event) => {
  // --- Replace with your actual credentials ---
  const BASEROW_PRODUCTS_TABLE_ID = 'PASTE_YOUR_TABLE_ID_HERE';
  const BASEROW_API_TOKEN = 'PASTE_YOUR_API_TOKEN_HERE';
  // ---------------------------------------------

  const { 
    pageSize, 
    page, 
    searchTerm, 
    category, 
    sale,
    featured,
    sponsored,
    verified,
    sort,        // NEW: e.g., "price" or "PublishDate"
    direction    // NEW: "asc" or "desc"
  } = event.queryStringParameters;

  const pageNumber = parseInt(page, 10) || 1;
  const size = parseInt(pageSize, 10) || 16;

  // Field IDs mapping (replace with your actual IDs)
  const fieldIds = {
    status: 'field_5235549',
    name: 'field_5235543',
    category: 'field_5235550',
    isOnSale: 'field_5235557',
    isFeatured: 'field_5235554',
    isSponsored: 'field_5235555',
    isVerified: 'field_5235556',
    publishDate: 'field_5235558', // Example for sorting
    price: 'field_5235545'        // Replace if needed
  };

  // Default filter: only Approved items
  const conditions = [
    { type: 'equal', field: fieldIds.status, value: 'Approved' }
  ];

  // Search filter
  if (searchTerm) {
    conditions.push({ type: 'contains_ci', field: fieldIds.name, value: searchTerm });
  }

  // Category filter
  if (category) {
    conditions.push({ type: 'equal', field: fieldIds.category, value: category });
  }

  // Boolean filters
  if (sale === 'true') {
    conditions.push({ type: 'boolean', field: fieldIds.isOnSale, value: 'true' });
  }
  if (featured === 'true') {
    conditions.push({ type: 'boolean', field: fieldIds.isFeatured, value: 'true' });
  }
  if (sponsored === 'true') {
    conditions.push({ type: 'boolean', field: fieldIds.isSponsored, value: 'true' });
  }
  if (verified === 'true') {
    conditions.push({ type: 'boolean', field: fieldIds.isVerified, value: 'true' });
  }

  // Build query params
  const queryParams = new URLSearchParams({
    user_field_names: true,
    size: size,
    page: pageNumber
  });

  // Sorting (dynamic)
  if (sort && fieldIds[sort]) {
    const sortField = fieldIds[sort];
    queryParams.append('order_by', direction === 'asc' ? sortField : `-${sortField}`);
  } else {
    // Default sort: newest first
    queryParams.append('order_by', '-id');
  }

  // Add filters if any
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
      headers: { 'Authorization': `Token ${BASEROW_API_TOKEN}` }
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Baserow Error: ${response.status} - ${errorBody}`);
    }

    const baserowData = await response.json();
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(baserowData)
    };

  } catch (error) {
    console.error('Function Error:', error.message);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: error.message }) 
    };
  }
};