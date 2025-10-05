const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

try {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_ADMIN_SDK))
    });
  }
} catch (e) {
  console.error('Firebase admin initialization error', e.stack);
}

const db = admin.firestore();

// Helper to get Cloudinary URLs (copied from your product.js)
function getCloudinaryTransformedUrl(url, type) {
    if (!url || !url.includes('res.cloudinary.com')) return url || '';
    const transformations = { full: 'c_limit,w_800,h_800,f_auto,q_auto' };
    const transformString = transformations[type] || '';
    const urlParts = url.split('/upload/');
    if (urlParts.length !== 2) return url;
    return `${urlParts[0]}/upload/${transformString}/${urlParts[1]}`;
}

exports.handler = async function(event, context) {
  try {
    const productId = event.path.split('/').pop();
    if (!productId) throw new Error('Product ID not found.');

    // Fetch Product Data
    const productRef = db.collection('products').doc(productId);
    const productSnap = await productRef.get();
    if (!productSnap.exists) {
        return { statusCode: 404, body: 'Product not found.' };
    }
    const product = productSnap.data();
    product.id = productSnap.id; // Add id to the object

    // Fetch Seller Data
    const sellerRef = db.collection('users').doc(product.sellerId);
    const sellerSnap = await sellerRef.get();
    const seller = sellerSnap.exists() ? sellerSnap.data() : {};

    // Build the main product HTML content
    const whatsappLink = `https://wa.me/${product.whatsapp}?text=Hello, I'm interested in your listing for '${product.name}' on Kabale Online.`;
    const optimizedImagesHtml = (product.imageUrls || []).map(url => `<img src="${getCloudinaryTransformedUrl(url, 'full')}" alt="${product.name}">`).join('');
    const productHtml = `
        <div class="product-detail-container">
            <div class="product-images">${optimizedImagesHtml}</div>
            <div class="product-info">
                <div class="product-title-header">
                    <h1 id="product-name">${product.name}</h1>
                    <button id="share-btn" title="Share"><i class="fa-solid fa-share-alt"></i></button>
                </div>
                <h2 id="product-price">UGX ${product.price.toLocaleString()}</h2>
                <p id="product-description">${product.description || ''}</p>
                <div class="seller-card">
                    <h4>About the Seller</h4>
                    <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
                        <img src="${seller.profilePhotoUrl || '/placeholder.webp'}" alt="${seller.name}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;">
                        <div>
                            <strong>${seller.name || 'Seller'}</strong>
                            <div id="user-badges">${(seller.badges || []).includes('verified') ? '<span class="badge-icon verified"><i class="fa-solid fa-circle-check"></i> Verified</span>' : ''}</div>
                        </div>
                    </div>
                    <div class="contact-buttons">
                        <button id="wishlist-btn" class="cta-button wishlist-btn" style="display: none;"><i class="fa-regular fa-heart"></i> Add to Wishlist</button>
                        <a href="/chat.html?recipientId=${product.sellerId}" id="contact-seller-btn" class="cta-button message-btn"><i class="fa-solid fa-comment-dots"></i> Message Seller</a>
                        <a href="${whatsappLink}" target="_blank" class="cta-button whatsapp-btn"><i class="fa-brands fa-whatsapp"></i> Contact via WhatsApp</a>
                        <a href="/profile.html?sellerId=${product.sellerId}" class="cta-button profile-btn">View Public Profile</a>
                    </div>
                </div>
            </div>
        </div>`;
    
    // Load the HTML template
    const templatePath = path.resolve(__dirname, 'product-template.html');
    let html = fs.readFileSync(templatePath, 'utf-8');

    // Prepare data and replace placeholders
    const pageTitle = `${product.name} for Sale | Kabale Online`;
    const pageDescription = `Find a great deal on a ${product.name} in Kabale. Priced at UGX ${product.price ? product.price.toLocaleString() : 'N/A'}.`;
    const canonicalUrl = `https://www.kabaleonline.com/product/${productId}`;
    const imageUrl = product.imageUrls && product.imageUrls[0] ? product.imageUrls[0] : '';
    const fullData = { product, seller };

    html = html.replace(/%%TITLE%%/g, pageTitle);
    html = html.replace(/%%DESCRIPTION%%/g, pageDescription);
    html = html.replace(/%%CANONICAL_URL%%/g, canonicalUrl);
    html = html.replace(/%%IMAGE_URL%%/g, imageUrl);
    html = html.replace('%%PRODUCT_HTML%%', productHtml);
    html = html.replace('%%PRODUCT_DATA_JSON%%', JSON.stringify(fullData));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/html' },
      body: html,
    };
  } catch (error) {
    console.error('Error in product-page function:', error);
    return { statusCode: 500, body: 'Sorry, something went wrong.' };
  }
};