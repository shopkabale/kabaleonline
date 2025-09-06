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

async function fetchAllProducts() {
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    allProductsList.innerHTML = '';
     if (querySnapshot.empty) {
        allProductsList.innerHTML = "<p>No products found.</p>";
        return;
    }
    querySnapshot.forEach((doc) => {
        const product = doc.data();
        const productId = doc.id;
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.innerHTML = ``;
        allProductsList.appendChild(productCard);
    });
}

async function toggleDealStatusAsAdmin(productId, currentStatus) {
    const productRef = doc(db, 'products', productId);
    try {
        await updateDoc(productRef, { isDeal: !currentStatus });
        fetchAllProducts();
    } catch (error) {
        alert("Failed to update deal status.");
    }
}

async function deleteProductAsAdmin(productId, productName) {
    if (confirm(`ADMIN: Delete "${productName}"? This cannot be undone.`)) {
        try {
            await deleteDoc(doc(db, 'products', productId));
            alert('Product deleted by admin.');
            fetchAllProducts();
        } catch (error) {
            alert("Failed to delete product.");
        }
    }
}
