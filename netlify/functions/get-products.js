// In netlify/functions/get-products.js

exports.handler = async (event) => {
  // Your secret credentials from Netlify's environment variables
  const { BASEROW_API_TOKEN, BASEROW_PRODUCTS_TABLE_ID } = process.env;

  // --- 1. Get filter parameters from the request URL ---
  const { 
    pageSize, 
    page, 
    searchTerm, 
    category, 
    sale, // Expects 'true' or 'false'
    featured, // Expects 'true' or 'false'
    sponsored, // Expects 'true' or 'false'
    verified // Expects 'true' or 'false'
  } = event.queryStringParameters;
  
  const pageNumber = parseInt(page, 10) || 1;
  const size = parseInt(pageSize, 10) || 16;

  // --- 2. Define all your Field IDs in one place ---
  const fieldIds = {
    publishDate: 'field_5235558',
    status: 'field_5235549',
    name: 'field_5235543',
    category: 'field_5235550',
    isOnSale: 'field_5235557',
    isFeatured: 'field_5235554',
    isSponsored: 'field_5235555',
    isVerified: 'field_5235556'
  };

  // --- 3. Build the filter conditions dynamically ---
  const conditions = [];

  // Base filter: Always require products to be 'Approved'
  conditions.push({ type: 'equal', field: fieldIds.status, value: 'Approved' });

  // Add filters only if they are provided in the request
  if (searchTerm) {
    conditions.push({ type: 'contains_ci', field: fieldIds.name, value: searchTerm });
  }
  if (category) {
    conditions.push({ type: 'equal', field: fieldIds.category, value: category });
  }
  if (sale === 'true') {
    conditions.push({ type: 'boolean', field: fieldIds.isOnSale, value: true });
  }
  if (featured === 'true') {
    conditions.push({ type: 'boolean', field: fieldIds.isFeatured, value: true });
  }
  if (sponsored === 'true') {
    conditions.push({ type: 'boolean', field: fieldIds.isSponsored, value: true });
  }
  if (verified === 'true') {
    conditions.push({ type: 'boolean', field: fieldIds.isVerified, value: true });
  }
  
  // --- 4. Construct the final API request to Baserow ---
  const filtersObject = {
      filter_type: 'AND',
      filters: conditions
  };

  const queryParams = new URLSearchParams({
    user_field_names: true,
    size: size,
    page: pageNumber,
    order_by: `-${fieldIds.publishDate}`,
    filters: JSON.stringify(filtersObject)
  });

  const url = `https://api.baserow.io/api/database/rows/table/${BASEROW_PRODUCTS_TABLE_ID}/?${queryParams.toString()}`;

  // --- 5. Execute the request and return the data ---
  try {
    const response = await fetch(url, {
      headers: { 'Authorization': `Token ${BASEROW_API_TOKEN}` },
    });
    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Baserow API Error:', errorBody);
      throw new Error(`Baserow Error: ${response.status} ${errorBody}`);
    }
    
    const baserowData = await response.json();
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(baserowData),
    };

  } catch (error) {
    console.error('Function Error:', error);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: 'An internal server error occurred.' }) 
    };
  }
};
