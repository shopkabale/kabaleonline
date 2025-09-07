import { auth, db } from '../firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { 
    collection, addDoc, query, where, getDocs, doc, updateDoc, deleteDoc, 
    orderBy, getDoc, setDoc, serverTimestamp, increment 
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- ELEMENT SELECTION (Unique to this page) ---
const sellerProductsList = document.getElementById('seller-products-list');
const productForm = document.getElementById('product-form');
const submitBtn = document.getElementById('submit-btn');
const productIdInput = document.getElementById('productId');
const showProductFormBtn = document.getElementById('show-product-form-btn');
const productFormContainer = document.getElementById('product-form-container');
const resetPasswordBtn = document.getElementById('reset-password-btn');
const referralSection = document.getElementById('referral-section');
const userReferralCode = document.getElementById('user-referral-code');
const userReferralCount = document.getElementById('user-referral-count');
const completeProfileSection = document.getElementById('complete-profile-section');
const completeProfileForm = document.getElementById('complete-profile-form');
const productFormMessage = document.getElementById('product-form-message');
const dashboardMessage = document.getElementById('dashboard-message');
const listingTypeRadios = document.querySelectorAll('input[name="listing_type"]');
const categorySelect = document.getElementById('product-category');

// --- HELPER FUNCTIONS ---
const itemCategories = { "Electronics": "Electronics", "Clothing & Apparel": "Clothing & Apparel", "Home & Furniture": "Home & Furniture", "Health & Beauty": "Health & Beauty", "Vehicles": "Vehicles", "Property": "Property", "Other": "Other" };
const serviceCategories = { "Tutoring & Academics": "Tutoring & Academics", "Printing & Design": "Printing & Design", "Tech & Repair": "Tech & Repair", "Personal & Beauty": "Personal & Beauty", "Events & Creative": "Events & Creative", "Other Services": "Other Services" };

function updateCategoryOptions() {
    if (!categorySelect || !listingTypeRadios || listingTypeRadios.length === 0) return;
    const selectedTypeInput = document.querySelector('input[name="listing_type"]:checked');
    if (!selectedTypeInput) return;
    const selectedType = selectedTypeInput.value;
    const categories = (selectedType === 'item') ? itemCategories : serviceCategories;
    categorySelect.innerHTML = '<option value="" disabled selected>-- Select a Category --</option>';
    for (const key in categories) {
        const option = document.createElement('option');
        option.value = key; option.textContent = categories[key];
        categorySelect.appendChild(option);
    }
}
const showMessage = (element, message, isError = true) => {
    if (!element) return;
    element.textContent = message;
    element.className = isError ? 'error-message' : 'success-message';
    element.style.display = 'block';
    setTimeout(() => { element.style.display = 'none'; }, 5000);
};
const toggleLoading = (button, isLoading, originalText) => {
    if(!button) return;
    if (isLoading) {
        button.disabled = true; button.classList.add('loading');
        button.innerHTML = `<span class="loader"></span> ${originalText}`;
    } else {
        button.disabled = false; button.classList.remove('loading');
        button.innerHTML = originalText;
    }
};
function normalizeWhatsAppNumber(phone) {
    if(!phone) return '';
    let cleaned = ('' + phone).replace(/\D/g, '');
    if (cleaned.startsWith('0')) return '256' + cleaned.substring(1);
    if (cleaned.startsWith('256')) return cleaned;
    if (cleaned.length === 9) return '256' + cleaned;
    return cleaned;
}

