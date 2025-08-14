// In netlify/functions/create-product.js
const { google } = require('googleapis');

exports.handler = async (event) => {
  // We only accept POST requests to this function
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Get the product data submitted by the form
    const productData = JSON.parse(event.body);

    // --- Prepare credentials to access Google Sheets ---
    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const sheets = google.sheets({ version: 'v4', auth });

    // --- Prepare the new row data ---
    // The order of items in this array MUST MATCH the order of your columns in the sheet
    const newRow = [
      new Date().getTime(), // Generates a unique ID based on the current time
      productData.name,
      productData.description,
      productData.price,
      productData.sellerName,
      productData.sellerPhone,
      '', // ImageURL - will be empty for now
      'Pending Review', // Default status for all new submissions
      productData.category,
      'FALSE', // IsFeatured
      'FALSE', // IsSponsored
      'FALSE', // IsVerified
      'FALSE'  // IsOnSale
    ];

    // --- Append the new row to the spreadsheet ---
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'KabaleOnline Products!A1', // Appends after the last row in this sheet
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [newRow],
      },
    });

    // --- Return a success message ---
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Product submitted successfully!' }),
    };

  } catch (error) {
    console.error('Function Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to submit product.' }),
    };
  }
};
