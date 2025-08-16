// sell.js

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
const showLoginBtn = document.getElementById('show-login-btn');
const showSignupBtn = document.getElementById('show-signup-btn');

const productForm = document.getElementById('product-form');
const sellerProductsList = document.getElementById('seller-products-list');
const submitBtn = document.getElementById('submit-btn');
const productIdInput = document.getElementById('productId');


// --- CORE AUTHENTICATION LOGIC ---
onAuthStateChanged(auth, user => {
    if (user) {
        // User is logged in
        authContainer.style.display = 'none';
        dashboardContainer.style.display = 'block';
        sellerEmailSpan.textContent = user.email;
        fetchSellerProducts(user.uid);
    } else {
        // User is logged out
        authContainer.style.display = 'block';
        dashboardContainer.style.display = 'none';
        sellerProductsList.innerHTML = ''; // Clear products on logout
    }
});

logoutBtn.addEventListener('click', () => {
    signOut(auth).catch(error => alert(error.message));
});


// --- AUTH FORM HANDLING (LOGIN / SIGNUP TABS) ---
showLoginBtn.addEventListener('click', () => {
    loginForm.style.display = 'block';
    signupForm.style.display = 'none';
    showLoginBtn.classList.add('active');
    showSignupBtn.classList.remove('active');
});

showSignupBtn.addEventListener('click', () => {
    loginForm.style.display = 'none';
    signupForm.style.display = 'block';
    showLoginBtn.classList.remove('active');
    showSignupBtn.classList.add('active');
});

// Handle Login Submission
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    signInWithEmailAndPassword(auth, email, password)
        .catch(error => {
            console.error("Login Error:", error.code);
            alert("Login failed: " + error.message);
        });
});

// Handle Sign Up Submission
signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    createUserWithEmailAndPassword(auth, email, password)
        .then(userCredential => {
            console.log('Created new user:', userCredential.user);
            alert('Account created successfully! You are now logged in.');
        })
        .catch(error => {
            console.error("Signup Error:", error.code);
            alert("Signup failed: " + error.message);
        });
});

// Show/Hide Password Toggle Logic
document.querySelectorAll('.toggle-password').forEach(toggle => {
    toggle.addEventListener('click', (e) => {
        const passwordInput = e.target.previousElementSibling;
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            e.target.textContent = '🙈';
        } else {
            passwordInput.type = 'password';
            e.target.textContent = '👁️';
        }
    });
});


// --- PRODUCT MANAGEMENT ---

// Handle Product Form Submission (for both Add and Edit)
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
        
        // If we are editing, check for an existing image URL
        if (editingProductId) {
           const existingCard = document.querySelector(`.product-card[data-product-id="${editingProductId}"] img`);
           if (existingCard) {
               imageUrl = existingCard.src;
           }
        }

        // If a new image file is selected, upload it and overwrite the old URL
        if (imageFile) {
            imageUrl = await uploadImageToCloudinary(imageFile);
        }

        if (!imageUrl) {
            throw new Error('An image is required for the product.');
        }

        const productData = {
            name: productName,
            price: Number(productPrice),
            description: productDescription,
            imageUrl: imageUrl,
            whatsapp: normalizeWhatsAppNumber(whatsappNumber),
            sellerId: user.uid,
            createdAt: new Date() // Always set/update the timestamp
        };
        
        if (editingProductId) {
            // Update the existing product document in Firestore
            const productRef = doc(db, 'products', editingProductId);
            await updateDoc(productRef, productData);
            alert('Product updated successfully!');
        } else {
            // Add a new product document to Firestore
            await addDoc(collection(db, 'products'), productData);
            alert('Product added successfully!');
        }
        
        productForm.reset();
        productIdInput.value = ''; // Clear editing state
        submitBtn.textContent = 'Add Product';
        document.getElementById('product-image').required = true; // Make image required again for new products
        fetchSellerProducts(user.uid); // Refresh the list of products

    } catch (error) {
        console.error('Error submitting product:', error);
        alert('Failed to submit product. ' + error.message);
    } finally {
        submitBtn.disabled = false; // Re-enable the submit button
    }
});


// Upload image to Cloudinary via our Netlify serverless function
async function uploadImageToCloudinary(file) {
    // 1. Get a secure signature from our serverless function
    const response = await fetch('/.netlify/functions/generate-signature');
    const { signature, timestamp } = await response.json();

    // 2. Prepare the form data for Cloudinary
    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', 'YOUR_CLOUDINARY_API_KEY'); // ⚠️ IMPORTANT: Replace with your actual API Key
    formData.append('timestamp', timestamp);
    formData.append('signature', signature);
    
    // 3. Upload the image directly to your Cloudinary account
    const cloudName = 'YOUR_CLOUDINARY_CLOUD_NAME'; // ⚠️ IMPORTANT: Replace with your actual Cloud Name
    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

    const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
    });

    if (!uploadResponse.ok) {
        throw new Error('Cloudinary upload failed.');
    }
    
    const uploadData = await uploadResponse.json();
    return uploadData.secure_url; // This is the public URL of the uploaded image
}

// Fetch and display products for the currently logged-in seller
async function fetchSellerProducts(uid) {
    if (!uid) return;
    const q = query(collection(db, 'products'), where('sellerId', '==', uid), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);

    sellerProductsList.innerHTML = ''; // Clear previous list
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
        
        // Add event listeners for edit and delete buttons
        productCard.querySelector('.edit-btn').addEventListener('click', () => populateFormForEdit(productId, product));
        productCard.querySelector('.delete-btn').addEventListener('click', () => deleteProduct(productId));

        sellerProductsList.appendChild(productCard);
    });
}

// Populate the main form when an "Edit" button is clicked
function populateFormForEdit(id, product) {
    productIdInput.value = id;
    document.getElementById('product-name').value = product.name;
    document.getElementById('product-price').value = product.price;
    document.getElementById('product-description').value = product.description;
    
    // Convert normalized number back to local format for display
    const localNumber = product.whatsapp.startsWith('256') ? '0' + product.whatsapp.substring(3) : product.whatsapp;
    document.getElementById('whatsapp-number').value = localNumber;
    
    submitBtn.textContent = 'Update Product';
    document.getElementById('product-image').required = false; // Image is not required when editing
    
    window.scrollTo(0, 0); // Scroll to top to see the form
}

// Delete a product from Firestore
async function deleteProduct(productId) {
    if (confirm('Are you sure you want to delete this product? This cannot be undone.')) {
        try {
            await deleteDoc(doc(db, 'products', productId));
            alert('Product deleted successfully.');
            fetchSellerProducts(auth.currentUser.uid); // Refresh the list
        } catch (error) {
            console.error('Error deleting product:', error);
            alert('Failed to delete product.');
        }
    }
}


// --- HELPER FUNCTIONS ---

// Normalize WhatsApp number to include country code (e.g., 256) for wa.me links
function normalizeWhatsAppNumber(phone) {
    let cleaned = ('' + phone).replace(/\D/g, ''); // Remove all non-digit characters
    
    // If it starts with '0', replace with '256'
    if (cleaned.startsWith('0')) {
        return '256' + cleaned.substring(1);
    }
    // If it already starts with '256', it's correct
    if (cleaned.startsWith('256')) {
        return cleaned;
    }
    // If it's a 9-digit number (e.g., 771234567), prepend '256'
    if (cleaned.length === 9) {
        return '256' + cleaned;
    }
    
    // Fallback for unknown formats
    return cleaned;
}
