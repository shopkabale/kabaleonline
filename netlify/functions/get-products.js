// netlify/functions/get-products.js

exports.handler = async (event) => {
  // --- Replace with your actual values ---
  const BASEROW_PRODUCTS_TABLE_ID = '641145';
  const BASEROW_API_TOKEN = '4wVfVprHP28mXOqJaRTs0sienxgaJBlY';
  // ----------------------------------------

  const { 
    pageSize, 
    page, 
    searchTerm, 
    category, 
    sale,
    featured,
    sponsored,
    verified,
    sort,       // e.g., "price" or "publishDate"
    direction   // "asc" or "desc"
  } = event.queryStringParameters || {};

  const pageNumber = parseInt(page, 10) || 1;
  const size = parseInt(pageSize, 10) || 16;

  // Field IDs (replace with your real ones from Baserow)
  const fieldIds = {
    status: 'field_5235549',
    name: 'field_5235543',
    category: 'field_5235550',
    isOnSale: 'field_5235557',
    isFeatured: 'field_5235554',
    isSponsored: 'field_5235555',
    isVerified: 'field_5235556',
    publishDate: 'field_5235558', // Example for sorting
    price: 'field_5235545'        // Replace with real Price field ID
  };

  // Default filter: only Approved products
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

  // Sorting logic
  if (sort && fieldIds[sort]) {
    const sortField = fieldIds[sort];
    queryParams.append('order_by', direction === 'asc' ? sortField : `-${sortField}`);
  } else {
    // Default: newest first
    queryParams.append('order_by', `-${fieldIds.publishDate}`);
  }

  // Add filters if present
  if (conditions.length > 0) {
    queryParams.append('filters', JSON.stringify({
      filter_type: 'AND',
      filters: conditions
    }));
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
    console.error('Function Error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};