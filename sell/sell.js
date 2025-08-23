import { auth, db } from '../firebase.js';
import { 
    GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, onAuthStateChanged, signOut, 
    sendPasswordResetEmail,
    // START: ADDED FIREBASE PHONE AUTH MODULES
    RecaptchaVerifier, signInWithPhoneNumber
    // END: ADDED FIREBASE PHONE AUTH MODULES
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { 
    collection, addDoc, query, where, getDocs, doc, 
    updateDoc, deleteDoc, orderBy, getDoc, setDoc,
    // START: ADDED FIRESTORE TRANSACTION MODULES
    runTransaction, increment
    // END: ADDED FIRESTORE TRANSACTION MODULES
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

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

// Message elements
const loginErrorElement = document.getElementById('login-error');
const signupErrorElement = document.getElementById('signup-error');
const authSuccessElement = document.getElementById('auth-success');

// START: ADDED PHONE AUTH DOM ELEMENT SELECTIONS
const phoneForm = document.getElementById('phone-form');
const phoneNumberInput = document.getElementById('phone-number');
const sendCodeBtn = document.getElementById('send-code-btn');
const verificationCodeGroup = document.getElementById('verification-code-group');
const verificationCodeInput = document.getElementById('verification-code');
const verifyCodeBtn = document.getElementById('verify-code-btn');
const phoneErrorElement = document.getElementById('phone-error');
const phoneSuccessElement = document.getElementById('phone-success');
// END: ADDED PHONE AUTH DOM ELEMENT SELECTIONS

// Helper function to show messages
const showMessage = (element, message, isError = true) => {
    element.textContent = message;
    element.style.display = 'block';
    // Clear other messages to avoid confusion
    if (element.id !== 'phone-success') phoneSuccessElement.style.display = 'none';
    if (element.id !== 'phone-error') phoneErrorElement.style.display = 'none';

    if (isError) {
        element.classList.remove('success-message');
        element.classList.add('error-message');
    } else {
        element.classList.remove('error-message');
        element.classList.add('success-message');
    }
};

// Helper function to hide all auth messages
const hideAuthMessages = () => {
    loginErrorElement.style.display = 'none';
    signupErrorElement.style.display = 'none';
    authSuccessElement.style.display = 'none';
    // START: ADDED HIDING FOR PHONE MESSAGES
    phoneErrorElement.style.display = 'none';
    phoneSuccessElement.style.display = 'none';
    // END: ADDED HIDING FOR PHONE MESSAGES
};


// START: ADDED SMS DAILY LIMIT CHECK FUNCTION
/**
 * Checks if the daily SMS limit has been reached and increments the count.
 * @returns {Promise<boolean>} True if the SMS can be sent, false otherwise.
 */
async function checkAndIncrementSmsCount() {
    const DAILY_LIMIT = 250;
    const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
    const limitRef = doc(db, 'usage_limits', `sms_${today}`);

    try {
        await runTransaction(db, async (transaction) => {
            const limitDoc = await transaction.get(limitRef);
            
            if (!limitDoc.exists()) {
                // Document for today doesn't exist, so create it and send SMS.
                transaction.set(limitRef, { count: 1 });
                return; 
            }

            const currentCount = limitDoc.data().count;
            if (currentCount >= DAILY_LIMIT) {
                // Limit reached, throw an error to abort the transaction.
                throw new Error("Daily SMS limit reached.");
            }

            // Limit not reached, increment the count.
            transaction.update(limitRef, { count: increment(1) });
        });
        return true; // Transaction succeeded
    } catch (error) {
        if (error.message === "Daily SMS limit reached.") {
            console.warn("SMS limit for today has been reached.");
            showMessage(phoneErrorElement, "SMS login/registration failed. Please use the email and password method.");
        } else {
            console.error("Transaction failed: ", error);
            showMessage(phoneErrorElement, "Could not verify usage limits. Please try again later.");
        }
        return false; // Transaction failed
    }
}
// END: ADDED SMS DAILY LIMIT CHECK FUNCTION

// START: ADDED PHONE AUTHENTICATION LOGIC
// Set up reCAPTCHA verifier
function setupRecaptcha() {
    window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
        'callback': (response) => {
            // reCAPTCHA solved, allow signInWithPhoneNumber.
            console.log("reCAPTCHA solved");
        }
    });
}
// Call setupRecaptcha when the page loads
setupRecaptcha();

