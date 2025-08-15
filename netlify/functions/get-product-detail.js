// In netlify/functions/get-product-detail.js

exports.handler = async (event) => {
  // Get secrets from Netlify environment variables
  const { GOOGLE_SHEET_ID, GOOGLE_SHEETS_API_KEY } = process.env;
  
  // Get the product ID from the request URL (e.g., ?id=123)
  const { id } = event.queryStringParameters;

  // If no ID is provided, return an error
  if (!id) {
    return { 
      statusCode: 400, 
      body: JSON.stringify({ error: 'Product ID is required.' }) 
    };
  }

  const sheetName = 'KabaleOnline Products';
  const range = 'A1:Z'; // Get all data to find the product
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEET_ID}/values/${sheetName}!${range}?key=${GOOGLE_SHEETS_API_KEY}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Google Sheets API request failed');
    }
    
    const data = await response.json();
    const rows = data.values;

    if (!rows || rows.length < 2) {
      // No data in the sheet
      return { 
        statusCode: 404, 
        body: JSON.stringify({ error: 'Product not found.' }) 
      };
    }

    const headers = rows[0];
    const productsData = rows.slice(1);
    
    // Find the specific product row where the first column matches the requested ID
    const productRow = productsData.find(row => row[0] === id); 

    if (!productRow) {
      // The specific ID was not found in the sheet
      return { 
        statusCode: 404, 
        body: JSON.stringify({ error: 'Product not found.' }) 
      };
    }

    // Convert the found row into a clean JSON object
    const product = {};
    headers.forEach((header, index) => {
      product[header] = productRow[index] || null;
    });

    // Return the single product's data
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    };

  } catch (error) {
    console.error('Function Error:', error);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: 'An error occurred.' }) 
    };
  }
};
