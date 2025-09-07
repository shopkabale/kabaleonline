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
    try {
        const usersQuery = query(collection(db, 'users'), orderBy('email'));
        const userSnapshot = await getDocs(usersQuery);

        if (userSnapshot.empty) {
            userList.innerHTML = '<li>No users found.</li>';
            return;
        }

        const referralCounts = {};
        userSnapshot.forEach(doc => {
            const userData = doc.data();
            if (userData.referrerId) {
                if (referralCounts[userData.referrerId]) {
                    referralCounts[userData.referrerId]++;
                } else {
                    referralCounts[userData.referrerId] = 1;
                }
            }
        });

        userList.innerHTML = '';
        userSnapshot.forEach(doc => {
            const userData = doc.data();
            const userId = doc.id;
            if (userData.role === 'admin') return;

            const isVerified = userData.isVerified || false;
            const referralCount = referralCounts[userId] || 0;

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
                const uid = e.target.dataset.uid;
                const status = e.target.dataset.status === 'true';
                toggleUserVerification(uid, !status);
            });
            userList.appendChild(listItem);
        });
    } catch (error) {
        console.error("Error fetching users:", error);
        userList.innerHTML = '<li>Could not load users.</li>';
    }
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
                batch.update(doc(db, 'products', productDoc.id), { sellerIsVerified: newStatus });
            });
            await batch.commit();
        }
        alert(`User has been ${newStatus ? 'verified' : 'un-verified'}.`);
        await fetchAllUsers(); 
        await fetchAllProducts();
    } catch (error) {
        alert("Failed to update user verification.");
    }
}

// THIS IS THE CORRECTED FUNCTION
async function fetchAllProducts() {
    allProductsList.innerHTML = ''; // Clear previous listings
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
        allProductsList.innerHTML = "<p>No products found on the site.</p>";
        return;
    }

    querySnapshot.forEach((doc) => {
        const product = doc.data();
        const productId = doc.id;
        const isDeal = product.isDeal || false;
        
        const primaryImage = (product.imageUrls && product.imageUrls.length > 0) 
            ? product.imageUrls[0] 
            : 'placeholder.webp';

        const verifiedBadge = product.sellerIsVerified ? '<span title="Verified Seller">✔️</span>' : '';
        const sellerName = product.sellerName || product.sellerEmail;

        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        
        // THIS IS THE CORRECT HTML THAT WAS MISSING
        productCard.innerHTML = `
            <img src="${primaryImage}" alt="${product.name}">
            <h3>${product.name}</h3>
            <p class="price">UGX ${product.price.toLocaleString()}</p>
            <p style="font-size: 0.8em; color: grey; padding: 0 15px;">
                Seller: ${sellerName} ${verifiedBadge}
            </p>
            <div class="seller-controls">
                <button class="deal-btn ${isDeal ? 'on-deal' : ''}" data-id="${productId}">
                    ${isDeal ? 'Remove from Deals' : 'Add to Deals'}
                </button>
                <button class="delete-btn admin-delete" data-id="${productId}" data-name="${product.name}">Delete (Admin)</button>
            </div>
        `;

        productCard.querySelector('.deal-btn').addEventListener('click', (e) => {
            toggleDealStatusAsAdmin(e.target.dataset.id, isDeal);
        });

        productCard.querySelector('.admin-delete').addEventListener('click', (e) => {
            deleteProductAsAdmin(e.target.dataset.id, e.target.dataset.name);
        });
        
        allProductsList.appendChild(productCard);
    });
}

async function toggleDealStatusAsAdmin(productId, currentStatus) {
    const productRef = doc(db, 'products', productId);
    try {
        await updateDoc(productRef, { isDeal: !currentStatus });
        fetchAllProducts(); // Refresh the list
    } catch (error) {
        alert("Failed to update deal status.");
    }
}

async function deleteProductAsAdmin(productId, productName) {
    if (confirm(`ADMIN: Are you sure you want to delete "${productName}"? This cannot be undone.`)) {
        try {
            await deleteDoc(doc(db, 'products', productId));
            alert('Product deleted by admin.');
            fetchAllProducts(); // Refresh the list
        } catch (error) {
            alert("Failed to delete product.");
        }
    }
}
