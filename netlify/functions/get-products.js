// This function is now designed to read from Google Sheets
exports.handler = async (event) => {
  const { GOOGLE_SHEET_ID, GOOGLE_SHEETS_API_KEY } = process.env;

  const sheetName = 'KabaleOnline Products';
  const range = 'A1:Z';

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEET_ID}/values/${sheetName}!${range}?key=${GOOGLE_SHEETS_API_KEY}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorBody = await response.json();
      throw new Error(`Google Sheets API error! status: ${response.status}`);
    }
    
    const data = await response.json();
    const rows = data.values;

    if (!rows || rows.length < 2) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ results: [] }),
      };
    }

    const headers = rows[0];
    const productsData = rows.slice(1);

    // This converts the Google Sheets data into clean JSON
    const products = productsData
      // --- THIS IS THE FIX: We filter out any empty rows before processing them ---
      .filter(row => row[0] && row[0].trim() !== '') // Only process rows that have an ID in the first column
      .map(row => {
        const product = {};
        headers.forEach((header, index) => {
          product[header] = row[index] || null;
        });
        return product;
      });

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
