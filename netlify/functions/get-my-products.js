// In netlify/functions/get-my-products.js
const { google } = require('googleapis');

exports.handler = async (event, context) => {
  // Ensure a user is logged in
  const { user } = context.clientContext;
  if (!user) {
    return { statusCode: 401, body: 'Unauthorized' };
  }

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
      return { statusCode: 200, body: JSON.stringify({ results: [] }) };
    }

    const headers = rows[0];
    const productsData = rows.slice(1);
    
    // Find the index of the SellerID column
    const sellerIdIndex = headers.indexOf('SellerID');
    if (sellerIdIndex === -1) {
        throw new Error("'SellerID' column not found in the sheet.");
    }

    // Get the logged-in user's unique ID
    const netlifyUserId = user.sub;

    // Filter the products to find only the ones that belong to the current user
    const myProductsData = productsData.filter(row => row[sellerIdIndex] === netlifyUserId);

    // Convert the filtered rows into clean JSON
    const myProducts = myProductsData.map(row => {
        const product = {};
        headers.forEach((header, index) => {
          product[header] = row[index] || null;
        });
        return product;
      });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ results: myProducts }),
    };

  } catch (error) {
    console.error('Function Error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'An error occurred.' }) };
  }
};
