// The final version of get-products.js
exports.handler = async (event) => {
  // Reading from Netlify's secure environment variables
  const { BASEROW_API_TOKEN, BASEROW_PRODUCTS_TABLE_ID } = process.env;

  const { 
    pageSize, 
    page, 
    searchTerm, 
    category, 
    sale,
    featured,
    sponsored,
    verified
  } = event.queryStringParameters;
  
  const pageNumber = parseInt(page, 10) || 1;
  const size = parseInt(pageSize, 10) || 16;

  // These are your correct field IDs, confirmed from your API docs
  const fieldIds = {
    status: 'field_5235549',
    name: 'field_5235543',
    category: 'field_5235550',
    isOnSale: 'field_5235557',
    isFeatured: 'field_5235554',
    isSponsored: 'field_5235555',
    isVerified: 'field_5235556'
  };

  const conditions = [];

  // Always filter for items that are 'Approved'
  conditions.push({ type: 'equal', field: fieldIds.status, value: 'Approved' });

  // Add other filters only if they are provided in the request
  if (searchTerm) {
    conditions.push({ type: 'contains_ci', field: fieldIds.name, value: searchTerm });
  }
  if (category && category !== 'All') {
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
  
  const queryParams = new URLSearchParams({
    user_field_names: true,
    size: size,
    page: pageNumber,
    // Sorting by row ID is the most robust way to get newest items first
    order_by: '-id'
  });

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
    const baserowData = await response.json();
    
    // Baserow returns a 400 for a bad filter, not a 500. We need to check the response body for an error property.
    if (baserowData.error) {
        console.error('Baserow API Error:', baserowData.detail);
        throw new Error(`Baserow Error: ${baserowData.error}`);
    }
    
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
