// This function securely reads your server-side environment variables 
// and sends only the SAFE, public ones to the webpage.

exports.handler = async (event) => {
    try {
        // Read the keys from your Netlify environment variables
        const appId = process.env.ALGOLIA_APP_ID;
        
        // This uses the exact variable name from the screenshot you sent
        const searchKey = process.env.ALGOLIA_SEARCH_API_KEY; 

        if (!appId || !searchKey) {
            throw new Error("Algolia environment variables are not set in Netlify.");
        }

        // Securely send only the public keys to the browser
        return {
            statusCode: 200,
            body: JSON.stringify({ 
                appId: appId,
                searchKey: searchKey 
            }),
        };
    } catch (error) {
        console.error("Error fetching Algolia keys:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Could not retrieve API keys." }),
        };
    }
};
