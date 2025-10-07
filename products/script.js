import { auth, db } from '../js/auth.js'; // Corrected Path
import { collection, query, where, getDocs, orderBy, doc, deleteDoc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { showMessage, getCloudinaryTransformedUrl } from '../js/shared.js'; // Corrected Path

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
        const quantity = product.quantity || 1;

        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.innerHTML = `
            <img src="${thumbnailUrl}" alt="${product.name}" class="${isSold ? 'sold-item' : ''}" loading="lazy">
            <h3>${product.name} ${isSold ? '<span class="sold-tag-dashboard">(Sold)</span>' : ''}</h3>
            <p class="price">UGX ${product.price.toLocaleString()}</p>
            <p class="quantity-display">In Stock: <strong>${quantity}</strong></p>
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

    if (target.classList.contains('delete-btn')) {
        if (confirm('Are you sure you want to delete this product permanently? This cannot be undone.')) {
            try {
                const productDocRef = doc(db, 'products', productId);
                const productSnapshot = await getDoc(productDocRef);
                const productData = productSnapshot.data();

                if (productData.imageUrls?.length) {
                    for (const imageUrl of productData.imageUrls) {
                        const urlParts = imageUrl.split('/');
                        const lastParts = urlParts.slice(urlParts.indexOf('upload') + 1);
                        const publicIdWithExtension = lastParts.join('/');
                        const publicId = publicIdWithExtension.replace(/\.[^/.]+$/, "");

                        await fetch('/.netlify/functions/deleteCloudinaryImage', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ public_id: publicId })
                        });
                    }
                }

                await deleteDoc(productDocRef);

                await fetch('/.netlify/functions/syncToAlgolia', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'delete', objectID: productId })
                });

                target.closest('.product-card').remove();
                showMessage(dashboardMessage, 'Product and images deleted successfully.', false);

            } catch (error) {
                console.error("Deletion error:", error);
                showMessage(dashboardMessage, 'Failed to delete product. Please try again.');
            }
        }
    }

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
    } else {
        window.location.href = '/login/';
    }
});