// "Send Code" button logic
sendCodeBtn.addEventListener('click', async () => {
    hideAuthMessages();
    const canSend = await checkAndIncrementSmsCount();
    
    if (!canSend) {
        return; // Stop if the limit is reached or an error occurred
    }

    const appVerifier = window.recaptchaVerifier;
    let phoneNumber = phoneNumberInput.value.trim();

    // Normalize phone number for Uganda (+256)
    if (phoneNumber.startsWith('0')) {
        phoneNumber = '+256' + phoneNumber.substring(1);
    } else if (phoneNumber.length === 9 && !phoneNumber.startsWith('+')) {
        phoneNumber = '+256' + phoneNumber;
    } else if (!phoneNumber.startsWith('+256')) {
        return showMessage(phoneErrorElement, "Please enter a valid Ugandan phone number (e.g., 077...).");
    }

    sendCodeBtn.disabled = true;
    sendCodeBtn.textContent = 'Sending...';

    try {
        const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
        // SMS sent. Store confirmation result to use later.
        window.confirmationResult = confirmationResult;
        
        showMessage(phoneSuccessElement, "Verification code sent successfully!", false);
        // Show the verification code input and hide the send button
        sendCodeBtn.style.display = 'none';
        verificationCodeGroup.style.display = 'block';
        verifyCodeBtn.style.display = 'block';

    } catch (error) {
        console.error("SMS Sending Error:", error);
        // Reset reCAPTCHA for another attempt
        window.recaptchaVerifier.render().then(widgetId => {
            grecaptcha.reset(widgetId);
        });
        showMessage(phoneErrorElement, "Failed to send code. Please check the number and try again.");
    } finally {
        sendCodeBtn.disabled = false;
        sendCodeBtn.textContent = 'Send Code';
    }
});


// "Verify Code" form submission logic
phoneForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAuthMessages();
    const code = verificationCodeInput.value;
    if (!window.confirmationResult) {
        return showMessage(phoneErrorElement, "Please send a code first.");
    }

    verifyCodeBtn.disabled = true;
    verifyCodeBtn.textContent = 'Verifying...';

    try {
        const result = await window.confirmationResult.confirm(code);
        const user = result.user;
        
        // Check if user exists in Firestore, if not, create a new entry
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (!userDoc.exists()) {
            await setDoc(userDocRef, { phoneNumber: user.phoneNumber, role: 'seller' });
        }
        // Login is handled by onAuthStateChanged observer
        
    } catch (error) {
        console.error("Verification Error:", error);
        let friendlyMessage = 'Invalid verification code. Please try again.';
        if (error.code === 'auth/invalid-verification-code') {
            friendlyMessage = 'The code you entered is incorrect. Please check and try again.';
        }
        showMessage(phoneErrorElement, friendlyMessage);
    } finally {
        verifyCodeBtn.disabled = false;
        verifyCodeBtn.textContent = 'Verify & Login';
    }
});
// END: ADDED PHONE AUTHENTICATION LOGIC

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
            showMessage(loginErrorElement, "Could not send reset email. Please check the address and try again.");
            console.error("Forgot password error:", error);
        }
    });
}

// Reset Password Logic (from dashboard)
if (resetPasswordBtn) {
    resetPasswordBtn.addEventListener('click', async () => {
        const user = auth.currentUser;
        if (!user || !user.email) {
            return alert("No logged-in user with an email found. Cannot reset password."); 
        }
        try {
            await sendPasswordResetEmail(auth, user.email);
            alert("Password reset email sent to " + user.email);
        } catch (error) {
            alert("Error: " + error.message);
        }
    });
}

