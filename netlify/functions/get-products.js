// The final, simple get-products.js
exports.handler = async () => {
  const { GOOGLE_SHEET_ID, GOOGLE_SHEETS_API_KEY } = process.env;

  const sheetName = 'KabaleOnline Products';
  const range = 'A1:Z';
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEET_ID}/values/${sheetName}!${range}?key=${GOOGLE_SHEETS_API_KEY}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Google Sheets API request failed');
    
    const data = await response.json();
    const rows = data.values;

    if (!rows || rows.length < 2) {
      return { statusCode: 200, body: JSON.stringify([]) }; // Return empty array
    }

    const headers = rows[0];
    const products = rows.slice(1)
      .filter(row => row[0] && row[0].trim() !== '') // Filter out empty rows
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
      body: JSON.stringify(products), // Send the full list of products
    };

  } catch (error) {
    console.error('Function Error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'An error occurred.' }) };
  }
};
