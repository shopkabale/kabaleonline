import { auth, db } from '../firebase.js';
import {
    createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, sendEmailVerification
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { 
    collection, addDoc, query, getDocs, serverTimestamp, orderBy, where, doc, getDoc, updateDoc, deleteDoc, setDoc
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- ELEMENT SELECTION (All elements for this page) ---
const authContainer = document.getElementById('auth-container');
const dashboardContainer = document.getElementById('dashboard-container');
const sellerEmailSpan = document.getElementById('seller-email');
const logoutBtn = document.getElementById('logout-btn');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const loginErrorElement = document.getElementById('login-error');
const signupErrorElement = document.getElementById('signup-error');
const hostelPostForm = document.getElementById('hostel-post-form');
const publicHostelGrid = document.getElementById('hostel-grid-public');
const myHostelsGrid = document.getElementById('my-hostels-grid');
const showFormBtn = document.getElementById('show-hostel-form-btn');
const formContainer = document.getElementById('hostel-form-container');
const formMessage = document.getElementById('hostel-form-message');

let currentEditingHostelId = null;

// --- HELPER FUNCTIONS ---
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
    return cleaned;
}
async function uploadImageToCloudinary(file) {
    const response = await fetch('/.netlify/functions/generate-signature');
    if (!response.ok) throw new Error('Could not get upload signature.');
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

// --- AUTHENTICATION LOGIC ---
onAuthStateChanged(auth, async (user) => {
    if (user && user.emailVerified) {
        if (authContainer) authContainer.style.display = 'none';
        if (dashboardContainer) dashboardContainer.style.display = 'block';
        if (sellerEmailSpan) sellerEmailSpan.textContent = user.email;
        const contactDisplay = document.getElementById('landlord-contact-display');
        if (contactDisplay) {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists() && userDoc.data().whatsapp) {
                contactDisplay.textContent = `📞 0${userDoc.data().whatsapp.substring(3)}`;
            } else {
                contactDisplay.textContent = "No contact number in profile.";
            }
        }
        fetchMyHostels(user.uid);
    } else {
        if (authContainer) authContainer.style.display = 'block';
        if (dashboardContainer) dashboardContainer.style.display = 'none';
    }
});

if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const loginButton = loginForm.querySelector('button[type="submit"]');
        toggleLoading(loginButton, true, 'Logging In');
        signInWithEmailAndPassword(auth, email, password)
            .catch(error => { showMessage(loginErrorElement, 'Invalid email or password.'); })
            .finally(() => { toggleLoading(loginButton, false, 'Login'); });
    });
}

if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const whatsapp = document.getElementById('signup-whatsapp').value;
        const password = document.getElementById('signup-password').value;
        const signupButton = signupForm.querySelector('button[type="submit"]');
        toggleLoading(signupButton, true, 'Creating Account');
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            await setDoc(doc(db, "users", user.uid), {
                name, email, whatsapp: normalizeWhatsAppNumber(whatsapp),
                role: 'seller', createdAt: serverTimestamp()
            });
            await sendEmailVerification(user);
            alert("Success! Please check your email to verify your account.");
            signupForm.reset();
        } catch (error) {
            let msg = 'An error occurred.';
            if (error.code === 'auth/email-already-in-use') msg = 'This email is already registered.';
            showMessage(signupErrorElement, msg);
        } finally {
            toggleLoading(signupButton, false, 'Create Account');
        }
    });
}

if (logoutBtn) logoutBtn.addEventListener('click', () => signOut(auth));

// --- HOSTEL-SPECIFIC LOGIC ---
if (showFormBtn) {
    showFormBtn.addEventListener('click', () => {
        formContainer.style.display = formContainer.style.display === 'block' ? 'none' : 'block';
        showFormBtn.textContent = formContainer.style.display === 'block' ? 'Close Form' : 'Post New Hostel/Rental';
        if(formContainer.style.display === 'none') resetHostelForm();
    });
}

if (hostelPostForm) {
    hostelPostForm.addEventListener('submit', handleHostelSubmit);
}

async function handleHostelSubmit(e) {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;
    const submitBtn = hostelPostForm.querySelector('button[type="submit"]');
    toggleLoading(submitBtn, true, 'Submitting...');
    try {
        const name = document.getElementById('hostel-name').value;
        const location = document.getElementById('hostel-location').value;
        const price = document.getElementById('hostel-price').value;
        const term = document.getElementById('hostel-term').value;
        const description = document.getElementById('hostel-description').value;
        const imageFile1 = document.getElementById('hostel-image-1').files[0];
        const imageFile2 = document.getElementById('hostel-image-2').files[0];
        const amenities = { gate: document.getElementById('amenity-gate').checked, fence: document.getElementById('amenity-fence').checked, electricity: document.getElementById('amenity-electricity').checked, tiles: document.getElementById('amenity-tiles').checked, cement: document.getElementById('amenity-cement').checked, cameras: document.getElementById('amenity-cameras').checked };
        let imageUrls = [];
        if (currentEditingHostelId) {
            const docSnap = await getDoc(doc(db, 'hostels', currentEditingHostelId));
            if (docSnap.exists()) imageUrls = docSnap.data().imageUrls || [];
        }
        if (imageFile1) imageUrls[0] = await uploadImageToCloudinary(imageFile1);
        if (imageFile2) imageUrls[1] = await uploadImageToCloudinary(imageFile2);
        const hostelData = { name, location, description, amenities, imageUrls, price: Number(price), term, landlordId: user.uid, updatedAt: serverTimestamp() };
        if (currentEditingHostelId) {
            await updateDoc(doc(db, 'hostels', currentEditingHostelId), hostelData);
            showMessage(formMessage, "Hostel updated successfully!", false);
        } else {
            hostelData.createdAt = serverTimestamp();
            await addDoc(collection(db, 'hostels'), hostelData);
            showMessage(formMessage, "Hostel posted successfully!", false);
        }
        resetHostelForm();
        fetchMyHostels(user.uid);
        fetchPublicHostels();
    } catch (error) {
        showMessage(formMessage, `Error: ${error.message}`);
    } finally {
        toggleLoading(submitBtn, false, currentEditingHostelId ? "Update Listing" : "Submit Listing");
    }
}

