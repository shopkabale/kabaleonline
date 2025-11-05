import { auth, db } from '../js/auth.js';
import { doc, getDoc, addDoc, updateDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
// We only need normalizeWhatsAppNumber from shared.js, as we define custom showMessage/toggleLoading
import { normalizeWhatsAppNumber } from '../js/shared.js';

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
// This will store file objects for upload
const filesToUpload = {
    'product-image-1': null,
    'product-image-2': null,
    'service-image-1': null,
    'service-image-2': null,
};

// --- FUNCTIONS ---

/**
 * Shows a styled message banner.
 * @param {HTMLElement} element The message element
 * @param {string} message The message to display
 * @param {'error' | 'success' | 'progress'} type The style of the message
 */
function showMessage(element, message, type = 'error') {
    if (!element) return;
    element.textContent = message;
    element.className = `form-message-banner show ${type}`; // Applies 'error', 'success', or 'progress'
    
    // Add appropriate icons for polite messages
    if (type === 'error') {
        element.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${message}`;
    } else if (type === 'success') {
        element.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${message}`;
    } else if (type === 'progress') {
        element.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${message}`;
    }
}

/**
 * Toggles the loading state of the submit button.
 * @param {HTMLElement} button The submit button
 * @param {boolean} isLoading True to show loading, false to hide
 * @param {string} loadingText Text to show when loading
 */
function toggleLoading(button, isLoading, loadingText = 'Submitting...') {
    if (!button) return;
    button.disabled = isLoading;
    if (isLoading) {
        button.innerHTML = `<span class="loading-spinner"></span> ${loadingText}`;
    } else {
        // Text will be reset by handleFormTypeChange or on page load
        if (currentFormType === 'product') {
            button.textContent = editingProductId ? 'Update Product' : 'Upload Product';
        } else if (currentFormType === 'service') {
            button.textContent = editingProductId ? 'Update Service' : 'Upload Service';
        } else {
            button.textContent = 'Please select a listing type';
            button.disabled = true;
        }
    }
}


/**
 * Populates a <select> dropdown with category options.
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
 */
function toggleRequiredFields(container, isRequired) {
    if (!container) return;
    // Note: The 'data-required' attribute must be on the inputs in the HTML
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
        productFieldsContainer.style.display = 'block';
        serviceFieldsContainer.style.display = 'none';
        updateCategoryOptions(productCategories, productCategorySelect);
        toggleRequiredFields(productFieldsContainer, true);
        toggleRequiredFields(serviceFieldsContainer, false);
        submitBtn.textContent = 'Upload Product';

    } else if (currentFormType === 'service') {
        productFieldsContainer.style.display = 'none';
        serviceFieldsContainer.style.display = 'block';
        updateCategoryOptions(serviceCategories, serviceCategorySelect);
        toggleRequiredFields(productFieldsContainer, false);
        toggleRequiredFields(serviceFieldsContainer, true);
        submitBtn.textContent = 'Upload Service';
    }
    submitBtn.disabled = false; // Enable submit button
    messageEl.className = 'form-message-banner'; // Hide any old messages
}

/**
 * Handles the custom file input click and preview.
 * @param {string} inputId The ID of the hidden file input
 * @param {File} file The file object
 */
function handleFilePreview(inputId, file) {
    const previewContainer = document.getElementById(`${inputId}-preview`);
    if (!previewContainer) return;

    // Store the file for upload
    filesToUpload[inputId] = file;

    const reader = new FileReader();
    reader.onload = (e) => {
        previewContainer.innerHTML = `
            <div class="image-preview-wrapper">
                <img src="${e.target.result}" alt="Image preview" class="image-preview-img">
                <button type="button" class="remove-image-btn" data-input="${inputId}">&times;</button>
            </div>
        `;
    };
    reader.readAsDataURL(file);
}

/**
 * Removes a file from the preview and the upload queue.
 * @param {string} inputId The ID of the hidden file input
 */
function removeFile(inputId) {
    filesToUpload[inputId] = null; // Clear the file
    document.getElementById(inputId).value = null; // Reset the file input
    const previewContainer = document.getElementById(`${inputId}-preview`);
    if (previewContainer) {
        previewContainer.innerHTML = ''; // Clear the preview
    }
}


async function uploadImageToCloudinary(file) {
    try {
        const response = await fetch('/.netlify/functions/generate-signature');
        if (!response.ok) throw new Error('Could not get upload signature. Please try again.');
        const { signature, timestamp, cloudname, apikey } = await response.json();
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('api_key', apikey);
        formData.append('timestamp', timestamp);
        formData.append('signature', signature);
        
        const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudname}/image/upload`;
        const uploadResponse = await fetch(uploadUrl, { method: 'POST', body: formData });
        
        if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json();
            throw new Error(`Cloudinary upload failed: ${errorData.error.message}`);
        }
        
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
        if (!docSnap.exists() || docSnap.data().sellerId !== auth.currentUser.uid) {
            showMessage(messageEl, 'Polite Error: The item you are trying to edit could not be found or you do not have permission to edit it.', 'error');
            return;
        }

        const product = docSnap.data();
        productIdInput.value = productId;

        // Determine if it's a product or service
        const formType = product.listing_type === 'service' ? 'service' : 'product';
        
        // Find and check the correct radio button
        const radioToSelect = document.querySelector(`input[name="listing_category_type"][value="${formType}"]`);
        if (radioToSelect) {
            radioToSelect.checked = true;
            // Manually trigger the event to show the correct form
            handleFormTypeChange({ target: radioToSelect });
        }

        if (formType === 'product') {
            // Populate product fields
            document.getElementById('product-name').value = product.name;
            document.getElementById('product-price').value = product.price;
            document.getElementById('product-category').value = product.category || '';
            document.getElementById('product-quantity').value = product.quantity || 1;
            document.getElementById('product-location').value = product.location || '';
            document.getElementById('product-description').value = product.description;
            document.getElementById('product-story').value = product.story || '';
            document.getElementById('product-whatsapp').value = normalizeWhatsAppNumber(product.whatsapp, true); // Assuming de-normalize
            document.querySelector(`input[name="listing-type"][value="${product.listing_type || 'sale'}"]`).checked = true;
            document.querySelector(`input[name="condition"][value="${product.condition || 'new'}"]`).checked = true;

        } else if (formType === 'service') {
            // Populate service fields
            document.getElementById('service-name').value = product.name;
            document.getElementById('service-price').value = product.price;
            document.getElementById('service-price-type').value = product.service_duration || '';
            document.getElementById('service-category').value = product.category || '';
            document.getElementById('service-description').value = product.description;
            document.getElementById('service-story').value = product.story || '';
            document.getElementById('service-whatsapp').value = normalizeWhatsAppNumber(product.whatsapp, true); // Assuming de-normalize
            document.querySelector(`input[name="service-location-type"][value="${product.service_location_type || 'Online'}"]`).checked = true;
            document.getElementById('service-availability').value = product.service_availability || '';
        }

        // Handle image previews for existing images
        if (product.imageUrls && product.imageUrls.length > 0) {
            const id1 = formType === 'product' ? 'product-image-1' : 'service-image-1';
            const previewContainer1 = document.getElementById(`${id1}-preview`);
            if (previewContainer1) {
                 previewContainer1.innerHTML = `
                    <div class="image-preview-wrapper">
                        <img src="${product.imageUrls[0]}" alt="Image preview" class="image-preview-img">
                        <small>Current Image 1. Upload new file to replace.</small>
                    </div>`;
            }
        }
         if (product.imageUrls && product.imageUrls.length > 1) {
            const id2 = formType === 'product' ? 'product-image-2' : 'service-image-2';
            const previewContainer2 = document.getElementById(`${id2}-preview`);
            if (previewContainer2) {
                 previewContainer2.innerHTML = `
                    <div class="image-preview-wrapper">
                        <img src="${product.imageUrls[1]}" alt="Image preview" class="image-preview-img">
                        <small>Current Image 2. Upload new file to replace.</small>
                    </div>`;
            }
        }


        // Disable the top radio buttons so user can't switch types during an edit
        formTypeRadios.forEach(radio => radio.disabled = true);
        document.querySelector('.product-type-selection').style.opacity = '0.7';
        document.querySelector('.product-type-selection h2').textContent = "Editing Listing (Type cannot be changed)";
        submitBtn.textContent = 'Update Item';

    } catch (error) {
        showMessage(messageEl, 'Polite Error: We had trouble loading your item data. Please refresh the page and try again.', 'error');
        console.error("Edit load error:", error);
    }
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Listen for changes on the main type radio buttons
    formTypeRadios.forEach(radio => {
        radio.addEventListener('change', handleFormTypeChange);
    });

    // 2. Set up custom file input listeners
    document.querySelectorAll('.file-upload-area').forEach(area => {
        area.addEventListener('click', () => {
            const inputId = area.dataset.input;
            document.getElementById(inputId).click();
        });
    });

    document.querySelectorAll('.hidden-file-input').forEach(input => {
        input.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                handleFilePreview(e.target.id, e.target.files[0]);
            }
        });
    });

    // 3. Set up preview removal listener (using event delegation)
    productForm.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-image-btn')) {
            const inputId = e.target.dataset.input;
            removeFile(inputId);
        }
    });

    // 4. Check if we are editing
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
    if (!user) {
        showMessage(messageEl, 'Polite Error: You must be logged in to upload an item. Please log in and try again.', 'error');
        return;
    }
    if (!currentFormType) {
        showMessage(messageEl, 'Polite Notice: Please select a listing type (Product or Service) first.', 'error');
        return;
    }

    toggleLoading(submitBtn, true, editingProductId ? 'Updating...' : 'Submitting...');
    showMessage(messageEl, 'Uploading... Please wait.', 'progress');

    try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        const userData = userDoc.exists() ? userDoc.data() : {};

        let productData = {};
        let activeFiles = [];

        // --- GATHER DATA BASED ON FORM TYPE ---
        if (currentFormType === 'product') {
            const productName = document.getElementById('product-name').value;
            activeFiles = [
                filesToUpload['product-image-1'],
                filesToUpload['product-image-2']
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
            activeFiles = [
                filesToUpload['service-image-1'],
                filesToUpload['service-image-2']
            ].filter(f => f);

            productData = {
                listing_type: "service", // <-- CRUCIAL FIX FOR ALGOLIA
                name: serviceName,
                name_lowercase: serviceName.toLowerCase(),
                price: Number(document.getElementById('service-price').value),
                category: document.getElementById('service-category').value,
                description: document.getElementById('service-description').value,
                story: document.getElementById('service-story').value,
                whatsapp: normalizeWhatsAppNumber(document.getElementById('service-whatsapp').value),
                
                service_duration: document.getElementById('service-price-type').value || '',
                service_location_type: document.querySelector('input[name="service-location-type"]:checked').value,
                service_availability: document.getElementById('service-availability').value || '',
                
                quantity: 1, // Default for Algolia compatibility
                condition: 'new', // Default for Algolia compatibility
                location: document.querySelector('input[name="service-location-type"]:checked').value, // Use 'Online' or 'On-site' for location
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

        if (activeFiles.length > 0) {
            showMessage(messageEl, 'Uploading images... (Step 1 of 2)', 'progress');
            finalImageUrls = await Promise.all(activeFiles.map(f => uploadImageToCloudinary(f)));
        }

        // Check for images *after* processing uploads, but only for new products
        if (finalImageUrls.length === 0 && !editingProductId) {
            throw new Error('At least one image is required for a new listing.');
        }
        if (finalImageUrls.length > 0) {
            productData.imageUrls = finalImageUrls;
        }

        // --- Save to Firestore and Sync to Algolia ---
        showMessage(messageEl, 'Saving your listing... (Step 2 of 2)', 'progress');
        let docId; 
        if (editingProductId) {
            await updateDoc(doc(db, 'products', editingProductId), { ...productData, updatedAt: serverTimestamp() });
            docId = editingProductId;
        } else {
            const newDocRef = await addDoc(collection(db, 'products'), { ...productData, createdAt: serverTimestamp(), isDeal: false, isSold: false });
            docId = newDocRef.id;

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

        showMessage(messageEl, 'Success! Your listing is live!', 'success');
        productForm.reset();
        
        // Clear previews
        document.querySelectorAll('.image-preview-container').forEach(c => c.innerHTML = '');
        
        // Hide both containers
        productFieldsContainer.style.display = 'none';
        serviceFieldsContainer.style.display = 'none';
        
        // Re-enable radio buttons
        formTypeRadios.forEach(radio => {
            radio.disabled = false;
            radio.checked = false;
        });
        document.querySelector('.product-type-selection').style.opacity = '1';
        toggleLoading(submitBtn, false); // This will set the disabled state and text correctly

        setTimeout(() => { 
            window.location.href = '/dashboard/'; 
        }, 2000); // Redirect to dashboard

    } catch (error) {
        console.error("Error submitting product:", error);
        // Provide polite, specific error messages
        let politeError = 'Oops! Something went wrong. Please try again.';
        if (error.message.includes('at least one image')) {
            politeError = 'Polite Error: Please upload at least one image for your listing.';
        } else if (error.message.includes('Cloudinary')) {
            politeError = 'Polite Error: We had trouble uploading your image. Please check your internet connection or try a different image.';
        } else if (error.message.includes('permission')) {
             politeError = 'Polite Error: You do not have permission to perform this action. Please log in again.';
        }
        
        showMessage(messageEl, politeError, 'error');
        toggleLoading(submitBtn, false); // Re-enable button on error
    }
});