// --- PAGE-SPECIFIC LOGIC ---
onAuthStateChanged(auth, async (user) => {
    if (user && user.emailVerified) {
        fetchSellerProducts(user.uid);
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
            const userData = userDoc.data();
            const refCode = userData.referralCode;
            const referralsQuery = query(collection(db, 'users'), where('referrerId', '==', user.uid));
            const referralsSnapshot = await getDocs(referralsQuery);
            const actualReferralCount = referralsSnapshot.size;
            if (userData.referralCount !== actualReferralCount) {
                await updateDoc(userDocRef, { referralCount: actualReferralCount });
            }
            displayDashboardInfo(userData, refCode, actualReferralCount);
            if (completeProfileSection && (!userData.name || !userData.location)) {
                completeProfileSection.style.display = 'block';
                if (userData.name) document.getElementById('profile-name').value = userData.name;
                if (userData.location) document.getElementById('profile-location').value = userData.location;
            } else if (completeProfileSection) {
                completeProfileSection.style.display = 'none';
            }
        }
    }
});

function displayDashboardInfo(userData, refCode, count) {
    if (userReferralCode) userReferralCode.textContent = refCode;
    if (userReferralCount) userReferralCount.textContent = count;
    if (referralSection) referralSection.style.display = 'block';
}

if (listingTypeRadios) listingTypeRadios.forEach(radio => radio.addEventListener('change', updateCategoryOptions));
document.addEventListener('DOMContentLoaded', updateCategoryOptions);

if (userReferralCode) {
    userReferralCode.addEventListener('click', () => {
        navigator.clipboard.writeText(userReferralCode.textContent).then(() => {
            showMessage(dashboardMessage, "Referral code copied!", false);
        });
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
                alert("Could not send reset email. Please ensure the email address is valid.");
            }
        }
    });
}

if (completeProfileForm) {
    completeProfileForm.addEventListener('submit', async (e) => {
        e.preventDefault(); const user = auth.currentUser; if (!user) return;
        const updateBtn = document.getElementById('update-profile-btn');
        toggleLoading(updateBtn, true, 'Saving');
        try {
            const name = document.getElementById('profile-name').value;
            const location = document.getElementById('profile-location').value;
            const bio = document.getElementById('profile-bio').value;
            const photoFile = document.getElementById('profile-photo').files[0];
            const dataToUpdate = { name, location, bio };
            if (photoFile) { dataToUpdate.profilePhotoUrl = await uploadImageToCloudinary(photoFile); }
            await updateDoc(doc(db, 'users', user.uid), dataToUpdate);
            showMessage(document.getElementById('profile-update-message'), 'Profile updated successfully!', false);
            setTimeout(() => {
                completeProfileSection.style.display = 'none';
                document.getElementById('profile-update-message').style.display = 'none';
            }, 2000);
        } catch (error) {
            showMessage(document.getElementById('profile-update-message'), "Failed to update profile.");
        } finally {
            toggleLoading(updateBtn, false, 'Save and Update Profile');
        }
    });
}

if (showProductFormBtn) {
    showProductFormBtn.addEventListener('click', () => {
        const isVisible = productFormContainer.style.display === 'block';
        productFormContainer.style.display = isVisible ? 'none' : 'block';
        showProductFormBtn.textContent = isVisible ? 'Sell' : 'Close Form';
        if (!isVisible) {
            productForm.reset();
            productIdInput.value = '';
            submitBtn.textContent = 'Add Product';
            updateCategoryOptions();
        }
    });
}

