import { auth, db } from '../firebase.js';
import {
    GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword,
    signInWithEmailAndPassword, onAuthStateChanged, signOut,
    sendPasswordResetEmail,
    sendEmailVerification
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { collection, addDoc, query, where, getDocs, doc, updateDoc, deleteDoc, orderBy, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// DOM Element Selections
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
const forgotPasswordLink = document.getElementById('forgot-password-link');
const resetPasswordBtn = document.getElementById('reset-password-btn');
const loginErrorElement = document.getElementById('login-error');
const signupErrorElement = document.getElementById('signup-error');
const authSuccessElement = document.getElementById('auth-success');

// Logic for dynamic categories
const listingTypeRadios = document.querySelectorAll('input[name="listing_type"]');
const categorySelect = document.getElementById('product-category');

const itemCategories = {
    "Electronics": "Electronics",
    "Clothing & Apparel": "Clothing & Apparel",
    "Home & Furniture": "Home & Furniture",
    "Health & Beauty": "Health & Beauty",
    "Vehicles": "Vehicles",
    "Property": "Property",
    "Other": "Other"
};

const serviceCategories = {
    "Tutoring & Academics": "Tutoring & Academics",
    "Printing & Design": "Printing & Design",
    "Tech & Repair": "Tech & Repair",
    "Personal & Beauty": "Personal & Beauty",
    "Events & Creative": "Events & Creative",
    "Other Services": "Other Services"
};

function updateCategoryOptions() {
    if (!document.querySelector('input[name="listing_type"]:checked')) return;
    const selectedType = document.querySelector('input[name="listing_type"]:checked').value;
    const categories = (selectedType === 'item') ? itemCategories : serviceCategories;

    categorySelect.innerHTML = '<option value="" disabled selected>-- Select a Category --</option>'; // Reset

    for (const key in categories) {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = categories[key];
        categorySelect.appendChild(option);
    }
}

listingTypeRadios.forEach(radio => radio.addEventListener('change', updateCategoryOptions));
document.addEventListener('DOMContentLoaded', updateCategoryOptions);

// Helper function to show messages
const showMessage = (element, message, isError = true) => {
    element.textContent = message;
    element.style.display = 'block';
    element.className = isError ? 'error-message' : 'success-message'; // Simplified class assignment
    if (isError) {
        setTimeout(() => {
            element.style.display = 'none';
        }, 5000); // Increased time for better readability
    }
};

const hideAuthMessages = () => {
    loginErrorElement.style.display = 'none';
    signupErrorElement.style.display = 'none';
    authSuccessElement.style.display = 'none';
};

const clearAuthForms = () => {
    if (loginForm) loginForm.reset();
    if (signupForm) signupForm.reset();
};

// Forgot Password Logic
if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', async (e) => {
        e.preventDefault();
        hideAuthMessages();
        const email = document.getElementById('login-email').value;
        if (!email) {
            return showMessage(loginErrorElement, "Please enter your email below to reset your password.");
        }
        try {
            await sendPasswordResetEmail(auth, email);
            showMessage(authSuccessElement, "Password reset email sent. Please check your inbox.", false);
        } catch (error) {
            showMessage(loginErrorElement, "Could not send reset email. Make sure the email is correct.");
            console.error("Forgot password error:", error);
        }
    });
}

if (resetPasswordBtn) {
    resetPasswordBtn.addEventListener('click', async () => {
        const email = prompt("Please enter your email address to receive a password reset link:");
        if (email) {
            try {
                await sendPasswordResetEmail(auth, email);
                alert("If an account exists for '" + email + "', a password reset email has been sent.");
            } catch (error) {
                console.error("Password reset error from dashboard:", error);
                alert("Could not send reset email. Please ensure the email address is valid.");
            }
        }
    });
}

// Core Authentication Logic
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
    signOut(auth).catch(error => {
        console.error("Logout Error:", error);
        alert("Could not log out. Please try again.");
    });
});

googleLoginBtn.addEventListener('click', () => {
    hideAuthMessages();
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider)
        .then(async (result) => {
            const user = result.user;
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);
            if (!userDoc.exists()) {
                // No need to send verification for Google sign-in
                await setDoc(userDocRef, { email: user.email, role: 'seller' });
            }
        }).catch((error) => {
            console.error("Google Sign-In Error:", error);
            showMessage(loginErrorElement, "Could not sign in with Google. Please try again.");
        });
});

