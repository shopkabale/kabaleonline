// The final, corrected get-products.js for Netlify CMS
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

exports.handler = async () => {
  try {
    // --- THIS IS THE CORRECTED PATH LOGIC ---
    // It navigates from the function's current file location up to the project root
    // to reliably find the _products folder.
    const postsDirectory = path.join(__dirname, '..', '..', '_products');
    
    const filenames = fs.readdirSync(postsDirectory);

    const products = filenames
      .filter(filename => filename.endsWith('.md')) // Ensure we only read markdown files
      .map(filename => {
        const filePath = path.join(postsDirectory, filename);
        const fileContents = fs.readFileSync(filePath, 'utf8');
        
        const { data } = matter(fileContents);
        data.id = filename.replace(/\.md$/, '');

        return data;
      });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(products),
    };

  } catch (error) {
    // Provide a more detailed error log for debugging, just in case
    console.error('Critical error in get-products function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to load products.', details: error.message })
    };
  }
};
