import { auth, db } from '../firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { collection, getDocs, doc, getDoc, deleteDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const adminContent = document.getElementById('admin-content');
const accessDenied = document.getElementById('access-denied');
const allProductsList = document.getElementById('all-products-list');

// Check user's login and admin status
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // User is logged in, now check if they are an admin
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists() && userDoc.data().role === 'admin') {
            // User is an admin! Show the content.
            accessDenied.style.display = 'none';
            adminContent.style.display = 'block';
            fetchAllProducts();
        } else {
            // User is not an admin
            showAccessDenied();
        }
    } else {
        // User is not logged in
        showAccessDenied();
    }
});

function showAccessDenied() {
    adminContent.style.display = 'none';
    accessDenied.style.display = 'block';
}

// Fetch ALL products from the database
async function fetchAllProducts() {
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    allProductsList.innerHTML = '';
    querySnapshot.forEach((doc) => {
        const product = doc.data();
        const productId = doc.id;

        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.innerHTML = `
            <img src="${product.imageUrl}" alt="${product.name}">
            <h3>${product.name}</h3>
            <p>UGX ${product.price.toLocaleString()}</p>
            <p style="font-size: 0.8em; color: grey;">Seller ID: ${product.sellerId}</p>
            <div class="seller-controls">
                <button class="delete-btn admin-delete">Delete (Admin)</button>
            </div>
        `;

        productCard.querySelector('.admin-delete').addEventListener('click', () => {
            deleteProductAsAdmin(productId, product.name);
        });

        allProductsList.appendChild(productCard);
    });
}

// Admin function to delete any product
async function deleteProductAsAdmin(productId, productName) {
    if (confirm(`ADMIN ACTION:\nAre you sure you want to delete the product "${productName}"? This cannot be undone.`)) {
        try {
            await deleteDoc(doc(db, 'products', productId));
            alert('Product successfully deleted by admin.');
            fetchAllProducts(); // Refresh the list
        } catch (error) {
            console.error("Admin delete error: ", error);
            alert("Failed to delete product.");
        }
    }
}
