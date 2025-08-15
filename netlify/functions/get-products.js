// A hardcoded test to force connection to the correct sheet.
exports.handler = async (event) => {
  // --- PASTE YOUR DETAILS DIRECTLY HERE FOR THE TEST ---

  const GOOGLE_SHEET_ID = '1VfPh73UlwLZRWoIOuwgcrmDeyLtchMaaWSluaZeCq5U';
  const GOOGLE_SHEETS_API_KEY = 'AIzaSyBA3daP6sl9cnVM3m2EsI-gZ_Zq90EJco8';
  
  // ----------------------------------------------------

  const sheetName = 'KabaleOnline Products';
  const range = 'A1:Z';
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEET_ID}/values/${sheetName}!${range}?key=${GOOGLE_SHEETS_API_KEY}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
        const errorBody = await response.json();
        console.error('Google Sheets API Error:', errorBody);
        throw new Error('Google Sheets API request failed');
    }
    
    const data = await response.json();
    const rows = data.values;

    if (!rows || rows.length < 2) {
      return { statusCode: 200, body: JSON.stringify([]) };
    }

    const headers = rows[0];
    const products = rows.slice(1)
      .filter(row => row[0] && row[0].trim() !== '')
      .map(row => {
        const product = {};
        headers.forEach((header, index) => { product[header] = row[index] || null; });
        return product;
      });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(products),
    };

  } catch (error) {
    console.error('Function Error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'An error occurred.' }) };
  }
};
