// FINAL version of get-products.js for Google Sheets
exports.handler = async (event) => {
  const { GOOGLE_SHEET_ID, GOOGLE_SHEETS_API_KEY } = process.env;
  const { 
    pageSize, page, searchTerm, category, 
    sale, featured, sponsored, verified
  } = event.queryStringParameters;

  const sheetName = 'KabaleOnline Products';
  const range = 'A1:Z';
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEET_ID}/values/${sheetName}!${range}?key=${GOOGLE_SHEETS_API_KEY}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Google Sheets API error!`);
    
    const data = await response.json();
    const rows = data.values;

    if (!rows || rows.length < 2) {
      return { statusCode: 200, body: JSON.stringify({ results: [] }) };
    }

    const headers = rows[0];
    const productsData = rows.slice(1);

    let allProducts = productsData
      .filter(row => row[0] && row[0].trim() !== '') // Filter out empty rows
      .map(row => {
        const product = {};
        headers.forEach((header, index) => {
          product[header] = row[index] || null;
        });
        return product;
      });

    // --- NEW: FILTERING LOGIC ---
    // We filter the results AFTER getting them from the sheet
    if (searchTerm) {
      allProducts = allProducts.filter(p => p.Name && p.Name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    if (category && category !== 'All') {
      allProducts = allProducts.filter(p => p.Category === category);
    }
    if (sale === 'true') {
      allProducts = allProducts.filter(p => p.IsOnSale === 'TRUE');
    }
    if (featured === 'true') {
      allProducts = allProducts.filter(p => p.IsFeatured === 'TRUE');
    }
    if (sponsored === 'true') {
      allProducts = allProducts.filter(p => p.IsSponsored === 'TRUE');
    }
    if (verified === 'true') {
      allProducts = allProducts.filter(p => p.IsVerified === 'TRUE');
    }

    // --- NEW: PAGINATION LOGIC ---
    const pageNumber = parseInt(page, 10) || 1;
    const size = parseInt(pageSize, 10) || 12;
    const startIndex = (pageNumber - 1) * size;
    const endIndex = startIndex + size;
    const paginatedProducts = allProducts.slice(startIndex, endIndex);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        page: pageNumber,
        results: paginatedProducts,
        has_next_page: endIndex < allProducts.length
      }),
    };

  } catch (error) {
    console.error('Function Error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'An error occurred.' }) };
  }
};
