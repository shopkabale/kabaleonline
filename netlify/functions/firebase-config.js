// netlify/functions/firebase-config.js
exports.handler = async () => {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", "Cache-Control":"no-store" },
    body: JSON.stringify({
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN,
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.FIREBASE_APP_ID,
    }),
  };
};