// Tab Switching Logic
const tabs = document.querySelectorAll('.tab-link');
const contents = document.querySelectorAll('.tab-content');
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        hideAuthMessages();
        clearAuthForms();
        tabs.forEach(t => t.classList.remove('active'));
        contents.forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        const activeContent = document.getElementById(tab.dataset.tab);
        if (activeContent) {
            activeContent.classList.add('active');
        }
    });
});

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    hideAuthMessages();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    signInWithEmailAndPassword(auth, email, password)
        .catch(error => {
            let friendlyMessage = 'Invalid email or password. Please try again.';
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                friendlyMessage = 'Invalid email or password. Please check and try again.';
            } else if (error.code === 'auth/too-many-requests') {
                friendlyMessage = 'Access to this account has been temporarily disabled due to many failed login attempts. You can immediately restore it by resetting your password or you can try again later.';
            } else {
                console.error('Login error:', error);
            }
            showMessage(loginErrorElement, friendlyMessage);
        });
});

signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAuthMessages();
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const signupButton = signupForm.querySelector('button[type="submit"]');

    // Show creating account message and disable button
    signupButton.disabled = true;
    signupButton.textContent = 'Creating Account...';
    showMessage(authSuccessElement, "Just a moment, creating your account...", false);

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await sendEmailVerification(user);
        await setDoc(doc(db, 'users', user.uid), { email: user.email, role: 'seller' });

        showMessage(authSuccessElement, "Success! Please check your email inbox to verify your account.", false);
        clearAuthForms();
    } catch (error) {
        let friendlyMessage = 'An error occurred during signup. Please try again later.';
        switch (error.code) {
            case 'auth/email-already-in-use':
                friendlyMessage = 'This email is already registered. Please go to the Login tab.';
                break;
            case 'auth/weak-password':
                friendlyMessage = 'Password is too weak. It must be at least 6 characters long.';
                break;
            case 'auth/invalid-email':
                friendlyMessage = 'The email address is not valid. Please enter a correct email.';
                break;
            default:
                console.error('Signup error:', error);
        }
        showMessage(signupErrorElement, friendlyMessage);
        authSuccessElement.style.display = 'none'; // Hide the "creating account" message
    } finally {
        // Re-enable the button
        signupButton.disabled = false;
        signupButton.textContent = 'Create Account';
    }
});


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

showProductFormBtn.addEventListener('click', () => {
    const isVisible = productFormContainer.style.display === 'block';
    if (isVisible) {
        productFormContainer.style.display = 'none';
        showProductFormBtn.textContent = 'Post Something';
    } else {
        productFormContainer.style.display = 'block';
        showProductFormBtn.textContent = 'Close Form';
        productForm.reset();
        productIdInput.value = '';
        submitBtn.textContent = 'Add Product';
        updateCategoryOptions();
    }
});

productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return alert('You must be logged in!');

    const submissionMessage = document.getElementById('submission-message');
    submissionMessage.style.display = 'block';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    try {
        const productName = document.getElementById('product-name').value;
        const productPrice = document.getElementById('product-price').value;
        const productCategory = document.getElementById('product-category').value;
        const productDescription = document.getElementById('product-description').value;
        const whatsappNumber = document.getElementById('whatsapp-number').value;
        const imageFile1 = document.getElementById('product-image-1').files[0];
        const imageFile2 = document.getElementById('product-image-2').files[0];
        const editingProductId = productIdInput.value;
        let finalImageUrls = [];

        if (!productCategory) throw new Error('Please select a product category.');

        if (editingProductId) {
            const productRef = doc(db, 'products', editingProductId);
            const docSnap = await getDoc(productRef);
            if (docSnap.exists()) finalImageUrls = docSnap.data().imageUrls || [];
        }

        const filesToUpload = [imageFile1, imageFile2].filter(f => f);
        if (filesToUpload.length > 0) {
            const uploadPromises = filesToUpload.map(file => uploadImageToCloudinary(file));
            const newImageUrls = await Promise.all(uploadPromises);
            finalImageUrls = newImageUrls.filter(url => url); // Keep existing if new uploads fail
        }

        if (finalImageUrls.length === 0 && !editingProductId) {
            throw new Error('At least one image is required for a new product.');
        }

        const productData = {
            listing_type: document.querySelector('input[name="listing_type"]:checked').value,
            name: productName,
            name_lowercase: productName.toLowerCase(),
            price: Number(productPrice),
            category: productCategory,
            description: productDescription,
            whatsapp: normalizeWhatsAppNumber(whatsappNumber),
            sellerId: user.uid,
        };

        if (finalImageUrls.length > 0) productData.imageUrls = finalImageUrls;

        if (editingProductId) {
            productData.updatedAt = new Date();
            await updateDoc(doc(db, 'products', editingProductId), productData);
            alert('Product updated successfully!');
        } else {
            productData.createdAt = new Date();
            productData.isDeal = false; // **FIX: Ensure new products are not deals by default**
            await addDoc(collection(db, 'products'), productData);
            alert('Product added successfully!');
        }

        productForm.reset();
        productIdInput.value = '';
        productFormContainer.style.display = 'none';
        showProductFormBtn.textContent = 'Post Another Listing';
        updateCategoryOptions();
        fetchSellerProducts(user.uid);

    } catch (error) {
        console.error('Error submitting product:', error);
        alert('Failed to submit product. ' + error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = productIdInput.value ? 'Update Product' : 'Add Product';
        submissionMessage.style.display = 'none';
    }
});

