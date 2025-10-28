// File Path: /netlify/functions/external-search.js
const { google } = require('googleapis');
const customsearch = google.customsearch('v1');

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') { return { statusCode: 405, body: 'Method Not Allowed' }; }
    const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
    const SEARCH_ENGINE_ID = process.env.SEARCH_ENGINE_ID;
    if (!GOOGLE_API_KEY || !SEARCH_ENGINE_ID) {
        return { statusCode: 500, body: JSON.stringify({ error: 'External search is not configured.' }) };
    }
    try {
        const { query } = JSON.parse(event.body);
        const res = await customsearch.cse.list({
            auth: GOOGLE_API_KEY,
            cx: SEARCH_ENGINE_ID,
            q: query,
        });
        if (res.data.items && res.data.items.length > 0) {
            const firstResult = res.data.items[0];
            const snippet = firstResult.snippet.replace(/(\r\n|\n|\r)/gm, " ").replace(/\s\s+/g, ' ');
            return { statusCode: 200, body: JSON.stringify({ text: `Let me check... According to my sources, ${snippet}` }) };
        } else {
            return { statusCode: 200, body: JSON.stringify({ text: null }) };
        }
    } catch (error) {
        console.error("Google Search error:", error);
        return { statusCode: 200, body: JSON.stringify({ text: null }) };
    }
};