if (productForm) {
    productForm.addEventListener('submit', async (e) => {
        e.preventDefault(); const user = auth.currentUser; if (!user) return;
        const productSubmitBtn = document.getElementById('submit-btn');
        toggleLoading(productSubmitBtn, true, 'Submitting');
        try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            const userData = userDoc.exists() ? userDoc.data() : {};
            const isVerified = userData.isVerified || false;
            const sellerName = userData.name || user.email;
            const productName = document.getElementById('product-name').value;
            const productPrice = document.getElementById('product-price').value;
            const productCategory = document.getElementById('product-category').value;
            const productDescription = document.getElementById('product-description').value;
            const productStory = document.getElementById('product-story').value;
            const whatsappNumber = document.getElementById('whatsapp-number').value;
            const imageFile1 = document.getElementById('product-image-1').files[0];
            const imageFile2 = document.getElementById('product-image-2').files[0];
            const editingProductId = productIdInput.value;
            let finalImageUrls = [];
            if (editingProductId) {
                const docSnap = await getDoc(doc(db, 'products', editingProductId));
                if (docSnap.exists()) finalImageUrls = docSnap.data().imageUrls || [];
            }
            const filesToUpload = [imageFile1, imageFile2].filter(f => f);
            if (filesToUpload.length > 0) {
                finalImageUrls = await Promise.all(filesToUpload.map(f => uploadImageToCloudinary(f)));
            }
            if (finalImageUrls.length === 0 && !editingProductId) throw new Error('At least one image is required.');
            const productData = {
                listing_type: document.querySelector('[name=listing_type]:checked').value,
                name: productName,
                name_lowercase: productName.toLowerCase(),
                price: Number(productPrice),
                category: productCategory,
                description: productDescription,
                story: productStory,
                whatsapp: normalizeWhatsAppNumber(whatsappNumber),
                sellerId: user.uid,
                sellerEmail: user.email,
                sellerName,
                sellerIsVerified: isVerified
            };
            if (finalImageUrls.length > 0) productData.imageUrls = finalImageUrls;
            if (editingProductId) {
                await updateDoc(doc(db, 'products', editingProductId), { ...productData, updatedAt: serverTimestamp() });
            } else {
                await addDoc(collection(db, 'products'), { ...productData, createdAt: serverTimestamp(), isDeal: false });
            }
            showMessage(productFormMessage, 'Listing submitted successfully!', false);
            productForm.reset();
            setTimeout(() => {
                productFormContainer.style.display = 'none';
                productFormMessage.style.display = 'none';
                fetchSellerProducts(user.uid);
            }, 2000);
        } catch (error) {
            showMessage(productFormMessage, 'Failed to submit listing: ' + error.message);
        } finally {
            toggleLoading(productSubmitBtn, false, productIdInput.value ? 'Update Product' : 'Add Product');
        }
    });
}

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
    if (!uploadResponse.ok) throw new Error('Cloudinary upload failed.');
    const uploadData = await uploadResponse.json();
    return uploadData.secure_url;
}

async function fetchSellerProducts(uid) {
    if (!uid || !sellerProductsList) return;
    const q = query(collection(db, 'products'), where('sellerId', '==', uid), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    sellerProductsList.innerHTML = '';
    if (querySnapshot.empty) {
        sellerProductsList.innerHTML = "<p>You haven't added any products yet. Click 'Sell' to get started!</p>";
        return;
    }
    querySnapshot.forEach((doc) => {
        const product = doc.data();
        const productId = doc.id;
        const primaryImage = product.imageUrls && product.imageUrls.length > 0 ? product.imageUrls[0] : '';
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.innerHTML = `<img src="${primaryImage}" alt="${product.name}"><h3>${product.name}</h3><p class="price">UGX ${product.price.toLocaleString()}</p><div class="seller-controls"><button class="edit-btn">Edit</button><button class="delete-btn">Delete</button></div>`;
        productCard.querySelector('.edit-btn').addEventListener('click', () => populateFormForEdit(productId, product));
        productCard.querySelector('.delete-btn').addEventListener('click', () => deleteProduct(productId));
        sellerProductsList.appendChild(productCard);
    });
}

function populateFormForEdit(id, product) {
    productFormContainer.style.display = 'block';
    showProductFormBtn.textContent = 'Close Form';
    document.getElementById(`type-${product.listing_type || 'item'}`).checked = true;
    updateCategoryOptions();
    productIdInput.value = id;
    document.getElementById('product-name').value = product.name;
    document.getElementById('product-price').value = product.price;
    document.getElementById('product-category').value = product.category || '';
    document.getElementById('product-description').value = product.description;
    document.getElementById('product-story').value = product.story || '';
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
            showMessage(dashboardMessage, 'Product deleted successfully.', false);
            fetchSellerProducts(auth.currentUser.uid);
        } catch (error) {
            showMessage(dashboardMessage, 'Failed to delete product.');
        }
    }
}