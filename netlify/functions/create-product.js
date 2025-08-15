// Advanced create-product.js with image uploading
const { google } = require('googleapis');
const { v2: cloudinary } = require('cloudinary');
const busboy = require('busboy');

// Helper function to parse multipart form data
const parseMultipartForm = (event) => {
    return new Promise((resolve) => {
        const busboyInstance = busboy({ headers: event.headers });
        const fields = {};
        let fileData = {};

        busboyInstance.on('file', (fieldname, file, filename, encoding, mimetype) => {
            const chunks = [];
            file.on('data', (chunk) => chunks.push(chunk));
            file.on('end', () => {
                fileData = {
                    content: Buffer.concat(chunks),
                    filename: filename.filename,
                    contentType: filename.mimeType,
                };
            });
        });

        busboyInstance.on('field', (fieldname, val) => { fields[fieldname] = val; });
        busboyInstance.on('finish', () => resolve({ fields, fileData }));
        
        busboyInstance.end(Buffer.from(event.body, 'base64'));
    });
};


exports.handler = async (event, context) => {
    // Ensure a user is logged in
    const { user } = context.clientContext;
    if (!user) {
        return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    try {
        // --- 1. Parse the form data (including the image file) ---
        const { fields, fileData } = await parseMultipartForm(event);

        // --- 2. Configure and upload the image to Cloudinary ---
        cloudinary.config({ 
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
            api_key: process.env.CLOUDINARY_API_KEY, 
            api_secret: process.env.CLOUDINARY_API_SECRET,
            secure: true
        });

        const imageUploadResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                { folder: "kabale-online-products" },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );
            uploadStream.end(fileData.content);
        });
        const imageUrl = imageUploadResult.secure_url;

        // --- 3. Prepare credentials and connect to Google Sheets ---
        const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
        const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
        const sheets = google.sheets({ version: 'v4', auth });

        // --- 4. Prepare the new row for the sheet ---
        const newRow = [
            new Date().getTime(),      // id
            fields.Name,               // Name from form
            fields.Description,        // Description from form
            fields.Price,              // Price from form
            fields.SellerName,         // SellerName from form
            fields.SellerPhone,        // SellerPhone from form
            imageUrl,                  // <-- The new image URL from Cloudinary
            'Pending Review',          // Status
            fields.Category,           // Category from form
            'FALSE', 'FALSE', 'FALSE', 'FALSE', // IsFeatured, etc.
            user.sub                   // The logged-in seller's unique Netlify ID
        ];

        // --- 5. Append the new row to the sheet ---
        await sheets.spreadsheets.values.append({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: 'KabaleOnline Products!A1',
            valueInputOption: 'USER_ENTERED',
            resource: { values: [newRow] },
        });

        return { statusCode: 200, body: JSON.stringify({ message: 'Product submitted!' }) };

    } catch (error) {
        console.error('Function Error:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to submit product.' }) };
    }
};
