import { auth, db } from '../js/auth.js';
import { doc, getDoc, addDoc, updateDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { showMessage, toggleLoading, normalizeWhatsAppNumber, getCloudinaryTransformedUrl } from '../js/shared.js';

// --- DOM ELEMENTS ---
const productForm = document.getElementById('product-form');
const productIdInput = document.getElementById('productId');
const submitBtn = document.getElementById('submit-btn');
const messageEl = document.getElementById('product-form-message');

// --- NEW FORM-SWITCHING ELEMENTS ---
const formTypeRadios = document.querySelectorAll('input[name="listing_category_type"]');
const productFieldsContainer = document.getElementById('product-fields-container');
const serviceFieldsContainer = document.getElementById('service-fields-container');
const productCategorySelect = document.getElementById('product-category');
const serviceCategorySelect = document.getElementById('service-category');

// --- DATA & STATE ---
const productCategories = { 
    "Electronics": "Electronics", 
    "Clothing & Apparel": "Clothing & Apparel", 
    "Home & Furniture": "Home & Furniture", 
    "Health & Beauty": "Health & Beauty", 
    "Vehicles": "Vehicles", 
    "Property": "Property",
    "Textbooks": "Textbooks",
    "Other": "Other" 
};

// --- NEW: SERVICE CATEGORIES ---
const serviceCategories = {
    "Tutoring & Academics": "Tutoring & Academics",
    "Design & Creative": "Design & Creative",
    "Writing & Translation": "Writing & Translation",
    "Tech & Programming": "Tech & Programming",
    "Repairs & Technicians": "Repairs & Technicians",
    "Events & Photography": "Events & Photography",
    "Health & Wellness": "Health & Wellness",
    "Home & Errands": "Home & Errands",
    "Other Services": "Other Services"
};

let editingProductId = null;
let currentFormType = null; // 'product' or 'service'

// --- FUNCTIONS ---

/**
 * Populates a <select> dropdown with category options.
 * @param {object} categories The category object (productCategories or serviceCategories)
 * @param {HTMLElement} selectElement The <select> element to populate
 */
function updateCategoryOptions(categories, selectElement) {
    if (!selectElement) return;
    selectElement.innerHTML = '<option value="" disabled selected>-- Select a Category --</option>';
    for (const key in categories) {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = categories[key];
        selectElement.appendChild(option);
    }
}

/**
 * Toggles the 'required' attribute on all inputs within a container.
 * @param {HTMLElement} container The container to toggle
 * @param {boolean} isRequired Set to true to add 'required', false to remove
 */
function toggleRequiredFields(container, isRequired) {
    if (!container) return;
    const inputs = container.querySelectorAll('input[data-required], textarea[data-required], select[data-required]');
    inputs.forEach(input => {
        input.required = isRequired;
    });
}

/**
 * Handles the logic when a user switches between 'Product' and 'Service'
 */
function handleFormTypeChange(event) {
    currentFormType = event.target.value;
    
    if (currentFormType === 'product') {
        // 1. Show/Hide containers
        productFieldsContainer.style.display = 'block';
        serviceFieldsContainer.style.display = 'none';

        // 2. Populate correct categories
        updateCategoryOptions(productCategories, productCategorySelect);

        // 3. Set 'required' attributes
        toggleRequiredFields(productFieldsContainer, true);
        toggleRequiredFields(serviceFieldsContainer, false);

        // 4. Update button text
        submitBtn.textContent = 'Upload Product';

    } else if (currentFormType === 'service') {
        // 1. Show/Hide containers
        productFieldsContainer.style.display = 'none';
        serviceFieldsContainer.style.display = 'block';

        // 2. Populate correct categories
        updateCategoryOptions(serviceCategories, serviceCategorySelect);

        // 3. Set 'required' attributes
        toggleRequiredFields(productFieldsContainer, false);
        toggleRequiredFields(serviceFieldsContainer, true);

        // 4. Update button text
        submitBtn.textContent = 'Upload Service';
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
    // This function needs to be more robust to handle loading EITHER a product or service
    try {
        const productRef = doc(db, 'products', productId);
        const docSnap = await getDoc(productRef);
        if (!docSnap.exists() || docSnap.data().sellerId !== auth.currentUser.uid) {
            showMessage(messageEl, 'Item not found or you do not have permission to edit it.', true);
            return;
        }

        const product = docSnap.data();
        productIdInput.value = productId;

        // Determine if it's a product or service
        const formType = product.listing_type === 'service' ? 'service' : 'product';

        if (formType === 'product') {
            // 1. Set the main radio button and trigger the form change
            document.querySelector('input[name="listing_category_type"][value="product"]').checked = true;
            currentFormType = 'product';
            productFieldsContainer.style.display = 'block';
            serviceFieldsContainer.style.display = 'none';
            updateCategoryOptions(productCategories, productCategorySelect);
            toggleRequiredFields(productFieldsContainer, true);
            toggleRequiredFields(serviceFieldsContainer, false);

            // 2. Populate product fields
            document.getElementById('product-name').value = product.name;
            document.getElementById('product-price').value = product.price;
            document.getElementById('product-category').value = product.category || '';
            document.getElementById('product-quantity').value = product.quantity || 1;
            document.getElementById('product-location').value = product.location || '';
            document.getElementById('product-description').value = product.description;
            document.getElementById('product-story').value = product.story || '';
            document.getElementById('product-whatsapp').value = normalizeWhatsAppNumber(product.whatsapp, true);
            document.querySelector(`input[name="listing-type"][value="${product.listing_type || 'sale'}"]`).checked = true;
            document.querySelector(`input[name="condition"][value="${product.condition || 'new'}"]`).checked = true;

        } else if (formType === 'service') {
            // 1. Set the main radio button and trigger the form change
            document.querySelector('input[name="listing_category_type"][value="service"]').checked = true;
            currentFormType = 'service';
            productFieldsContainer.style.display = 'none';
            serviceFieldsContainer.style.display = 'block';
            updateCategoryOptions(serviceCategories, serviceCategorySelect);
            toggleRequiredFields(productFieldsContainer, false);
            toggleRequiredFields(serviceFieldsContainer, true);
            
            // 2. Populate service fields
            document.getElementById('service-name').value = product.name;
            document.getElementById('service-price').value = product.price;
            document.getElementById('service-price-type').value = product.service_duration || '';
            document.getElementById('service-category').value = product.category || '';
            document.getElementById('service-description').value = product.description;
            document.getElementById('service-story').value = product.story || '';
            document.getElementById('service-whatsapp').value = normalizeWhatsAppNumber(product.whatsapp, true);
            document.querySelector(`input[name="service-location-type"][value="${product.service_location_type || 'Online'}"]`).checked = true;
            document.getElementById('service-availability').value = product.service_availability || '';
        }

        // Disable the top radio buttons so user can't switch types during an edit
        formTypeRadios.forEach(radio => radio.disabled = true);
        document.querySelector('.product-type-selection').style.opacity = '0.7';
        document.querySelector('.product-type-selection h2').textContent = "Editing Listing (Type cannot be changed)";


        submitBtn.textContent = 'Update Item';
    } catch (error) {
        showMessage(messageEl, 'Failed to load item data for editing.', true);
        console.error("Edit load error:", error);
    }
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Listen for changes on the main type radio buttons
    formTypeRadios.forEach(radio => {
        radio.addEventListener('change', handleFormTypeChange);
    });

    // 2. Check if we are editing
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
    if (!currentFormType) {
        showMessage(messageEl, 'Please select a listing type (Product or Service) first.', true);
        return;
    }

    toggleLoading(submitBtn, true, editingProductId ? 'Updating...' : 'Submitting...');

    try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        const userData = userDoc.exists() ? userDoc.data() : {};

        let productData = {};
        let filesToUpload = [];

        // --- GATHER DATA BASED ON FORM TYPE ---
        if (currentFormType === 'product') {
            const productName = document.getElementById('product-name').value;
            filesToUpload = [
                document.getElementById('product-image-1').files[0],
                document.getElementById('product-image-2').files[0]
            ].filter(f => f);

            productData = {
                listing_type: document.querySelector('input[name="listing-type"]:checked').value, // 'sale' or 'rent'
                condition: document.querySelector('input[name="condition"]:checked').value, // 'new' or 'used'
                location: document.getElementById('product-location').value || '',
                name: productName,
                name_lowercase: productName.toLowerCase(),
                price: Number(document.getElementById('product-price').value),
                quantity: Number(document.getElementById('product-quantity').value) || 1,
                category: document.getElementById('product-category').value,
                description: document.getElementById('product-description').value,
                story: document.getElementById('product-story').value,
                whatsapp: normalizeWhatsAppNumber(document.getElementById('product-whatsapp').value),
            };

        } else if (currentFormType === 'service') {
            const serviceName = document.getElementById('service-name').value;
            filesToUpload = [
                document.getElementById('service-image-1').files[0],
                document.getElementById('service-image-2').files[0]
            ].filter(f => f);

            productData = {
                listing_type: "service", // <-- THIS IS THE CRUCIAL FIX
                name: serviceName,
                name_lowercase: serviceName.toLowerCase(),
                price: Number(document.getElementById('service-price').value),
                category: document.getElementById('service-category').value,
                description: document.getElementById('service-description').value,
                story: document.getElementById('service-story').value,
                whatsapp: normalizeWhatsAppNumber(document.getElementById('service-whatsapp').value),
                
                // Service-specific fields
                service_duration: document.getElementById('service-price-type').value || '',
                service_location_type: document.querySelector('input[name="service-location-type"]:checked').value,
                service_availability: document.getElementById('service-availability').value || '',
                
                // Set defaults for fields that don't apply
                quantity: 1,
                condition: 'new',
                location: '',
            };
        }

        // --- Common data for all types ---
        productData.sellerId = user.uid;
        productData.sellerEmail = user.email;
        productData.sellerName = userData.name || user.email;
        productData.sellerIsVerified = userData.isVerified || false;
        productData.sellerBadges = userData.badges || [];

        // --- Handle Image Uploads ---
        let finalImageUrls = [];
        if (editingProductId) {
            const docSnap = await getDoc(doc(db, 'products', editingProductId));
            if (docSnap.exists()) finalImageUrls = docSnap.data().imageUrls || [];
        }

        if (filesToUpload.length > 0) {
            finalImageUrls = await Promise.all(filesToUpload.map(f => uploadImageToCloudinary(f)));
        }

        if (finalImageUrls.length === 0 && !editingProductId) {
            throw new Error('At least one image is required for a new listing.');
        }
        if (finalImageUrls.length > 0) {
            productData.imageUrls = finalImageUrls;
        }

        // --- Save to Firestore and Sync to Algolia ---
        let docId; 
        if (editingProductId) {
            await updateDoc(doc(db, 'products', editingProductId), { ...productData, updatedAt: serverTimestamp() });
            docId = editingProductId;
        } else {
            const newDocRef = await addDoc(collection(db, 'products'), { ...productData, createdAt: serverTimestamp(), isDeal: false, isSold: false });
            docId = newDocRef.id;

            // Referral logic (only for new listings)
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

        // --- NEW, FAST ALGOLIA SYNC ---
        if (docId) {
            fetch('/.netlify/functions/syncToAlgolia', { 
                method: 'POST',
                body: JSON.stringify({ action: 'update', objectID: docId })
            }).catch(err => console.error("Error triggering single sync:", err));
        }
        // --- END ALGOLIA SYNC ---

        showMessage(messageEl, 'Success! Your listing is live!', false);
        productForm.reset();
        
        // Hide both containers
        productFieldsContainer.style.display = 'none';
        serviceFieldsContainer.style.display = 'none';
        // Re-enable radio buttons
        formTypeRadios.forEach(radio => radio.disabled = false);
        document.querySelector('.product-type-selection').style.opacity = '1';

        setTimeout(() => { window.location.href = '/dashboard/'; }, 2000); // Redirect to dashboard

    } catch (error) {
        console.error("Error submitting product:", error);
        showMessage(messageEl, `Oops! Failed to submit: ${error.message} ❌`, true);
    } finally {
        toggleLoading(submitBtn, false, editingProductId ? 'Update Item' : 'Add Product');
    }
});