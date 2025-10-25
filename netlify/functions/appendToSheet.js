// File: /netlify/functions/appendToSheet.js
export async function handler(event) {
  // Allow CORS for testing
  const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: 'OK' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  try {
    const body = JSON.parse(event.body);
    // ⭐ PASTE YOUR GOOGLE WEB APP URL HERE
    const GOOGLE_SHEET_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbybbHqOgGsr90y5LNkUnhy5dlfQWcL0eOP813Hm7hl48xagfRIsavzUK_p8-2_leAEKTw/exec';

    const response = await fetch(GOOGLE_SHEET_WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const result = await response.text();
    return { statusCode: 200, headers, body: JSON.stringify({ message: 'Data sent', result }) };
  } catch (error) {
    console.error('Error appending to Google Sheet:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to append to Google Sheet' }) };
  }
}