// sell/sell.js
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
    deleteDoc
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";


// DOM Elements
const authContainer = document.getElementById('auth-container');
const dashboardContainer = document.getElementById('dashboard-container');
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-btn');
const productForm = document.getElementById('product-form');
const sellerEmailSpan = document.getElementById('seller-email');
const sellerProductsList = document.getElementById('seller-products-list');
const submitBtn = document.getElementById('submit-btn');
const productIdInput = document.getElementById('productId');


// --- AUTHENTICATION ---
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

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // Try to sign in first
    signInWithEmailAndPassword(auth, email, password)
        .catch(error => {
            // If sign in fails, assume it's a new user and create an account
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                createUserWithEmailAndPassword(auth, email, password)
                    .then(userCredential => console.log('Created new user:', userCredential.user))
                    .catch(err => alert(err.message));
            } else {
                alert(error.message);
            }
        });
});

logoutBtn.addEventListener('click', () => {
    signOut(auth).catch(error => alert(error.message));
});

// --- PRODUCT MANAGEMENT ---

// Handle Product Form Submission (Add or Edit)
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
        let imageUrl = document.querySelector(`[data-product-id="${editingProductId}"] img`)?.src || '';
        
        // Only upload a new image if one is selected
        if (imageFile) {
            imageUrl = await uploadImageToCloudinary(imageFile);
        }

        if (!imageUrl) {
            throw new Error('Image is required and failed to upload.');
        }

        const productData = {
            name: productName,
            price: Number(productPrice),
            description: productDescription,
            imageUrl: imageUrl,
            whatsapp: normalizeWhatsAppNumber(whatsappNumber),
            sellerId: user.uid,
            createdAt: new Date()
        };
        
        if (editingProductId) {
            // Update existing product
            const productRef = doc(db, 'products', editingProductId);
            await updateDoc(productRef, productData);
            alert('Product updated successfully!');
        } else {
            // Add new product
            await addDoc(collection(db, 'products'), productData);
            alert('Product added successfully!');
        }
        
        productForm.reset();
        productIdInput.value = ''; // Clear editing state
        submitBtn.textContent = 'Add Product';
        fetchSellerProducts(user.uid);

    } catch (error) {
        console.error('Error submitting product:', error);
        alert('Failed to submit product. ' + error.message);
    } finally {
        submitBtn.disabled = false;
    }
});


// Upload image to Cloudinary via our serverless function
async function uploadImageToCloudinary(file) {
    // 1. Get signature from our Netlify function
    const response = await fetch('/.netlify/functions/generate-signature');
    const { signature, timestamp } = await response.json();

    // 2. Create form data to send to Cloudinary
    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', 'YOUR_CLOUDINARY_API_KEY'); // Use your actual API Key
    formData.append('timestamp', timestamp);
    formData.append('signature', signature);
    
    // 3. Upload the image directly to Cloudinary
    const cloudName = 'YOUR_CLOUDINARY_CLOUD_NAME'; // Use your actual Cloud Name
    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

    const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
    });

    if (!uploadResponse.ok) {
        throw new Error('Cloudinary upload failed.');
    }
    
    const uploadData = await uploadResponse.json();
    return uploadData.secure_url; // Return the image URL
}

// Fetch and display products for the currently logged-in seller
async function fetchSellerProducts(uid) {
    if (!uid) return;
    const q = query(collection(db, 'products'), where('sellerId', '==', uid));
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
        
        // Add event listeners for edit and delete
        productCard.querySelector('.edit-btn').addEventListener('click', () => populateFormForEdit(productId, product));
        productCard.querySelector('.delete-btn').addEventListener('click', () => deleteProduct(productId));

        sellerProductsList.appendChild(productCard);
    });
}

// Populate the form when an "Edit" button is clicked
function populateFormForEdit(id, product) {
    productIdInput.value = id;
    document.getElementById('product-name').value = product.name;
    document.getElementById('product-price').value = product.price;
    document.getElementById('product-description').value = product.description;
    // We expect the WhatsApp number to not have the country code here for simplicity
    const localNumber = product.whatsapp.replace('256', '0');
    document.getElementById('whatsapp-number').value = localNumber;
    submitBtn.textContent = 'Update Product';
    
    // Note: The file input cannot be programmatically set for security reasons.
    // The user must re-select an image if they want to change it.
    
    window.scrollTo(0, 0); // Scroll to top to see the form
}


// Delete a product
async function deleteProduct(productId) {
    if (confirm('Are you sure you want to delete this product?')) {
        try {
            await deleteDoc(doc(db, 'products', productId));
            alert('Product deleted.');
            fetchSellerProducts(auth.currentUser.uid); // Refresh the list
        } catch (error) {
            console.error('Error deleting product:', error);
            alert('Failed to delete product.');
        }
    }
}


// Normalize WhatsApp number to include country code without '+' or '0' at the start
function normalizeWhatsAppNumber(phone) {
    // Remove all non-digit characters
    let cleaned = ('' + phone).replace(/\D/g, '');
    
    // If it starts with '0', replace with '256'
    if (cleaned.startsWith('0')) {
        return '256' + cleaned.substring(1);
    }
    // If it already starts with '256', it's fine
    if (cleaned.startsWith('256')) {
        return cleaned;
    }
    // Handle other cases or assume it's incorrect (can add more rules)
    // For now, prepend 256 if it's a 9-digit number
    if (cleaned.length === 9) {
        return '256' + cleaned;
    }
    
    return cleaned; // Return as-is if format is unknown
}
