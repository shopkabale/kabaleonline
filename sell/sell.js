import { auth, db } from '../firebase.js';
import {
    GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword,
    signInWithEmailAndPassword, onAuthStateChanged, signOut,
    sendPasswordResetEmail,
    sendEmailVerification
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { 
    collection, addDoc, query, where, getDocs, doc, updateDoc, deleteDoc, 
    orderBy, getDoc, setDoc, runTransaction, serverTimestamp, increment 
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

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
const referralSection = document.getElementById('referral-section');
const userReferralCode = document.getElementById('user-referral-code');
const userReferralCount = document.getElementById('user-referral-count');
const completeProfileSection = document.getElementById('complete-profile-section');
const completeProfileForm = document.getElementById('complete-profile-form');
const completeProfileMessage = document.getElementById('profile-update-message');
const productFormMessage = document.getElementById('product-form-message');
const dashboardMessage = document.getElementById('dashboard-message');
const signupPatienceMessage = document.getElementById('signup-patience-message');
const listingTypeRadios = document.querySelectorAll('input[name="listing_type"]');
const categorySelect = document.getElementById('product-category');

const itemCategories = { "Electronics": "Electronics", "Clothing & Apparel": "Clothing & Apparel", "Home & Furniture": "Home & Furniture", "Health & Beauty": "Health & Beauty", "Vehicles": "Vehicles", "Property": "Property", "Other": "Other" };
const serviceCategories = { "Tutoring & Academics": "Tutoring & Academics", "Printing & Design": "Printing & Design", "Tech & Repair": "Tech & Repair", "Personal & Beauty": "Personal & Beauty", "Events & Creative": "Events & Creative", "Other Services": "Other Services" };

function updateCategoryOptions() {
    if (!document.querySelector('input[name="listing_type"]:checked')) return;
    const selectedType = document.querySelector('input[name="listing_type"]:checked').value;
    const categories = (selectedType === 'item') ? itemCategories : serviceCategories;
    categorySelect.innerHTML = '<option value="" disabled selected>-- Select a Category --</option>';
    for (const key in categories) {
        const option = document.createElement('option');
        option.value = key; option.textContent = categories[key];
        categorySelect.appendChild(option);
    }
}
listingTypeRadios.forEach(radio => radio.addEventListener('change', updateCategoryOptions));
document.addEventListener('DOMContentLoaded', updateCategoryOptions);

const showMessage = (element, message, isError = true) => {
    element.textContent = message;
    element.className = isError ? 'error-message' : 'success-message';
    element.style.display = 'block';
    setTimeout(() => { element.style.display = 'none'; }, 5000);
};
const hideAuthMessages = () => { loginErrorElement.style.display = 'none'; signupErrorElement.style.display = 'none'; authSuccessElement.style.display = 'none'; };
const clearAuthForms = () => { if (loginForm) loginForm.reset(); if (signupForm) signupForm.reset(); };
const toggleLoading = (button, isLoading, originalText) => {
    if (isLoading) {
        button.disabled = true; button.classList.add('loading');
        button.innerHTML = `<span class="loader"></span> ${originalText}`;
    } else {
        button.disabled = false; button.classList.remove('loading');
        button.innerHTML = originalText;
    }
};

onAuthStateChanged(auth, async (user) => {
    if (user) {
        dashboardMessage.style.display = 'none'; authContainer.style.display = 'none'; dashboardContainer.style.display = 'block';
        sellerEmailSpan.textContent = user.email; fetchSellerProducts(user.uid);
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        let userData, refCode;

        if (!userDoc.exists()) {
            refCode = user.uid.substring(0, 6).toUpperCase();
            userData = { email: user.email, role: 'seller', isVerified: false, referralCount: 0, createdAt: serverTimestamp(), referralCode: refCode };
            await setDoc(userDocRef, userData);
            completeProfileSection.style.display = 'block';
        } else {
            userData = userDoc.data();
            if (!userData.name || !userData.location) {
                completeProfileSection.style.display = 'block';
                if (userData.name) document.getElementById('profile-name').value = userData.name;
                if (userData.location) document.getElementById('profile-location').value = userData.location;
            } else { completeProfileSection.style.display = 'none'; }
            refCode = userData.referralCode;
            if (!refCode) { refCode = user.uid.substring(0, 6).toUpperCase(); await updateDoc(userDocRef, { referralCode: refCode }); }
        }
        const referralsQuery = query(collection(db, 'users'), where('referrerId', '==', user.uid));
        const referralsSnapshot = await getDocs(referralsQuery);
        const actualReferralCount = referralsSnapshot.size;
        if (userData.referralCount !== actualReferralCount) {
            await updateDoc(userDocRef, { referralCount: actualReferralCount });
        }
        displayDashboardInfo(userData, refCode, actualReferralCount);
    } else { authContainer.style.display = 'block'; dashboardContainer.style.display = 'none'; }
});

function displayDashboardInfo(userData, refCode, count) { userReferralCode.textContent = refCode; userReferralCount.textContent = count; referralSection.style.display = 'block'; }
userReferralCode.addEventListener('click', () => { navigator.clipboard.writeText(userReferralCode.textContent).then(() => { showMessage(dashboardMessage, "Referral code copied!", false); }); });
logoutBtn.addEventListener('click', () => signOut(auth));

if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', async (e) => {
        e.preventDefault(); hideAuthMessages();
        const email = document.getElementById('login-email').value;
        if (!email) { return showMessage(loginErrorElement, "Please enter your email to reset your password."); }
        try { await sendPasswordResetEmail(auth, email); showMessage(authSuccessElement, "Password reset email sent. Please check your inbox.", false); }
        catch (error) { showMessage(loginErrorElement, "Could not send reset email. Make sure the email is correct."); }
    });
}
if (resetPasswordBtn) {
    resetPasswordBtn.addEventListener('click', async () => {
        const email = prompt("Please enter your email address to receive a password reset link:");
        if (email) {
            try { await sendPasswordResetEmail(auth, email); alert("If an account exists for '" + email + "', a password reset email has been sent."); }
            catch (error) { alert("Could not send reset email. Please ensure the email address is valid."); }
        }
    });
}
googleLoginBtn.addEventListener('click', () => {
    hideAuthMessages();
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider).then(async (result) => {
        const user = result.user;
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (!userDoc.exists()) {
            await setDoc(userDocRef, {
                name: user.displayName, email: user.email, profilePhotoUrl: user.photoURL,
                role: 'seller', isVerified: false, referralCount: 0,
                createdAt: serverTimestamp(), referralCode: user.uid.substring(0, 6).toUpperCase()
            });
        }
    }).catch((error) => { showMessage(loginErrorElement, "Could not sign in with Google. Please try again."); });
});
const tabs = document.querySelectorAll('.tab-link');
const contents = document.querySelectorAll('.tab-content');
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        hideAuthMessages(); clearAuthForms();
        tabs.forEach(t => t.classList.remove('active'));
        contents.forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab).classList.add('active');
    });
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