async function uploadImageToCloudinary(file) {
    const response = await fetch('/.netlify/functions/generate-signature');
    const { signature, timestamp, cloudname, apikey } = await response.json();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', apikey);
    formData.append('timestamp', timestamp);
    formData.append('signature', signature);
    // **FIX: Corrected the URL syntax**
    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudname}/image/upload`;
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
    if (querySnapshot.empty) {
        sellerProductsList.innerHTML = "<p>You haven't added any products yet. Click 'Sell an Item' to get started!</p>";
        return;
    }
    querySnapshot.forEach((doc) => {
        const product = doc.data();
        const productId = doc.id;
        const primaryImage = product.imageUrls && product.imageUrls.length > 0 ? product.imageUrls[0] : '';
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        // **FIX: Corrected the template literal syntax**
        productCard.innerHTML = `
            <img src="${primaryImage}" alt="${product.name}">
            <h3>${product.name}</h3>
            <p class="price">UGX ${product.price.toLocaleString()}</p>
            <div class="seller-controls">
                <button class="edit-btn">Edit</button>
                <button class="delete-btn">Delete</button>
            </div>
        `;
        productCard.querySelector('.edit-btn').addEventListener('click', () => populateFormForEdit(productId, product));
        productCard.querySelector('.delete-btn').addEventListener('click', () => deleteProduct(productId));
        sellerProductsList.appendChild(productCard);
    });
}

function populateFormForEdit(id, product) {
    productFormContainer.style.display = 'block';
    showProductFormBtn.textContent = 'Close Form';

    const type = product.listing_type || 'item';
    document.getElementById(`type-${type}`).checked = true;
    updateCategoryOptions();

    productIdInput.value = id;
    document.getElementById('product-name').value = product.name;
    document.getElementById('product-price').value = product.price;
    document.getElementById('product-category').value = product.category || '';
    document.getElementById('product-description').value = product.description;
    const localNumber = product.whatsapp.startsWith('256') ? '0' + product.whatsapp.substring(3) : product.whatsapp;
    document.getElementById('whatsapp-number').value = localNumber;
    submitBtn.textContent = 'Update Product';
    document.getElementById('product-image-1').value = '';
    document.getElementById('product-image-2').value = '';
    window.scrollTo(0, 0);
}

async function deleteProduct(productId) {
    if (confirm('Are you sure you want to delete this product?')) {
        try {
            await deleteDoc(doc(db, 'products', productId));
            alert('Product deleted successfully.');
            fetchSellerProducts(auth.currentUser.uid);
        } catch (error) {
            console.error("Delete product error:", error);
            alert('Failed to delete product.');
        }
    }
}

function normalizeWhatsAppNumber(phone) {
    let cleaned = ('' + phone).replace(/\D/g, '');
    if (cleaned.startsWith('0')) return '256' + cleaned.substring(1);
    if (cleaned.startsWith('256')) return cleaned;
    if (cleaned.length === 9) return '256' + cleaned;
    return cleaned; // Return cleaned number even if it doesn't match patterns
}
