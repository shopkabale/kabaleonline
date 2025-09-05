import { auth, db } from '../firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { collection, getDocs, doc, getDoc, deleteDoc, query, orderBy, updateDoc, where, writeBatch } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const adminContent = document.getElementById('admin-content');
const accessDenied = document.getElementById('access-denied');
const allProductsList = document.getElementById('all-products-list');
const userList = document.getElementById('user-list');

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists() && userDoc.data().role === 'admin') {
            accessDenied.style.display = 'none';
            adminContent.style.display = 'block';
            fetchAllProducts();
            fetchAllUsers();
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

async function fetchAllUsers() {
    userList.innerHTML = '<p>Loading users...</p>';
    const usersCollection = query(collection(db, 'users'), orderBy('email'));
    const userSnapshot = await getDocs(usersCollection);
    
    userList.innerHTML = ''; 
    if(userSnapshot.empty) {
        userList.innerHTML = '<li>No users found.</li>';
        return;
    }

    userSnapshot.forEach(doc => {
        const userData = doc.data();
        const userId = doc.id;

        if (userData.role === 'admin') return;

        const isVerified = userData.isVerified || false;
        const referralCount = userData.referralCount || 0;

        const listItem = document.createElement('li');
        listItem.className = 'user-list-item';
        listItem.innerHTML = `
            <span class="user-info">
                ${userData.email} ${isVerified ? '<span class="verified-badge">✔️ Verified</span>' : ''}
                <br>
                <span class="referral-info">Referrals: ${referralCount}</span>
            </span>
            <button class="verify-btn ${isVerified ? 'verified' : 'not-verified'}" data-uid="${userId}" data-status="${isVerified}">
                ${isVerified ? 'Un-verify' : 'Verify'}
            </button>
        `;
        
        listItem.querySelector('.verify-btn').addEventListener('click', (e) => {
            e.target.disabled = true;
            e.target.textContent = 'Updating...';
            const uid = e.target.dataset.uid;
            const status = e.target.dataset.status === 'true';
            toggleUserVerification(uid, !status);
        });

        userList.appendChild(listItem);
    });
}

async function toggleUserVerification(uid, newStatus) {
    const userRef = doc(db, 'users', uid);
    try {
        await updateDoc(userRef, { isVerified: newStatus });
        
        const productsRef = collection(db, 'products');
        const q = query(productsRef, where("sellerId", "==", uid));
        const productSnapshot = await getDocs(q);

        if (!productSnapshot.empty) {
            const batch = writeBatch(db);
            productSnapshot.forEach((productDoc) => {
                const docRef = doc(db, 'products', productDoc.id);
                batch.update(docRef, { sellerIsVerified: newStatus });
            });
            await batch.commit();
        }

        alert(`User has been ${newStatus ? 'verified' : 'un-verified'}. All their products have been updated.`);
        await fetchAllUsers(); 
        await fetchAllProducts();
    } catch (error) {
        console.error("Error updating verification status: ", error);
        alert("Failed to update user verification.");
    }
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
        const isDeal = product.isDeal || false;

        const primaryImage = (product.imageUrls && product.imageUrls.length > 0) 
            ? product.imageUrls[0] 
            : (product.imageUrl || '');
            
        const verifiedBadge = product.sellerIsVerified ? '<span class="verified-badge">✔️</span>' : '';

        const productCard = document.createElement('div');
        productCard.className = 'product-card';

        productCard.innerHTML = `
            <img src="${primaryImage}" alt="${product.name}">
            <h3>${product.name}</h3>
            <p class="price">UGX ${product.price.toLocaleString()}</p>
            <p style="font-size: 0.8em; color: grey; padding: 0 15px;">Seller: ${product.sellerEmail || product.sellerId.substring(0, 10) + '...'} ${verifiedBadge}</p>
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
            isDeal: newStatus
        });
        fetchAllProducts();
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
