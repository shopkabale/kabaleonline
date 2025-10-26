// File: /netlify/functions/log-learning.js

const fetch = require('node-fetch');

// IMPORTANT: Replace this with your actual Google Apps Script Web App URL
const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbynhKbOtsRVTj39Shg116CYKzxJ8wn4Z-z_qzX7uWMb5601MYaSQLQ5gr9H7eH8C7U4xA/exec';

exports.handler = async function(event, context) {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const data = JSON.parse(event.body);

        // Prepare the data payload for the Google Sheet
        const payload = {
            type: 'learning', // This new type helps us identify these logs
            timestamp: new Date().toISOString(),
            userMessage: data.question || 'N/A',
            responseGiven: data.answer || 'N/A',
            contextSummary: 'Logged from a site user', // Simple context
            isAdmin: 'false' // Always false for public logs
        };

        // Send the data to your Google Apps Script
        await fetch(GOOGLE_SHEET_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Learning logged successfully' })
        };

    } catch (error) {
        console.error('Error in log-learning function:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to log learning.' })
        };
    }
};