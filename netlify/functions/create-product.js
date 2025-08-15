// In netlify/functions/create-product.js
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
    const { user } = context.clientContext;
    if (!user) {
        return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    try {
        const { fields, fileData } = await parseMultipartForm(event);

        // Upload image to Cloudinary
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

        // Connect to Google Sheets
        const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
        const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
        const sheets = google.sheets({ version: 'v4', auth });

        // --- THIS IS THE CORRECTED SECTION ---
        // We now use the correct uppercase properties from the form (fields.Name, fields.Price, etc.)
        const newRow = [
            new Date().getTime(),
            fields.Name,
            fields.Description,
            fields.Price,
            fields.SellerName,
            fields.SellerPhone,
            imageUrl,
            'Pending Review',
            fields.Category,
            'FALSE', 'FALSE', 'FALSE', 'FALSE',
            user.sub
        ];

        // Append the new row to the sheet
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