loginForm.addEventListener('submit', (e) => {
    e.preventDefault(); hideAuthMessages();
    const email = document.getElementById('login-email').value; const password = document.getElementById('login-password').value;
    const loginButton = loginForm.querySelector('button[type="submit"]');
    toggleLoading(loginButton, true, 'Logging In');
    signInWithEmailAndPassword(auth, email, password)
        .catch(error => { showMessage(loginErrorElement, 'Invalid email or password.'); })
        .finally(() => { toggleLoading(loginButton, false, 'Login'); });
});

signupForm.addEventListener('submit', async (e) => {
    e.preventDefault(); hideAuthMessages();
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const whatsapp = document.getElementById('signup-whatsapp').value;
    const location = document.getElementById('signup-location').value;
    const institution = document.getElementById('signup-institution').value;
    const password = document.getElementById('signup-password').value;
    const referralCode = document.getElementById('referral-code').value.trim().toUpperCase();
    const signupButton = signupForm.querySelector('button[type="submit"]');

    if (!name || !location || !whatsapp) { return showMessage(signupErrorElement, "Please fill out all required fields."); }
    toggleLoading(signupButton, true, 'Creating Account'); signupPatienceMessage.style.display = 'block';
    
    let referrerId = null;
    if (referralCode) {
        const q = query(collection(db, "users"), where("referralCode", "==", referralCode));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            showMessage(signupErrorElement, "Invalid referral code. Please check it or continue without one.");
            toggleLoading(signupButton, false, 'Create Account'); signupPatienceMessage.style.display = 'none';
            return;
        }
        const referrerDoc = querySnapshot.docs[0]; referrerId = referrerDoc.id;
    }
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password); const user = userCredential.user;
        const newUserRef = doc(db, "users", user.uid);
        await setDoc(newUserRef, { 
            name, email, whatsapp: normalizeWhatsAppNumber(whatsapp), location, institution, 
            role: 'seller', isVerified: false, createdAt: serverTimestamp(), 
            referralCount: 0, 
            referrerId: referrerId,
            referralCode: user.uid.substring(0, 6).toUpperCase() 
        });
        await sendEmailVerification(user);
        showMessage(authSuccessElement, "Success! Please check your email to verify your account.", false); signupForm.reset();
    } catch (error) {
        let msg = 'An error occurred. Please try again.';
        if (error.code === 'auth/email-already-in-use') msg = 'This email is already registered.';
        if (error.code === 'auth/weak-password') msg = 'Password must be at least 6 characters.';
        showMessage(signupErrorElement, msg);
    } finally {
        toggleLoading(signupButton, false, 'Create Account'); signupPatienceMessage.style.display = 'none';
    }
});

