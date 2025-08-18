import { auth, db } from '../firebase.js';
import { GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { collection, addDoc, query, where, getDocs, doc, updateDoc, deleteDoc, orderBy, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const authContainer = document.getElementById('auth-container');
const dashboardContainer = document.getElementById('dashboard-container');
const sellerEmailSpan = document.getElementById('seller-email');
const logoutBtn = document.getElementById('logout-btn');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const googleLoginBtn = document.getElementById('google-login-btn');
const productForm = document.getElementById('product-form');
const sellerProductsList = document.getElementById('seller-products-list');
const submitBtn = document.getElementById('submit-btn');
const productIdInput = document.getElementById('productId');
const showProductFormBtn = document.getElementById('show-product-form-btn');
const productFormContainer = document.getElementById('product-form-container');

onAuthStateChanged(auth, user => { /* ... same as before ... */ });
logoutBtn.addEventListener('click', () => { /* ... same as before ... */ });
googleLoginBtn.addEventListener('click', () => { /* ... same as before ... */ });
const accordionButtons = document.querySelectorAll('.accordion-button');
accordionButtons.forEach(button => { /* ... same as before ... */ });
loginForm.addEventListener('submit', (e) => { /* ... same as before ... */ });
signupForm.addEventListener('submit', (e) => { /* ... same as before ... */ });
document.querySelectorAll('.toggle-password').forEach(toggle => { /* ... same as before ... */ });
showProductFormBtn.addEventListener('click', () => { /* ... same as before ... */ });

productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return alert('You must be logged in!');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
    try {
        const productName = document.getElementById('product-name').value;
        const productPrice = document.getElementById('product-price').value;
        const productDescription = document.getElementById('product-description').value;
        const whatsappNumber = document.getElementById('whatsapp-number').value;
        const imageFile1 = document.getElementById('product-image-1').files[0];
        const imageFile2 = document.getElementById('product-image-2').files[0];
        const editingProductId = productIdInput.value;
        let finalImageUrls = [];

        if (editingProductId) {
            const productRef = doc(db, 'products', editingProductId);
            const docSnap = await getDoc(productRef);
            if (docSnap.exists()) {
                finalImageUrls = docSnap.data().imageUrls || [];
            }
        }

        const filesToUpload = [];
        if (imageFile1) filesToUpload.push(imageFile1);
        if (imageFile2) filesToUpload.push(imageFile2);

        if (filesToUpload.length > 0) {
            const uploadPromises = filesToUpload.map(file => uploadImageToCloudinary(file));
            const newImageUrls = await Promise.all(uploadPromises);
            finalImageUrls = newImageUrls;
        }

        if (finalImageUrls.length === 0) {
            throw new Error('At least one image is required.');
        }

        const productData = {
            name: productName,
            name_lowercase: productName.toLowerCase(),
            price: Number(productPrice),
            description: productDescription,
            imageUrls: finalImageUrls,
            whatsapp: normalizeWhatsAppNumber(whatsappNumber),
            sellerId: user.uid,
            createdAt: new Date()
        };
        
        if (editingProductId) {
            await updateDoc(doc(db, 'products', editingProductId), productData);
            alert('Product updated successfully!');
        } else {
            await addDoc(collection(db, 'products'), productData);
            alert('Product added successfully!');
        }
        
        productForm.reset();
        productIdInput.value = '';
        productFormContainer.style.display = 'none';
        showProductFormBtn.textContent = 'Sell another Item';
        fetchSellerProducts(user.uid);

    } catch (error) {
        console.error('Error submitting product:', error);
        alert('Failed to submit product. ' + error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Add Product';
    }
});

async function fetchSellerProducts(uid) {
    if (!uid) return;
    const q = query(collection(db, 'products'), where('sellerId', '==', uid), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    sellerProductsList.innerHTML = '';
    if (querySnapshot.empty) {
        sellerProductsList.innerHTML = "<p>You haven't added any products yet.</p>";
    }
    querySnapshot.forEach((doc) => {
        const product = doc.data();
        const productId = doc.id;
        const primaryImage = product.imageUrls && product.imageUrls.length > 0 ? product.imageUrls[0] : '';
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.setAttribute('data-product-id', productId);
        productCard.innerHTML = `<img src="${primaryImage}" alt="${product.name}"><h3>${product.name}</h3><p class="price">UGX ${product.price.toLocaleString()}</p><div class="seller-controls"><button class="edit-btn">Edit</button><button class="delete-btn">Delete</button></div>`;
        productCard.querySelector('.edit-btn').addEventListener('click', () => { /* ... same as before ... */ });
        productCard.querySelector('.delete-btn').addEventListener('click', () => deleteProduct(productId));
        sellerProductsList.appendChild(productCard);
    });
}
// ... (All other functions like uploadImage, populateForm, deleteProduct, etc., remain the same)
