// /netlify/functions/deleteCloudinaryImage.js
const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

exports.handler = async (event, context) => {
    try {
        const { public_id } = JSON.parse(event.body);
        if (!public_id) {
            return { statusCode: 400, body: JSON.stringify({ message: "Missing public_id" }) };
        }

        const result = await cloudinary.uploader.destroy(public_id);
        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Image deleted", result })
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Cloudinary deletion failed", error: error.message })
        };
    }
};