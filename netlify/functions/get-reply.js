// File Path: netlify/functions/get-reply.js

const dialogflow = require('@google-cloud/dialogflow');
const { answers } = require('../../bot/data/answers.js');

// ⭐ FIX: Read the single JSON variable
const credentialsJson = process.env.GOOGLE_CREDENTIALS_JSON_DIALOGFLOW;
if (!credentialsJson) {
    throw new Error("Dialogflow credentials JSON is not set in environment variables.");
}
const credentials = JSON.parse(credentialsJson);
const PROJECT_ID = credentials.project_id;

const sessionClient = new dialogflow.SessionsClient({ credentials });

exports.handler = async (event) => {
    const { message, sessionId } = JSON.parse(event.body);
    if (!message || !sessionId) return { statusCode: 400, body: 'Missing params' };

    const sessionPath = sessionClient.projectAgentSessionPath(PROJECT_ID, sessionId);
    const request = {
        session: sessionPath,
        queryInput: { text: { text: message, languageCode: 'en-US' } },
    };

    try {
        const responses = await sessionClient.detectIntent(request);
        const result = responses[0].queryResult;
        const intentName = result.intent.displayName;
        const reply = answers[intentName] || answers['help'];

        return { statusCode: 200, body: JSON.stringify({ reply }) };
    } catch (error) {
        console.error('Dialogflow Error:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to get reply.' }) };
    }
};