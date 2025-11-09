const admin = require('firebase-admin');

// --- THIS IS THE UPDATED PART ---
// It builds the service account using your Base64 private key
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  // This line now correctly decodes your Base64 key
  privateKey: Buffer.from(process.env.FIREBASE_PRIVATE_KEY, 'base64').toString('ascii'),
};
// --- END OF UPDATED PART ---

// Initialize Firebase Admin (only once)
try {
  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
} catch (e) {
  console.error('Firebase admin initialization error', e);
}

const db = admin.firestore();

// This is the function Netlify will run
exports.handler = async (event, context) => {
  console.log("Running scheduled message cleanup...");

  // 1. Calculate the timestamp for 2 days ago
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  try {
    // 2. Query ALL "messages" collections (using a Collection Group)
    const oldMessagesQuery = db.collectionGroup('messages')
      .where('createdAt', '<', twoDaysAgo);

    const snapshot = await oldMessagesQuery.get();

    if (snapshot.empty) {
      console.log("No old messages found to delete.");
      return { statusCode: 200, body: "No old messages." };
    }

    // 3. Delete the messages in batches
    let batch = db.batch();
    let deleteCount = 0;

    snapshot.docs.forEach((doc, index) => {
      batch.delete(doc.ref);
      deleteCount++;

      // If we hit 500, commit the batch and start a new one
      if ((index + 1) % 500 === 0) {
        console.log("Committing a batch of 500 deletes...");
        await batch.commit(); // Added await
        batch = db.batch();
      }
    });

    // 4. Commit any remaining messages in the last batch
    await batch.commit();

    console.log(`Successfully deleted ${deleteCount} old messages.`);
    return {
      statusCode: 200,
      body: `Successfully deleted ${deleteCount} old messages.`
    };

  } catch (error) {
    console.error("Error cleaning up messages:", error);
    return { statusCode: 500, body: "Error cleaning up messages." };
  }
};