// The final, expert-corrected get-products.js for Baserow
exports.handler = async (event) => {
  const { 
    BASEROW_API_TOKEN, 
    BASEROW_PRODUCTS_TABLE_ID,
    BASEROW_ROW_ID_FIELD_ID // The new variable for our sort field
  } = process.env;

  const { 
    pageSize, page, searchTerm, category, 
    sale, featured, sponsored, verified
  } = event.queryStringParameters;
  
  const pageNumber = parseInt(page, 10) || 1;
  const size = parseInt(pageSize, 10) || 16;

  // Field IDs are now stored as numbers, not strings
  const fieldIds = {
    status: 5235549,
    name: 5235543,
    category: 5235550,
    isOnSale: 5235557,
    isFeatured: 5235554,
    isSponsored: 5235555,
    isVerified: 5235556
  };

  const conditions = [];
  conditions.push({ type: 'equal', field: fieldIds.status, value: 'Approved' });

  if (searchTerm) conditions.push({ type: 'contains', field: fieldIds.name, value: searchTerm }); // 'contains' is safer than 'contains_ci'
  if (category && category !== 'All') conditions.push({ type: 'equal', field: fieldIds.category, value: category });
  if (sale === 'true') conditions.push({ type: 'boolean', field: fieldIds.isOnSale, value: true });
  if (featured === 'true') conditions.push({ type: 'boolean', field: fieldIds.isFeatured, value: true });
  if (sponsored === 'true') conditions.push({ type: 'boolean', field: fieldIds.isSponsored, value: true });
  if (verified === 'true') conditions.push({ type: 'boolean', field: fieldIds.isVerified, value: true });
  
  // NOTE: We are NOT using 'user_field_names=true' anymore
  const queryParams = new URLSearchParams({
    size: size,
    page: pageNumber,
    order_by: `-${BASEROW_ROW_ID_FIELD_ID}` // Correct sorting
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
