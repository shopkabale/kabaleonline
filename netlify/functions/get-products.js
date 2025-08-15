// The final get-products.js for Netlify CMS
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

exports.handler = async () => {
  try {
    const postsDirectory = path.join(process.cwd(), '_products');
    const filenames = fs.readdirSync(postsDirectory);

    const products = filenames.map(filename => {
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
    console.error('Error reading products:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to load products.' })
    };
  }
};
