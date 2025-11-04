import { auth, db } from '../js/auth.js';
import { doc, getDoc, addDoc, updateDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { showMessage, toggleLoading, normalizeWhatsAppNumber, getCloudinaryTransformedUrl } from '../js/shared.js';

// --- DOM ELEMENTS ---
const productForm = document.getElementById('product-form');
const productIdInput = document.getElementById('productId');
const submitBtn = document.getElementById('submit-btn');
const categorySelect = document.getElementById('product-category');
const messageEl = document.getElementById('product-form-message');
const serviceFieldsContainer = document.getElementById('service-fields-container'); // <-- ADDED

// --- DATA & STATE ---
const itemCategories = { 
    "Electronics": "Electronics", 
    "Clothing & Apparel": "Clothing & Apparel", 
    "Home & Furniture": "Home & Furniture", 
    "Health & Beauty": "Health & Beauty", 
    "Vehicles": "Vehicles", 
    "Property": "Property",
    "Services": "Services", // <-- ADDED
    "Other": "Other" 
};
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
            document.getElementById('product-quantity').value = product.quantity || 1;
            const localNumber = product.whatsapp.startsWith('256') ? '0' + product.whatsapp.substring(3) : product.whatsapp;
            document.getElementById('whatsapp-number').value = localNumber;
            document.getElementById('product-location').value = product.location || ''; 

            if (product.listing_type === 'rent') {
                document.getElementById('type-rent').checked = true;
            } else {
                document.getElementById('type-sale').checked = true;
            }

            if (product.condition === 'used') {
                document.getElementById('condition-used').checked = true;
            } else {
                document.getElementById('condition-new').checked = true;
            }

            // --- NEW: Populate service fields if it's a service ---
            if (product.category === 'Services') {
                serviceFieldsContainer.style.display = 'block'; // Show the fields
                document.getElementById('service-duration').value = product.service_duration || '';
                document.getElementById('service-availability').value = product.service_availability || '';
                
                // Set service location radio
                const serviceLocationType = product.service_location_type || 'Online';
                if(document.getElementById(`service-location-${serviceLocationType.toLowerCase()}`)) {
                    document.getElementById(`service-location-${serviceLocationType.toLowerCase()}`).checked = true;
                }
            }
            // --- END NEW ---

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

    // --- NEW: Add event listener to show/hide service fields ---
    categorySelect.addEventListener('change', () => {
        if (categorySelect.value === 'Services') {
            serviceFieldsContainer.style.display = 'block';
        } else {
            serviceFieldsContainer.style.display = 'none';
        }
    });
    // --- END NEW ---

    const params = new URLSearchParams(window.location.search);
    editingProductId = params.get('editId');
    if (editingProductId) {
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

        const listingType = document.querySelector('input[name="listing-type"]:checked').value;
        const condition = document.querySelector('input[name="condition"]:checked').value;
        const location = document.getElementById('product-location').value || '';
        const selectedCategory = document.getElementById('product-category').value; // Get category

        // --- MODIFIED: Add new fields to productData object ---
        const productData = {
            listing_type: listingType,
            condition: condition,
            location: location,
            name: productName,
            name_lowercase: productName.toLowerCase(),
            price: Number(document.getElementById('product-price').value),
            quantity: Number(document.getElementById('product-quantity').value) || 1,
            category: selectedCategory, // Use the variable
            description: document.getElementById('product-description').value,
            story: document.getElementById('product-story').value,
            whatsapp: normalizeWhatsAppNumber(document.getElementById('whatsapp-number').value),
            sellerId: user.uid,
            sellerEmail: user.email,
            sellerName: userData.name || user.email,
            sellerIsVerified: userData.isVerified || false,
            sellerBadges: userData.badges || []
        };
        // --- END MODIFICATION ---

        // --- NEW: Add service-specific data if it's a service ---
        if (selectedCategory === 'Services') {
            productData.service_duration = document.getElementById('service-duration').value || '';
            productData.service_location_type = document.querySelector('input[name="service-location-type"]:checked')?.value || 'Online';
            productData.service_availability = document.getElementById('service-availability').value || '';
            
            // Optional: You might want to override/hide quantity for services
            productData.quantity = 1; 
        }
        // --- END NEW ---

        if (finalImageUrls.length > 0) productData.imageUrls = finalImageUrls;

        if (editingProductId) {
            await updateDoc(doc(db, 'products', editingProductId), { ...productData, updatedAt: serverTimestamp() });
        } else {
            await addDoc(collection(db, 'products'), { ...productData, createdAt: serverTimestamp(), isDeal: false, isSold: false });

            // Referral logic remains the same
            if (userData.referrerId && !userData.referralValidationRequested) {
                const referrerDoc = await getDoc(doc(db, 'users', userData.referrerId));
                await addDoc(collection(db, "referralValidationRequests"), {
                    referrerId: userData.referrerId,
                    referrerEmail: referrerDoc.exists() ? referrerDoc.data().email : 'N/A',
                    referredUserId: user.uid,
                    referredUserName: userData.name,
                    status: "pending",
                    createdAt: serverTimestamp()
                });
                await updateDoc(userDocRef, { referralValidationRequested: true });
            }
        }

        fetch('/.netlify/functions/syncToAlgolia').catch(err => console.error("Error triggering Algolia sync:", err));

        showMessage(messageEl, 'Success! Your listing is live!', false);
        productForm.reset();
        
        // --- NEW: Also hide service fields on reset ---
        serviceFieldsContainer.style.display = 'none';
        // --- END NEW ---

        setTimeout(() => { window.location.href = '/products/'; }, 2000);

    } catch (error) {
        console.error("Error submitting product:", error);
        showMessage(messageEl, `Oops! Failed to submit: ${error.message} ❌`, true);
    } finally {
        toggleLoading(submitBtn, false, editingProductId ? 'Update Item' : 'Add Product');
    }
});