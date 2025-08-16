// sell.js (Re-verified and Corrected)

// --- IMPORTS ---
import { auth, db } from '../firebase.js';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import {
    collection,
    addDoc,
    query,
    where,
    getDocs,
    doc,
    updateDoc,
    deleteDoc,
    orderBy
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";


// --- DOM ELEMENT SELECTIONS ---
const authContainer = document.getElementById('auth-container');
const dashboardContainer = document.getElementById('dashboard-container');
const sellerEmailSpan = document.getElementById('seller-email');
const logoutBtn = document.getElementById('logout-btn');

const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');

const productForm = document.getElementById('product-form');
const sellerProductsList = document.getElementById('seller-products-list');
const submitBtn = document.getElementById('submit-btn');
const productIdInput = document.getElementById('productId');

const showProductFormBtn = document.getElementById('show-product-form-btn');
const productFormContainer = document.getElementById('product-form-container');


// --- CORE AUTHENTICATION LOGIC ---
onAuthStateChanged(auth, user => {
    if (user) {
        authContainer.style.display = 'none';
        dashboardContainer.style.display = 'block';
        sellerEmailSpan.textContent = user.email;
        fetchSellerProducts(user.uid);
    } else {
        authContainer.style.display = 'block';
        dashboardContainer.style.display = 'none';
        sellerProductsList.innerHTML = '';
    }
});

logoutBtn.addEventListener('click', () => {
    signOut(auth).catch(error => alert(error.message));
});


// --- ACCORDION UI LOGIC ---
const accordionButtons = document.querySelectorAll('.accordion-button');
accordionButtons.forEach(button => {
    button.addEventListener('click', () => {
        accordionButtons.forEach(otherButton => {
            if (otherButton !== button) {
                otherButton.classList.remove('active');
                otherButton.nextElementSibling.style.maxHeight = null;
            }
        });
        button.classList.toggle('active');
        const panel = button.nextElementSibling;
        if (panel.style.maxHeight) {
            panel.style.maxHeight = null;
        } else {
            panel.style.maxHeight = panel.scrollHeight + "px";
        }
    });
});


// --- FORM SUBMISSION HANDLING ---
// This section has been checked to ensure it works correctly.
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    signInWithEmailAndPassword(auth, email, password)
        .catch(error => {
            alert("Login failed: " + error.message);
        });
});

signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    createUserWithEmailAndPassword(auth, email, password)
        .then(userCredential => {
            alert('Account created successfully!');
            // onAuthStateChanged will now automatically show the dashboard.
        })
        .catch(error => {
            alert("Signup failed: " + error.message);
        });
});


// --- PASSWORD TOGGLE LOGIC ---
document.querySelectorAll('.toggle-password').forEach(toggle => {
    toggle.addEventListener('click', (e) => {
        const passwordInput = e.target.closest('.password-wrapper').querySelector('input');
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            e.target.textContent = '🙈';
        } else {
            passwordInput.type = 'password';
            e.target.textContent = '👁️';
        }
    });
});


// --- DASHBOARD "SELL AN ITEM" BUTTON LOGIC ---
showProductFormBtn.addEventListener('click', () => {
    const isVisible = productFormContainer.style.display === 'block';
    if (isVisible) {
        productFormContainer.style.display = 'none';
        showProductFormBtn.textContent = 'Sell an Item';
    } else {
        productFormContainer.style.display = 'block';
        showProductFormBtn.textContent = 'Close Form';
        // When opening the form, ensure it's ready for a new product
        productForm.reset();
        productIdInput.value = '';
        submitBtn.textContent = 'Add Product';
    }
});


