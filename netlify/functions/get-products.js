// In netlify/functions/get-products.js

exports.handler = async (event) => {
  // --- TEMPORARY TEST: Bypassing Netlify's environment variables ---

  // 1. Replace the placeholder below with your actual Baserow Table ID number.
  const TABLE_ID = '641145'; 

  // 2. Replace the placeholder below with your actual Baserow API Token string.
  const API_TOKEN = '4wVfVprHP28mXOqJaRTs0sienxgaJBlY'; 

  // --- End of variables to change ---


  const { pageSize, page } = event.queryStringParameters;
  const pageNumber = parseInt(page, 10) || 1;
  const size = parseInt(pageSize, 10) || 16;
  
  const queryParams = new URLSearchParams({
    user_field_names: true,
    size: size,
    page: pageNumber
  });

  const url = `https://api.baserow.io/api/database/rows/table/${TABLE_ID}/?${queryParams.toString()}`;

  try {
    const response = await fetch(url, {
      headers: { 'Authorization': `Token ${API_TOKEN}` },
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
