// File Path: netlify/functions/get-reply.js

const dialogflow = require('@google-cloud/dialogflow');
// This line requires your answers.js file. Make sure this path is correct.
// It assumes your answers.js file is at `bot/data/answers.js`.
const { answers } = require('../../bot/data/answers.js');

// --- READ SECRETS FROM NETLIFY ENVIRONMENT ---
const PROJECT_ID = process.env.DIALOGFLOW_PROJECT_ID;
// This line correctly formats the private key for Google's library
const PRIVATE_KEY = process.env.DIALOGFLOW_PRIVATE_KEY.replace(/\\n/g, '\n');
const CLIENT_EMAIL = process.env.DIALOGFLOW_CLIENT_EMAIL;

// --- INITIALIZE DIALOGFLOW CLIENT ---
const sessionClient = new dialogflow.SessionsClient({
  credentials: { private_key: PRIVATE_KEY, client_email: CLIENT_EMAIL }
});

// --- NETLIFY FUNCTION HANDLER ---
exports.handler = async (event) => {
    // Get the user's message and a unique ID for the conversation
    const { message, sessionId } = JSON.parse(event.body);

    if (!message || !sessionId) {
        return { statusCode: 400, body: 'Missing message or sessionId' };
    }

    const sessionPath = sessionClient.projectAgentSessionPath(PROJECT_ID, sessionId);

    // The request we send to Dialogflow
    const request = {
        session: sessionPath,
        queryInput: {
            text: {
                text: message,
                languageCode: 'en-US',
            },
        },
    };

    try {
        // Send the request and get the result
        const responses = await sessionClient.detectIntent(request);
        const result = responses[0].queryResult;
        
        // The intent name (e.g., "sell_item", "rent", "contact")
        const intentName = result.intent.displayName;

        // Use the detected intent name to look up the detailed answer from your answers.js file
        const reply = answers[intentName] || answers['help']; // Fallback to 'help' if intent is unknown

        return {
            statusCode: 200,
            body: JSON.stringify({ reply: reply }),
        };
    } catch (error) {
        console.error('Dialogflow Error:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to get a reply from the agent.' }) };
    }
};