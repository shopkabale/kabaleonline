import { auth, db } from '../firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { collection, getDocs, doc, getDoc, deleteDoc, query, orderBy, updateDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const adminContent = document.getElementById('admin-content');
const accessDenied = document.getElementById('access-denied');
const allProductsList = document.getElementById('all-products-list');

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists() && userDoc.data().role === 'admin') {
            accessDenied.style.display = 'none';
            adminContent.style.display = 'block';
            fetchAllProducts();
        } else {
            showAccessDenied();
        }
    } else {
        showAccessDenied();
    }
});

function showAccessDenied() {
    adminContent.style.display = 'none';
    accessDenied.style.display = 'block';
}

async function fetchAllProducts() {
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    allProductsList.innerHTML = '';
     if (querySnapshot.empty) {
        allProductsList.innerHTML = "<p>There are currently no products on the site.</p>";
        return;
    }
    querySnapshot.forEach((doc) => {
        const product = doc.data();
        const productId = doc.id;
        // CORRECTED: Use 'isDeal' to match main.js
        const isDeal = product.isDeal || false;

        const primaryImage = (product.imageUrls && product.imageUrls.length > 0) 
            ? product.imageUrls[0] 
            : (product.imageUrl || '');

        const productCard = document.createElement('div');
        productCard.className = 'product-card';

        productCard.innerHTML = `
            <img src="${primaryImage}" alt="${product.name}">
            <h3>${product.name}</h3>
            <p class="price">UGX ${product.price.toLocaleString()}</p>
            <p style="font-size: 0.8em; color: grey; padding: 0 15px;">Seller ID: ${product.sellerId.substring(0, 10)}...</p>
            <div class="seller-controls">
                <button class="deal-btn ${isDeal ? 'on-deal' : ''}" data-id="${productId}" data-deal-status="${isDeal}">
                    ${isDeal ? 'Remove from Deals' : 'Add to Deals'}
                </button>
                <button class="delete-btn admin-delete">Delete (Admin)</button>
            </div>
        `;

        productCard.querySelector('.deal-btn').addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            const status = e.target.dataset.dealStatus === 'true';
            toggleDealStatusAsAdmin(id, status);
        });

        productCard.querySelector('.admin-delete').addEventListener('click', () => {
            deleteProductAsAdmin(productId, product.name);
        });
        allProductsList.appendChild(productCard);
    });
}

async function toggleDealStatusAsAdmin(productId, currentStatus) {
    const newStatus = !currentStatus;
    const productRef = doc(db, 'products', productId);
    try {
        await updateDoc(productRef, {
            // CORRECTED: Use 'isDeal' to match main.js
            isDeal: newStatus
        });
        fetchAllProducts(); // Refresh the list to show the change
    } catch (error) {
        console.error("Admin deal status update error:", error);
        alert("Failed to update deal status.");
    }
}

async function deleteProductAsAdmin(productId, productName) {
    if (confirm(`ADMIN ACTION:\nAre you sure you want to delete the product "${productName}"? This cannot be undone.`)) {
        try {
            await deleteDoc(doc(db, 'products', productId));
            alert('Product successfully deleted by admin.');
            fetchAllProducts();
        } catch (error) {
            console.error("Admin delete error: ", error);
            alert("Failed to delete product.");
        }
    }
}