// --- PRODUCT MANAGEMENT ---
productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return alert('You must be logged in!');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
    const productName = document.getElementById('product-name').value;
    const productPrice = document.getElementById('product-price').value;
    const productDescription = document.getElementById('product-description').value;
    const whatsappNumber = document.getElementById('whatsapp-number').value;
    const imageFile = document.getElementById('product-image').files[0];
    const editingProductId = productIdInput.value;
    try {
        let imageUrl = '';
        if (editingProductId) {
           const existingCard = document.querySelector(`.product-card[data-product-id="${editingProductId}"] img`);
           if (existingCard) imageUrl = existingCard.src;
        }
        if (imageFile) {
            imageUrl = await uploadImageToCloudinary(imageFile);
        }
        if (!imageUrl) throw new Error('An image is required for the product.');
        const productData = {
            name: productName, price: Number(productPrice), description: productDescription, imageUrl: imageUrl, whatsapp: normalizeWhatsAppNumber(whatsappNumber), sellerId: user.uid, createdAt: new Date()
        };
        if (editingProductId) {
            const productRef = doc(db, 'products', editingProductId);
            await updateDoc(productRef, productData);
            alert('Product updated successfully!');
        } else {
            await addDoc(collection(db, 'products'), productData);
            alert('Product added successfully!');
        }
        productForm.reset();
        productIdInput.value = '';
        submitBtn.textContent = 'Add Product';
        document.getElementById('product-image').required = true;
        productFormContainer.style.display = 'none';
        showProductFormBtn.textContent = 'Sell another Item';
        fetchSellerProducts(user.uid);
    } catch (error) {
        console.error('Error submitting product:', error);
        alert('Failed to submit product. ' + error.message);
    } finally {
        submitBtn.disabled = false;
    }
});
async function uploadImageToCloudinary(file) {
    const response = await fetch('/.netlify/functions/generate-signature');
    const { signature, timestamp } = await response.json();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', 'YOUR_CLOUDINARY_API_KEY');
    formData.append('timestamp', timestamp);
    formData.append('signature', signature);
    const cloudName = 'YOUR_CLOUDINARY_CLOUD_NAME';
    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
    const uploadResponse = await fetch(uploadUrl, { method: 'POST', body: formData });
    if (!uploadResponse.ok) throw new Error('Cloudinary upload failed.');
    const uploadData = await uploadResponse.json();
    return uploadData.secure_url;
}
async function fetchSellerProducts(uid) {
    if (!uid) return;
    const q = query(collection(db, 'products'), where('sellerId', '==', uid), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    sellerProductsList.innerHTML = '';
    querySnapshot.forEach((doc) => {
        const product = doc.data();
        const productId = doc.id;
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.setAttribute('data-product-id', productId);
        productCard.innerHTML = `
            <img src="${product.imageUrl}" alt="${product.name}">
            <h3>${product.name}</h3>
            <p>UGX ${product.price.toLocaleString()}</p>
            <div class="seller-controls">
                <button class="edit-btn">Edit</button>
                <button class="delete-btn">Delete</button>
            </div>
        `;
        productCard.querySelector('.edit-btn').addEventListener('click', () => {
            productFormContainer.style.display = 'block';
            showProductFormBtn.textContent = 'Close Form';
            populateFormForEdit(productId, product)
        });
        productCard.querySelector('.delete-btn').addEventListener('click', () => deleteProduct(productId));
        sellerProductsList.appendChild(productCard);
    });
}
function populateFormForEdit(id, product) {
    productIdInput.value = id;
    document.getElementById('product-name').value = product.name;
    document.getElementById('product-price').value = product.price;
    document.getElementById('product-description').value = product.description;
    const localNumber = product.whatsapp.startsWith('256') ? '0' + product.whatsapp.substring(3) : product.whatsapp;
    document.getElementById('whatsapp-number').value = localNumber;
    submitBtn.textContent = 'Update Product';
    document.getElementById('product-image').required = false;
    window.scrollTo(0, 0);
}
async function deleteProduct(productId) {
    if (confirm('Are you sure you want to delete this product? This cannot be undone.')) {
        try {
            await deleteDoc(doc(db, 'products', productId));
            alert('Product deleted successfully.');
            fetchSellerProducts(auth.currentUser.uid);
        } catch (error) {
            console.error('Error deleting product:', error);
            alert('Failed to delete product.');
        }
    }
}
function normalizeWhatsAppNumber(phone) {
    let cleaned = ('' + phone).replace(/\D/g, '');
    if (cleaned.startsWith('0')) return '256' + cleaned.substring(1);
    if (cleaned.startsWith('256')) return cleaned;
    if (cleaned.length === 9) return '256' + cleaned;
    return cleaned;
}
