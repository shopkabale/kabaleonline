// In netlify/functions/get-product-detail.js
const cache = new Map();
const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

exports.handler = async (event) => {
  // Check cache first
  const cacheKey = event.rawQuery;
  const now = Date.now();
  if (cache.has(cacheKey)) {
    const cachedItem = cache.get(cacheKey);
    if (now - cachedItem.timestamp < CACHE_DURATION_MS) {
      console.log(`Serving from CACHE for query: ${cacheKey}`);
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: cachedItem.data };
    }
  }
  
  // The rest of the function is the same
  const { GOOGLE_SHEET_ID, GOOGLE_SHEETS_API_KEY } = process.env;
  const { id } = event.queryStringParameters;

  if (!id) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Product ID is required.' }) };
  }

  const sheetName = 'KabaleOnline Products';
  const range = 'A1:Z';
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEET_ID}/values/${sheetName}!${range}?key=${GOOGLE_SHEETS_API_KEY}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Google Sheets API request failed');
    const data = await response.json();
    const rows = data.values;

    if (!rows || rows.length < 2) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Product not found.' }) };
    }

    const headers = rows[0];
    const productRow = rows.slice(1).find(row => row[0] === id);

    if (!productRow) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Product not found.' }) };
    }

    const product = {};
    headers.forEach((header, index) => {
      product[header] = productRow[index] || null;
    });

    const responseBody = JSON.stringify(product);

    // Save to cache before returning
    cache.set(cacheKey, { timestamp: now, data: responseBody });

    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: responseBody };
  } catch (error) {
    console.error('Function Error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'An error occurred.' }) };
  }
};
