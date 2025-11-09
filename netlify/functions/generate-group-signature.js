// netlify/functions/generate-group-signature.js

const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

exports.handler = async (event) => {
    const timestamp = Math.round(new Date().getTime() / 1000);

    // Create the secure signature
    const signature = cloudinary.utils.api_sign_request({ timestamp }, process.env.CLOUDINARY_API_SECRET);

    // Securely send the signature AND your public keys to the browser
    return {
        statusCode: 200,
        body: JSON.stringify({
            signature: signature,
            timestamp: timestamp,
            cloudname: process.env.CLOUDINARY_CLOUD_NAME,
            apikey: process.env.CLOUDINARY_API_KEY,
        }),
    };
};