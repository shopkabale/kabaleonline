// netlify/functions/generate-signature.js
const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

exports.handler = async (event) => {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const signature = cloudinary.utils.api_sign_request({ timestamp }, process.env.CLOUDINARY_API_SECRET);

    return {
        statusCode: 200,
        body: JSON.stringify({ signature, timestamp }),
    };
};
