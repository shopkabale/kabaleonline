// PASTE YOUR FIREBASE CONFIG OBJECT FROM STEP 1.6 HERE
const firebaseConfig = {
    apiKey: "AIza...",
    authDomain: "your-project-id.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "...",
    appId: "..."
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const productGrid = document.getElementById('product-grid');

// Listen for real-time updates from the "products" collection
db.collection("products").orderBy("createdAt", "desc").onSnapshot((snapshot) => {
    productGrid.innerHTML = ''; // Clear the grid before adding new items
    if (snapshot.empty) {
        productGrid.innerHTML = '<p>No products available right now. Be the first to sell something!</p>';
        return;
    }
    snapshot.forEach(doc => {
        const product = doc.data();
        
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <img src="${product.imageUrl}" alt="${product.name}">
            <div class="card-content">
                <h3>${product.name}</h3>
                <p class="price">UGX ${Number(product.price).toLocaleString()}</p>
                <p>${product.description}</p>
            </div>
            <a href="https://wa.me/${product.whatsapp}?text=Hi, I saw your product '${encodeURIComponent(product.name)}' on Kabale Online and I am interested." target="_blank" class="whatsapp-btn">
                Order on WhatsApp
            </a>
        `;
        productGrid.appendChild(card);
    });
}, (error) => {
    console.error("Error fetching products: ", error);
    productGrid.innerHTML = "<p>Could not load products. Please check your internet connection or try again later.</p>";
});
