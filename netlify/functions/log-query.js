// File: netlify/functions/log-query.js

exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { message } = JSON.parse(event.body);

    // Don't log empty messages
    if (!message) {
      return { statusCode: 400, body: 'No message found.' };
    }

    // ⭐ PASTE YOUR SHEETDB API URL HERE ⭐
    const SHEETDB_API_URL = 'https://sheetdb.io/api/v1/1jck3z015a84c';

    const dataToLog = {
      // Keys must match your Google Sheet column headers
      'Timestamp': new Date().toISOString(),
      'Query': message
    };

    // Send the data to your SheetDB API
    await fetch(SHEETDB_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: [dataToLog] }),
    });

    return { statusCode: 200 };

  } catch (err) {
    console.error('Logging Error:', err);
    return { statusCode: 500 };
  }
}