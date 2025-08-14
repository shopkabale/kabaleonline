// This function is now designed to read from Google Sheets
exports.handler = async (event) => {
  // Get your new secrets from Netlify's environment variables
  const { GOOGLE_SHEET_ID, GOOGLE_SHEETS_API_KEY } = process.env;

  const sheetName = 'Sheet1'; // This is the default name of the first sheet
  const range = 'A1:Z'; // Fetch all data from row 1 downwards

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEET_ID}/values/${sheetName}!${range}?key=${GOOGLE_SHEETS_API_KEY}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorBody = await response.json();
      console.error('Google Sheets API Error:', errorBody);
      throw new Error(`Google Sheets API error! status: ${response.status}`);
    }
    
    const data = await response.json();
    const rows = data.values;

    if (!rows || rows.length < 2) {
      // Not enough data if we don't have a header row and at least one product
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ results: [] }),
      };
    }

    // The first row contains the headers (e.g., 'Name', 'Price')
    const headers = rows[0];
    // The rest of the rows contain the product data
    const productsData = rows.slice(1);

    // This part converts the Google Sheets data (array of arrays)
    // into the clean JSON our frontend expects (array of objects)
    const products = productsData.map(row => {
      const product = {};
      headers.forEach((header, index) => {
        product[header] = row[index] || null; // Use null for empty cells
      });
      return product;
    });

    // For now, we are just returning all products.
    // We will add filtering and pagination back in the next step.
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ results: products }),
    };

  } catch (error) {
    console.error('Function Error:', error);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: 'An internal server error occurred.' }) 
    };
  }
};
