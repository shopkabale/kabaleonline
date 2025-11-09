const admin = require('firebase-admin');

// It builds the service account using your Base64 private key
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  // This line now correctly decodes your Base64 key
  privateKey: Buffer.from(process.env.FIREBASE_PRIVATE_KEY, 'base64').toString('ascii'),
};

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
      return { statusCode: 200, body: "No old messages found." };
    }

    // 3. --- THIS IS THE FIX ---
    // We must use a 'for...of' loop instead of 'forEach' to use 'await'
    let batch = db.batch();
    let deleteCount = 0; // Count for the current batch
    let totalDeleted = 0; // Total count for the whole run

    for (const doc of snapshot.docs) {
        batch.delete(doc.ref);
        deleteCount++;
        totalDeleted++;

        // Commit the batch every 500 deletes
        if (deleteCount === 500) {
            console.log("Committing a batch of 500 deletes...");
            await batch.commit();
            batch = db.batch(); // Start a new batch
            deleteCount = 0; // Reset batch counter
        }
    }

    // 4. Commit any remaining messages in the final batch
    if (deleteCount > 0) {
        console.log(`Committing final batch of ${deleteCount} deletes...`);
        await batch.commit();
    }
    // --- END OF FIX ---

    console.log(`Successfully deleted ${totalDeleted} old messages.`);
    return {
      statusCode: 200,
      body: `Successfully deleted ${totalDeleted} old messages.`
    };

  } catch (error) {
    console.error("Error cleaning up messages:", error);
    return { statusCode: 500, body: "Error cleaning up messages." };
  }
};