completeProfileForm.addEventListener('submit', async (e) => {
    e.preventDefault(); const user = auth.currentUser; if (!user) return;
    const updateBtn = document.getElementById('update-profile-btn');
    toggleLoading(updateBtn, true, 'Saving');
    try {
        const name = document.getElementById('profile-name').value; const location = document.getElementById('profile-location').value;
        const bio = document.getElementById('profile-bio').value; const photoFile = document.getElementById('profile-photo').files[0];
        const dataToUpdate = { name, location, bio };
        if (photoFile) { dataToUpdate.profilePhotoUrl = await uploadImageToCloudinary(photoFile); }
        await updateDoc(doc(db, 'users', user.uid), dataToUpdate);
        showMessage(completeProfileMessage, 'Profile updated successfully!', false);
        setTimeout(() => { completeProfileSection.style.display = 'none'; completeProfileMessage.style.display = 'none'; }, 2000);
    } catch (error) { showMessage(completeProfileMessage, "Failed to update profile."); } 
    finally { toggleLoading(updateBtn, false, 'Save and Update Profile'); }
});

showProductFormBtn.addEventListener('click', () => {
    const isVisible = productFormContainer.style.display === 'block';
    productFormContainer.style.display = isVisible ? 'none' : 'block';
    showProductFormBtn.textContent = isVisible ? 'Close Form' : 'Sell';
    if (!isVisible) { productForm.reset(); productIdInput.value = ''; submitBtn.textContent = 'Add Product'; updateCategoryOptions(); }
});

productForm.addEventListener('submit', async (e) => {
    e.preventDefault(); const user = auth.currentUser; if (!user) return;
    const productSubmitBtn = document.getElementById('submit-btn');
    toggleLoading(productSubmitBtn, true, 'Submitting');
    try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.exists() ? userDoc.data() : {};
        const isVerified = userData.isVerified || false; const sellerName = userData.name || user.email;
        const productName = document.getElementById('product-name').value; const productPrice = document.getElementById('product-price').value;
        const productCategory = document.getElementById('product-category').value; const productDescription = document.getElementById('product-description').value;
        const productStory = document.getElementById('product-story').value; const whatsappNumber = document.getElementById('whatsapp-number').value;
        const imageFile1 = document.getElementById('product-image-1').files[0]; const imageFile2 = document.getElementById('product-image-2').files[0];
        const editingProductId = productIdInput.value; let finalImageUrls = [];
        if (editingProductId) { const docSnap = await getDoc(doc(db, 'products', editingProductId)); if (docSnap.exists()) finalImageUrls = docSnap.data().imageUrls || []; }
        const filesToUpload = [imageFile1, imageFile2].filter(f => f);
        if (filesToUpload.length > 0) { finalImageUrls = await Promise.all(filesToUpload.map(f => uploadImageToCloudinary(f))); }
        if (finalImageUrls.length === 0 && !editingProductId) throw new Error('At least one image is required.');
        const productData = { listing_type: document.querySelector('[name=listing_type]:checked').value, name: productName, name_lowercase: productName.toLowerCase(), price: Number(productPrice), category: productCategory, description: productDescription, story: productStory, whatsapp: normalizeWhatsAppNumber(whatsappNumber), sellerId: user.uid, sellerEmail: user.email, sellerName, sellerIsVerified: isVerified };
        if (finalImageUrls.length > 0) productData.imageUrls = finalImageUrls;
        if (editingProductId) { await updateDoc(doc(db, 'products', editingProductId), { ...productData, updatedAt: serverTimestamp() }); } else { await addDoc(collection(db, 'products'), { ...productData, createdAt: serverTimestamp(), isDeal: false }); }
        showMessage(productFormMessage, 'Listing submitted successfully!', false); productForm.reset();
        setTimeout(() => { productFormContainer.style.display = 'none'; productFormMessage.style.display = 'none'; fetchSellerProducts(user.uid); }, 2000);
    } catch (error) { showMessage(productFormMessage, 'Failed to submit listing: ' + error.message); } 
    finally { toggleLoading(productSubmitBtn, false, productIdInput.value ? 'Update Product' : 'Add Product'); }
});

