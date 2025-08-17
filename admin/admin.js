import { auth, db } from '../firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { collection, getDocs, doc, getDoc, deleteDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const adminContent = document.getElementById('admin-content');
const accessDenied = document.getElementById('access-denied');
const allProductsList = document.getElementById('all-products-list');

onAuthStateChanged(auth, async (user) => {
    if (user) {
        console.log('User is logged in:', user.email); // Debugging line
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists() && userDoc.data().role === 'admin') {
            console.log('Admin access GRANTED.'); // Debugging line
            accessDenied.style.display = 'none';
            adminContent.style.display = 'block';
            fetchAllProducts();
        } else {
            console.log('Admin access DENIED. Role:', userDoc.data().role); // Debugging line
            showAccessDenied();
        }
    } else {
        console.log('No user is logged in.'); // Debugging line
        showAccessDenied();
    }
});

function showAccessDenied() { /* ... unchanged ... */ }
async function fetchAllProducts() { /* ... unchanged ... */ }
async function deleteProductAsAdmin(productId, productName) { /* ... unchanged ... */ }
