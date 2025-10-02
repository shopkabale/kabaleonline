import { auth, db } from '../js/auth.js';
import { doc, getDoc, addDoc, updateDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { showMessage, toggleLoading, normalizeWhatsAppNumber, getCloudinaryTransformedUrl } from '../js/shared.js';

// --- DOM ELEMENTS ---
const productForm = document.getElementById('product-form');
const productIdInput = document.getElementById('productId');
const submitBtn = document.getElementById('submit-btn');
const categorySelect = document.getElementById('product-category');
const messageEl = document.getElementById('product-form-message');

// --- DATA & STATE ---
const itemCategories = { "Electronics": "Electronics", "Clothing & Apparel": "Clothing & Apparel", "Home & Furniture": "Home & Furniture", "Health & Beauty": "Health & Beauty", "Vehicles": "Vehicles", "Property": "Property", "Other": "Other" };
let editingProductId = null;

// --- FUNCTIONS ---

function updateCategoryOptions() {
    categorySelect.innerHTML = '<option value="" disabled selected>-- Select a Category --</option>';
    for (const key in itemCategories) {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = itemCategories[key];
        categorySelect.appendChild(option);
    }
}

async function uploadImageToCloudinary(file) {
    try {
        const response = await fetch('/.netlify/functions/generate-signature');
        if (!response.ok) throw new Error('Failed to get signature.');
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
    } catch (error) {
        console.error("Cloudinary upload error:", error);
        throw error;
    }
}

async function populateFormForEdit(productId) {
    try {
        const productRef = doc(db, 'products', productId);
        const docSnap = await getDoc(productRef);
        if (docSnap.exists() && docSnap.data().sellerId === auth.currentUser.uid) {
            const product = docSnap.data();
            productIdInput.value = productId;
            document.getElementById('product-name').value = product.name;
            document.getElementById('product-price').value = product.price;
            document.getElementById('product-category').value = product.category || '';
            document.getElementById('product-description').value = product.description;
            document.getElementById('product-story').value = product.story || '';
            const localNumber = product.whatsapp.startsWith('256') ? '0' + product.whatsapp.substring(3) : product.whatsapp;
            document.getElementById('whatsapp-number').value = localNumber;
            submitBtn.textContent = 'Update Item';
        } else {
            showMessage(messageEl, 'Product not found or you do not have permission to edit it.', true);
        }
    } catch (error) {
        showMessage(messageEl, 'Failed to load product data for editing.', true);
    }
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    updateCategoryOptions();
    const params = new URLSearchParams(window.location.search);
    editingProductId = params.get('editId');
    if (editingProductId) {
        // Wait for auth to be ready before populating
        auth.onAuthStateChanged((user) => {
            if (user) {
                populateFormForEdit(editingProductId);
            }
        });
    }
});

// --- FORM SUBMISSION LOGIC ---
productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    toggleLoading(submitBtn, true, editingProductId ? 'Updating...' : 'Submitting...');

    try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        const userData = userDoc.exists() ? userDoc.data() : {};
        
        const productName = document.getElementById('product-name').value;
        const imageFile1 = document.getElementById('product-image-1').files[0];
        const imageFile2 = document.getElementById('product-image-2').files[0];

        let finalImageUrls = [];
        if (editingProductId) {
            const docSnap = await getDoc(doc(db, 'products', editingProductId));
            if (docSnap.exists()) finalImageUrls = docSnap.data().imageUrls || [];
        }
        
        const filesToUpload = [imageFile1, imageFile2].filter(f => f);
        if (filesToUpload.length > 0) {
            finalImageUrls = await Promise.all(filesToUpload.map(f => uploadImageToCloudinary(f)));
        }

        if (finalImageUrls.length === 0 && !editingProductId) {
            throw new Error('At least one image is required for a new listing.');
        }

        const productData = {
            listing_type: 'item',
            name: productName,
            name_lowercase: productName.toLowerCase(),
            price: Number(document.getElementById('product-price').value),
            category: document.getElementById('product-category').value,
            description: document.getElementById('product-description').value,
            story: document.getElementById('product-story').value,
            whatsapp: normalizeWhatsAppNumber(document.getElementById('whatsapp-number').value),
            sellerId: user.uid,
            sellerEmail: user.email,
            sellerName: userData.name || user.email,
            sellerIsVerified: userData.isVerified || false,
            sellerBadges: userData.badges || []
        };
        if (finalImageUrls.length > 0) productData.imageUrls = finalImageUrls;

        if (editingProductId) {
            await updateDoc(doc(db, 'products', editingProductId), { ...productData, updatedAt: serverTimestamp() });
        } else {
            // This is a NEW product being created
            await addDoc(collection(db, 'products'), { ...productData, createdAt: serverTimestamp(), isDeal: false, isSold: false });

            // --- SECURE REFERRAL VALIDATION LOGIC ---
            // After a new product is successfully created, check if a referral request needs to be made.
            if (userData.referrerId && !userData.referralValidationRequested) {
                // This user was referred and has not had a request created for them yet.
                
                const referrerDoc = await getDoc(doc(db, 'users', userData.referrerId));
                
                // Now that they've uploaded a product with an image, create the request for the admin.
                await addDoc(collection(db, "referralValidationRequests"), {
                    referrerId: userData.referrerId,
                    referrerEmail: referrerDoc.exists() ? referrerDoc.data().email : 'N/A',
                    referredUserId: user.uid,
                    referredUserName: userData.name,
                    status: "pending",
                    createdAt: serverTimestamp()
                });

                // Mark the user so they only trigger this referral request once.
                await updateDoc(userDocRef, { referralValidationRequested: true });
            }
            // --- END OF REFERRAL LOGIC ---
        }

        fetch('/.netlify/functions/syncToAlgolia').catch(err => console.error("Error triggering Algolia sync:", err));
        
        showMessage(messageEl, 'Success! Your listing is live!', false);
        productForm.reset();
        setTimeout(() => { window.location.href = '/products/'; }, 2000);

    } catch (error) {
        console.error("Error submitting product:", error);
        showMessage(messageEl, `Oops! Failed to submit: ${error.message} ❌`, true);
    } finally {
        toggleLoading(submitBtn, false, editingProductId ? 'Update Item' : 'Add Product');
    }
});