// Core Authentication Logic
onAuthStateChanged(auth, user => {
    if (user) {
        authContainer.style.display = 'none';
        dashboardContainer.style.display = 'block';
        // Display email if available, otherwise phone number
        sellerEmailSpan.textContent = user.email || user.phoneNumber; 
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

// Google Sign-In Logic
googleLoginBtn.addEventListener('click', () => {
    hideAuthMessages();
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider)
        .then(async (result) => {
            const user = result.user;
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);
            if (!userDoc.exists()) {
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
        hideAuthMessages(); // Hide messages when switching tabs
        tabs.forEach(t => t.classList.remove('active'));
        contents.forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        const activeContent = document.getElementById(tab.dataset.tab);
        if (activeContent) {
            activeContent.classList.add('active');
        }
    });
});

// Email/Password Form Submission
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    hideAuthMessages();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    signInWithEmailAndPassword(auth, email, password)
        .catch(error => {
            let friendlyMessage = 'Invalid email or password. Please try again.';
            switch (error.code) {
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                case 'auth/invalid-credential':
                    friendlyMessage = 'Invalid email or password. Please check and try again.';
                    break;
                default:
                    friendlyMessage = 'An error occurred during login. Please try again later.';
                    console.error('Login error:', error);
            }
            showMessage(loginErrorElement, friendlyMessage);
        });
});

signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    hideAuthMessages();
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    createUserWithEmailAndPassword(auth, email, password)
        .then(async (userCredential) => {
            const user = userCredential.user;
            const userDocRef = doc(db, 'users', user.uid);
            await setDoc(userDocRef, { email: user.email, role: 'seller' });
        })
        .catch(error => {
            let friendlyMessage = '';
            switch (error.code) {
                case 'auth/email-already-in-use':
                    friendlyMessage = 'This email address is already registered. Please log in instead.';
                    break;
                case 'auth/weak-password':
                    friendlyMessage = 'Password is too weak. It should be at least 6 characters long.';
                    break;
                case 'auth/invalid-email':
                    friendlyMessage = 'Please enter a valid email address.';
                    break;
                default:
                    friendlyMessage = 'An error occurred during signup. Please try again later.';
                    console.error('Signup error:', error);
            }
            showMessage(signupErrorElement, friendlyMessage);
        });
});

// Password Toggle Logic
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

// Dashboard "Sell an Item" Button Logic
showProductFormBtn.addEventListener('click', () => {
    const isVisible = productFormContainer.style.display === 'block';
    if (isVisible) {
        productFormContainer.style.display = 'none';
        showProductFormBtn.textContent = 'Sell an Item';
    } else {
        productFormContainer.style.display = 'block';
        showProductFormBtn.textContent = 'Close Form';
        productForm.reset();
        productIdInput.value = '';
        submitBtn.textContent = 'Add Product';
    }
});

// Product Submission Logic (No changes to this function)
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

        if (finalImageUrls.length === 0 && !editingProductId) {
            throw new Error('At least one image is required for a new product.');
        }

        const productData = {
            name: productName, name_lowercase: productName.toLowerCase(),
            price: Number(productPrice), description: productDescription,
            whatsapp: normalizeWhatsAppNumber(whatsappNumber),
            sellerId: user.uid,
        };

        if (finalImageUrls.length > 0) {
            productData.imageUrls = finalImageUrls;
        }

        if (editingProductId) {
            productData.updatedAt = new Date();
            await updateDoc(doc(db, 'products', editingProductId), productData);
            alert('Product updated successfully!');
        } else {
            productData.createdAt = new Date();
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
        submitBtn.textContent = editingProductId.value ? 'Update Product' : 'Add Product';
    }
});

// Helper Functions (No changes to these functions)
async function uploadImageToCloudinary(file) {
    const response = await fetch('/.netlify/functions/generate-signature');
    const { signature, timestamp, cloudname, apikey } = await response.json();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', apikey);
    formData.append('timestamp', timestamp);
    formData.append('signature', signature);
    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudname}/image/upload`;
    const uploadResponse = await fetch(uploadUrl, { method: 'POST', body: formData });
    if (!uploadResponse.ok) {
        throw new Error('Cloudinary upload failed.');
    }
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
    }
    querySnapshot.forEach((doc) => {
        const product = doc.data();
        const productId = doc.id;
        const primaryImage = product.imageUrls && product.imageUrls.length > 0 ? product.imageUrls[0] : '';
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.setAttribute('data-product-id', productId);
        productCard.innerHTML = `<img src="${primaryImage}" alt="${product.name}"><h3>${product.name}</h3><p class="price">UGX ${product.price.toLocaleString()}</p><div class="seller-controls"><button class="edit-btn">Edit</button><button class="delete-btn">Delete</button></div>`;
        productCard.querySelector('.edit-btn').addEventListener('click', () => {
            productFormContainer.style.display = 'block';
            showProductFormBtn.textContent = 'Close Form';
            populateFormForEdit(productId, product);
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
