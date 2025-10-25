// 📁 File: /netlify/functions/appendToSheet.js
// Purpose: Receives chatbot learnings or listings, then sends them to your Google Sheet Web App
// Works with your chatbot.js self-learning system

export async function handler(event, context) {
  try {
    // Allow CORS for local/offline testing
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };

    // Handle preflight request
    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 200, headers, body: 'OK' };
    }

    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method Not Allowed' })
      };
    }

    const body = JSON.parse(event.body);

    // ✅ Replace with your own Google Apps Script Web App URL
    const GOOGLE_SHEET_WEB_APP_URL =
      'https://script.google.com/macros/s/AKfycbzkFLLJY4kZGH2xidD_0oKZCNwCDlK0-O5yL86trlMU_ubWO4fKTe-aFgwD3bqTxvIlUA/exec';

    if (!GOOGLE_SHEET_WEB_APP_URL) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Google Sheet endpoint not configured' })
      };
    }

    // Send to Google Sheets Web App
    const response = await fetch(GOOGLE_SHEET_WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const result = await response.text();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'Data sent successfully', result })
    };
  } catch (error) {
    console.error('Error appending to Google Sheet:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to append to Google Sheet', details: error.message })
    };
  }
}