async function fetchPublicHostels() {
    if (!publicHostelGrid) return;
    publicHostelGrid.innerHTML = '<p>Loading available hostels...</p>';
    const q = query(collection(db, 'hostels'), orderBy('createdAt', 'desc'));
    try {
        const querySnapshot = await getDocs(q);
        publicHostelGrid.innerHTML = '';
        if (querySnapshot.empty) {
            publicHostelGrid.innerHTML = '<p>No hostels posted yet.</p>';
            return;
        }
        querySnapshot.forEach((doc) => {
            const hostel = doc.data();
            const card = document.createElement('a');
            card.className = 'hostel-card';
            card.href = `details.html?id=${doc.id}`;
            const amenitiesHTML = Object.keys(hostel.amenities || {}).filter(key => hostel.amenities[key]).map(key => `<span><i class="fa-solid fa-check"></i> ${key.charAt(0).toUpperCase() + key.slice(1)}</span>`).join('');
            card.innerHTML = `<img src="${hostel.imageUrls && hostel.imageUrls.length > 0 ? hostel.imageUrls[0] : 'https://via.placeholder.com/400x250.png?text=No+Image'}" alt="${hostel.name}" class="hostel-card-image"><div class="hostel-card-content"><h3>${hostel.name}</h3><p class="hostel-card-location"><i class="fa-solid fa-location-dot"></i> ${hostel.location}</p><p class="hostel-card-price">UGX ${hostel.price.toLocaleString()} <span>/ ${hostel.term}</span></p><div class="hostel-card-amenities">${amenitiesHTML}</div></div>`;
            publicHostelGrid.appendChild(card);
        });
    } catch (error) {
        publicHostelGrid.innerHTML = '<p>Could not load hostels.</p>';
    }
}

async function fetchMyHostels(uid) {
    if (!myHostelsGrid || !uid) return;
    myHostelsGrid.innerHTML = '<p>Loading your listings...</p>';
    const q = query(collection(db, 'hostels'), where("landlordId", "==", uid), orderBy('createdAt', 'desc'));
    try {
        const querySnapshot = await getDocs(q);
        myHostelsGrid.innerHTML = '';
        if (querySnapshot.empty) {
            myHostelsGrid.innerHTML = '<p>You have not posted any hostels yet.</p>';
            return;
        }
        querySnapshot.forEach((doc) => {
            const hostel = doc.data();
            const card = document.createElement('div');
            card.className = 'hostel-card';
            card.innerHTML = `<img src="${hostel.imageUrls && hostel.imageUrls.length > 0 ? hostel.imageUrls[0] : 'https://via.placeholder.com/400x250.png?text=No+Image'}" alt="${hostel.name}" class="hostel-card-image"><div class="hostel-card-content"><h3>${hostel.name}</h3></div><div class="hostel-card-controls"><button class="edit-btn">Edit</button><button class="delete-btn">Delete</button></div>`;
            card.querySelector('.edit-btn').addEventListener('click', () => populateFormForEdit(doc.id, hostel));
            card.querySelector('.delete-btn').addEventListener('click', () => deleteHostel(doc.id));
            myHostelsGrid.appendChild(card);
        });
    } catch (error) {
        myHostelsGrid.innerHTML = '<p>Could not load your listings.</p>';
    }
}

function populateFormForEdit(id, hostel) {
    formContainer.style.display = 'block';
    showFormBtn.textContent = 'Close Form';
    window.scrollTo({ top: formContainer.offsetTop - 80, behavior: 'smooth' });
    currentEditingHostelId = id;
    document.getElementById('hostel-name').value = hostel.name || '';
    document.getElementById('hostel-location').value = hostel.location || '';
    document.getElementById('hostel-price').value = hostel.price || '';
    document.getElementById('hostel-term').value = hostel.term || 'Semester';
    document.getElementById('hostel-description').value = hostel.description || '';
    if (hostel.amenities) {
        for (const key in hostel.amenities) {
            const checkbox = document.getElementById(`amenity-${key}`);
            if (checkbox) checkbox.checked = hostel.amenities[key];
        }
    }
    hostelPostForm.querySelector('button[type="submit"]').textContent = "Update Listing";
}

async function deleteHostel(id) {
    if (!confirm("Are you sure you want to delete this hostel listing? This cannot be undone.")) return;
    try {
        await deleteDoc(doc(db, "hostels", id));
        showMessage(formMessage, "Hostel deleted successfully.", false);
        fetchMyHostels(auth.currentUser.uid);
        fetchPublicHostels();
    } catch (error) {
        showMessage(formMessage, "Could not delete hostel.");
    }
}

function resetHostelForm() {
    currentEditingHostelId = null;
    if(hostelPostForm) hostelPostForm.reset();
    if(formContainer) formContainer.style.display = 'none';
    if(showFormBtn) showFormBtn.textContent = "Post New Hostel/Rental";
    if(hostelPostForm) hostelPostForm.querySelector('button[type="submit"]').textContent = "Submit Listing";
}

// --- INITIAL LOAD ---
fetchPublicHostels();