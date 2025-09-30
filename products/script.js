import { auth, db } from '/js/auth.js';
import { collection, query, where, getDocs, orderBy, doc, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { showMessage, getCloudinaryTransformedUrl } from '/js/shared.js';

const sellerProductsList = document.getElementById('seller-products-list');
const dashboardMessage = document.getElementById('dashboard-message');

async function fetchSellerProducts(uid) {
    if (!uid) return;
    const q = query(collection(db, 'products'), where('sellerId', '==', uid), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    sellerProductsList.innerHTML = '';

    if (querySnapshot.empty) {
        sellerProductsList.innerHTML = "<p>You haven't added any products yet. <a href='/upload/'>Click here to get started!</a></p>";
        return;
    }

    querySnapshot.forEach((doc) => {
        const product = doc.data();
        const productId = doc.id;
        const thumbnailUrl = getCloudinaryTransformedUrl(product.imageUrls?.[0], 'thumbnail');
        const isSold = product.isSold || false;

        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.innerHTML = `
            <img src="${thumbnailUrl}" alt="${product.name}" class="${isSold ? 'sold-item' : ''}" loading="lazy">
            <h3>${product.name} ${isSold ? '<span class="sold-tag-dashboard">(Sold)</span>' : ''}</h3>
            <p class="price">UGX ${product.price.toLocaleString()}</p>
            <div class="seller-controls">
                <button class="edit-btn" data-id="${productId}">Edit</button>
                <button class="delete-btn" data-id="${productId}">Delete</button>
                <button class="toggle-sold-btn" data-id="${productId}" data-sold="${isSold}">${isSold ? 'Mark as Available' : 'Mark as Sold'}</button>
            </div>
        `;
        sellerProductsList.appendChild(productCard);
    });
}

sellerProductsList.addEventListener('click', async (e) => {
    const target = e.target;
    const productId = target.dataset.id;
    if (!productId) return;

    if (target.classList.contains('edit-btn')) {
        window.location.href = `/upload/?editId=${productId}`;
    }

    // --- UPDATED DELETE LOGIC ---
    if (target.classList.contains('delete-btn')) {
        if (confirm('Are you sure you want to delete this product permanently? This cannot be undone.')) {
            try {
                // Step 1: Delete from Firestore
                await deleteDoc(doc(db, 'products', productId));

                // Step 2: Tell the search index to delete its copy
                await fetch('/.netlify/functions/syncToAlgolia', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json', // This header is important
                    },
                    body: JSON.stringify({
                        action: 'delete',
                        objectID: productId
                    }),
                });

                // Step 3: Update the UI
                showMessage(dashboardMessage, 'Product deleted successfully from all systems.', false);
                fetchSellerProducts(auth.currentUser.uid);

            } catch (error) {
                console.error("Error during product deletion:", error);
                showMessage(dashboardMessage, 'Failed to delete product. Please try again.');
            }
        }
    }
    // --- END OF UPDATED LOGIC ---

    if (target.classList.contains('toggle-sold-btn')) {
        const currentStatus = target.dataset.sold === 'true';
        const newStatus = !currentStatus;
        try {
            await updateDoc(doc(db, 'products', productId), { isSold: newStatus });
            showMessage(dashboardMessage, `Listing marked as ${newStatus ? 'Sold' : 'Available'}.`, false);
            fetchSellerProducts(auth.currentUser.uid);
        } catch (error) {
            showMessage(dashboardMessage, 'Failed to update status.');
        }
    }
});

auth.onAuthStateChanged((user) => {
    if (user) {
        fetchSellerProducts(user.uid);
    }
});