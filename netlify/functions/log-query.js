// File Path: netlify/functions/log-query.js

exports.handler = async (event) => {
  // Only allow POST requests for security
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { message } = JSON.parse(event.body);

    // Don't log empty messages
    if (!message) {
      return { statusCode: 400, body: 'No message found.' };
    }

    // Your actual SheetDB API URL is now included
    const SHEETDB_API_URL = 'https://sheetdb.io/api/v1/1jck3z015a84c';

    const dataToLog = {
      // Keys 'Timestamp' and 'Query' must exactly match your Google Sheet column headers
      'Timestamp': new Date().toISOString(),
      'Query': message
    };

    // Send the data to your SheetDB API
    await fetch(SHEETDB_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: [dataToLog] }), // SheetDB expects data in this format
    });

    return { statusCode: 200, body: 'Query logged.' }; // Success

  } catch (err) {
    console.error('Logging Error:', err);
    return { statusCode: 500, body: 'Internal Server Error.' };
  }
}