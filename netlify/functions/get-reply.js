// File Path: netlify/functions/get-reply.js

const dialogflow = require('@google-cloud/dialogflow');
const { answers } = require('../../bot/data/answers.js');

// Get the secret key for the vault from the environment
const VAULT_KEY = process.env.DIALOGFLOW_VAULT_KEY;

// This function securely fetches the credentials from our vault function
async function getCredentials() {
  // The URL of your new vault function
  const vaultUrl = `${process.env.URL}/.netlify/functions/get-dialogflow-creds`;
  
  const response = await fetch(vaultUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessKey: VAULT_KEY }),
  });

  if (!response.ok) {
    throw new Error('Could not fetch credentials from vault.');
  }
  
  return await response.json();
}

// --- NETLIFY FUNCTION HANDLER ---
exports.handler = async (event) => {
    const { message, sessionId } = JSON.parse(event.body);

    if (!message || !sessionId) {
        return { statusCode: 400, body: 'Missing message or sessionId' };
    }

    try {
        // 1. Get credentials from the vault first
        const credentials = await getCredentials();
        const PROJECT_ID = credentials.project_id;

        // 2. Initialize the Dialogflow client with the fetched credentials
        const sessionClient = new dialogflow.SessionsClient({ credentials });
        
        const sessionPath = sessionClient.projectAgentSessionPath(PROJECT_ID, sessionId);
        const request = {
            session: sessionPath,
            queryInput: { text: { text: message, languageCode: 'en-US' } },
        };

        // 3. Talk to Dialogflow as normal
        const responses = await sessionClient.detectIntent(request);
        const result = responses[0].queryResult;
        const intentName = result.intent.displayName;
        const reply = answers[intentName] || answers['help'];

        return {
            statusCode: 200,
            body: JSON.stringify({ reply: reply }),
        };
    } catch (error) {
        console.error('Dialogflow Error:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to get a reply from the agent.' }) };
    }
};