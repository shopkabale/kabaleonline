import { db } from '../../firebase.js'; // adjust path if needed

export async function handler(event, context) {
  try {
    // Query Firestore for all products
    const snapshot = await db.collection('products').get();

    const urls = [];
    urls.push(`
      <url>
        <loc>https://www.kabaleonline.com/</loc>
        <priority>1.0</priority>
      </url>
      <url>
        <loc>https://www.kabaleonline.com/about</loc>
        <priority>0.8</priority>
      </url>
      <url>
        <loc>https://www.kabaleonline.com/sell</loc>
        <priority>0.8</priority>
      </url>
    `);

    snapshot.forEach(doc => {
      const productId = doc.id;
      urls.push(`
        <url>
          <loc>https://www.kabaleonline.com/product.html?id=${productId}</loc>
          <priority>0.7</priority>
        </url>
      `);
    });

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        ${urls.join("\n")}
      </urlset>
    `;

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/xml"
      },
      body: sitemap
    };
  } catch (error) {
    console.error("Error generating sitemap:", error);
    return { statusCode: 500, body: "Error generating sitemap" };
  }
}
