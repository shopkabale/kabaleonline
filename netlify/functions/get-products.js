// In netlify/functions/get-products.js
const { BASEROW_API_TOKEN, BASEROW_DATABASE_ID, BASEROW_PRODUCTS_TABLE_ID } = process.env;

exports.handler = async (event) => {
  // Removed 'district' from the parameters
  const { type, pageSize, page, searchTerm, category } = event.queryStringParameters;

  const pageNumber = parseInt(page, 10) || 1;
  const size = parseInt(pageSize, 10) || 16;
  
  const queryParams = new URLSearchParams({
    user_field_names: true,
    size: size,
    page: pageNumber,
    order_by: '-PublishDate'
  });

  let filters = {
    filter_type: 'AND',
    filters: [
      { type: 'equal', field: 'Status', value: 'Approved' }
    ]
  };

  if (type === 'featured') {
      filters.filters.push({ type: 'boolean', field: 'IsFeatured', value: true });
  } else if (type === 'sponsored') {
      filters.filters.push({ type: 'boolean', field: 'IsSponsored', value: true });
  } else if (type === 'verified') {
      filters.filters.push({ type: 'boolean', field: 'IsVerifiedSeller', value: true });
  } else if (type === 'sale') {
      filters.filters.push({ type: 'boolean', field: 'IsOnSale', value: true });
  }

  if (!type) {
    if (category && category !== 'All') {
        filters.filters.push({ type: 'equal', field: 'Category', value: category });
    }
    // Removed the 'district' filter logic
    if (searchTerm) {
        filters.filters.push({ type: 'contains_ci', field: 'Name', value: searchTerm });
    }
  }

  queryParams.append('filters', JSON.stringify(filters));

  const url = `https://api.baserow.io/api/database/rows/table/${BASEROW_PRODUCTS_TABLE_ID}/?${queryParams.toString()}`;
  
  console.log(`Fetching from Baserow: ${url}`);

  try {
    const response = await fetch(url, {
      headers: { 'Authorization': `Token ${BASEROW_API_TOKEN}` },
    });
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Baserow Error: ${response.status} ${errorBody}`);
    }
    
    const baserowData = await response.json();
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(baserowData),
    };

  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
