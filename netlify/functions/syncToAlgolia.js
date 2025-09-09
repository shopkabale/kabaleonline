exports.handler = async (event) => {
    try {
        const productsSnapshot = await db.collection('products').get();
        const algoliaObjects = productsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                objectID: doc.id,
                name: data.name,
                name_lowercase: data.name_lowercase,
                description: data.description,
                category: data.category,
                price: data.price,
                listing_type: data.listing_type,
                sellerId: data.sellerId,
                sellerName: data.sellerName, // <-- ADD THIS LINE
                imageUrls: data.imageUrls,
                isSold: data.isSold || false,
                createdAt: data.createdAt ? data.createdAt.toMillis() : null
            };
        });

        // Save all product data to Algolia in a single batch
        await index.saveObjects(algoliaObjects);

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Data synced to Algolia successfully." }),
        };
    } catch (error) {
        console.error("Algolia sync error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Failed to sync data to Algolia." }),
        };
    }
};
