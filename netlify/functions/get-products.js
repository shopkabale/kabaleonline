// The final get-products.js for Netlify CMS
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

exports.handler = async () => {
  try {
    // This tells the function to look for the '_products' folder
    const postsDirectory = path.join(process.cwd(), '_products');
    const filenames = fs.readdirSync(postsDirectory);

    // Go through each product file, read its content, and get the data
    const products = filenames.map(filename => {
      const filePath = path.join(postsDirectory, filename);
      const fileContents = fs.readFileSync(filePath, 'utf8');
      
      // Use gray-matter to parse the file's data
      const { data } = matter(fileContents);
      
      // We'll manually create an 'id' from the filename for our links
      data.id = filename.replace(/\.md$/, '');

      return data;
    });

    // We no longer need to do filtering here, as the frontend will handle it.
    // We just send all the products.
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
