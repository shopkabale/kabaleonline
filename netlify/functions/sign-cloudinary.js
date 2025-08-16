// netlify/functions/sign-cloudinary.js
// Signs a Cloudinary upload; keeps API secret off the client.

const crypto = require("crypto");

exports.handler = async (event) => {
  try {
    const { CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CLOUDINARY_UPLOAD_PRESET } = process.env;

    // Client may pass public params (e.g., folder, moderation)
    const body = event.body ? JSON.parse(event.body) : {};
    const timestamp = Math.floor(Date.now() / 1000);

    // Build the string to sign (alphabetical order of params, exclude file, api_key, resource_type)
    // We allow these optional params:
    const paramsToSign = {
      timestamp,
      upload_preset: CLOUDINARY_UPLOAD_PRESET,
      folder: body.folder || "kabaleonline/products",
      moderation: body.moderation || "manual",  // optional; requires add-on for auto
      context: body.context || "",              // e.g. "alt=KabaleOnline|app=seller"
    };

    // Build signature string
    const toSign = Object.keys(paramsToSign)
      .filter((k) => paramsToSign[k] !== "" && paramsToSign[k] !== undefined)
      .sort()
      .map((k) => `${k}=${paramsToSign[k]}`)
      .join("&");

    const signature = crypto
      .createHash("sha1")
      .update(toSign + CLOUDINARY_API_SECRET)
      .digest("hex");

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey: CLOUDINARY_API_KEY,
        timestamp,
        signature,
        upload_preset: paramsToSign.upload_preset,
        folder: paramsToSign.folder,
        moderation: paramsToSign.moderation,
        context: paramsToSign.context,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      }),
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};