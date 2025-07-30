// PASTE YOUR SUPABASE URL AND ANON KEY FROM STEP 1.3 HERE
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const productGrid = document.getElementById('product-grid');

// Function to fetch and display products
async function fetchProducts() {
    const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching products:', error);
        productGrid.innerHTML = '<p>Could not load products. Please try again later.</p>';
        return;
    }

    productGrid.innerHTML = ''; // Clear the grid
    if (products.length === 0) {
        productGrid.innerHTML = '<p>No products available right now. Be the first to sell!</p>';
        return;
    }

    products.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <img src="${product.imageUrl}" alt="${product.name}">
            <div class="card-content">
                <h3>${product.name}</h3>
                <p class="price">UGX ${Number(product.price).toLocaleString()}</p>
                <p>${product.description}</p>
            </div>
            <a href="https://wa.me/${product.whatsapp}?text=Hi, I saw your product '${encodeURIComponent(product.name)}' on Kabale Online." target="_blank" class="whatsapp-btn">
                Order on WhatsApp
            </a>
        `;
        productGrid.appendChild(card);
    });
}

// Listen for real-time changes to the products table
supabase.channel('public:products')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, payload => {
    console.log('Change received!', payload);
    fetchProducts(); // Re-fetch products when a change occurs
  })
  .subscribe();

// Initial fetch of products when the page loads
fetchProducts();