async function uploadImageToCloudinary(file) {
    const response = await fetch('/.netlify/functions/generate-signature');
    const { signature, timestamp, cloudname, apikey } = await response.json();
    const formData = new FormData();
    formData.append('file', file); formData.append('api_key', apikey);
    formData.append('timestamp', timestamp); formData.append('signature', signature);
    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudname}/image/upload`;
    const uploadResponse = await fetch(uploadUrl, { method: 'POST', body: formData });
    if (!uploadResponse.ok) throw new Error('Cloudinary upload failed.');
    const uploadData = await uploadResponse.json(); return uploadData.secure_url;
}

async function fetchSellerProducts(uid) {
    if (!uid) return;
    const q = query(collection(db, 'products'), where('sellerId', '==', uid), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    sellerProductsList.innerHTML = '';
    if (querySnapshot.empty) { sellerProductsList.innerHTML = "<p>You haven't added any products yet. Click 'Sell' to get started!</p>"; return; }
    querySnapshot.forEach((doc) => {
        const product = doc.data(); const productId = doc.id;
        const primaryImage = product.imageUrls && product.imageUrls.length > 0 ? product.imageUrls[0] : '';
        const productCard = document.createElement('div'); productCard.className = 'product-card';
        productCard.innerHTML = `<img src="${primaryImage}" alt="${product.name}"><h3>${product.name}</h3><p class="price">UGX ${product.price.toLocaleString()}</p><div class="seller-controls"><button class="edit-btn">Edit</button><button class="delete-btn">Delete</button></div>`;
        productCard.querySelector('.edit-btn').addEventListener('click', () => populateFormForEdit(productId, product));
        productCard.querySelector('.delete-btn').addEventListener('click', () => deleteProduct(productId));
        sellerProductsList.appendChild(productCard);
    });
}

function populateFormForEdit(id, product) {
    productFormContainer.style.display = 'block'; showProductFormBtn.textContent = 'Close Form';
    document.getElementById(`type-${product.listing_type || 'item'}`).checked = true; updateCategoryOptions();
    productIdInput.value = id; document.getElementById('product-name').value = product.name;
    document.getElementById('product-price').value = product.price; document.getElementById('product-category').value = product.category || '';
    document.getElementById('product-description').value = product.description; document.getElementById('product-story').value = product.story || '';
    const localNumber = product.whatsapp.startsWith('256') ? '0' + product.whatsapp.substring(3) : product.whatsapp;
    document.getElementById('whatsapp-number').value = localNumber;
    submitBtn.textContent = 'Update Product';
    document.getElementById('product-image-1').value = ''; document.getElementById('product-image-2').value = '';
    window.scrollTo(0, 0);
}

async function deleteProduct(productId) {
    if (confirm('Are you sure you want to delete this product?')) {
        try {
            await deleteDoc(doc(db, 'products', productId));
            showMessage(dashboardMessage, 'Product deleted successfully.', false);
            fetchSellerProducts(auth.currentUser.uid);
        } catch (error) { showMessage(dashboardMessage, 'Failed to delete product.'); }
    }
}
function normalizeWhatsAppNumber(phone) {
    let cleaned = ('' + phone).replace(/\D/g, '');
    if (cleaned.startsWith('0')) return '256' + cleaned.substring(1);
    if (cleaned.startsWith('256')) return cleaned;
    if (cleaned.length === 9) return '256' + cleaned;
    return cleaned;
}
