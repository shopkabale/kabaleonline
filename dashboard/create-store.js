// Import from your *existing* firebase.js file
// We use ../ because we are in a 'dashboard' folder
import { 
    db, 
    auth, 
    onAuthStateChanged,
    doc,
    getDoc,
    setDoc,
    collection,
    query,
    where,
    getDocs
} from '../firebase.js';

// --- UI Elements ---
const formContainer = document.getElementById('form-container');
const loadingSpinner = document.getElementById('loading-spinner');
const storeForm = document.getElementById('storeForm');
const messageBox = document.getElementById('messageBox');
const storeUsername = document.getElementById('storeUsername');
const storeName = document.getElementById('storeName');
const storeDescription = document.getElementById('storeDescription');
const storeWhatsapp = document.getElementById('storeWhatsapp');
const saveButton = document.getElementById('saveButton');
const saveButtonText = document.getElementById('saveButtonText');
const saveButtonSpinner = document.getElementById('saveButtonSpinner');
const userIdDisplay = document.getElementById('userIdDisplay');

let currentUserId = null;
let currentUserDocRef = null;

// --- Authentication ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUserId = user.uid;
        userIdDisplay.textContent = `Your Seller ID: ${currentUserId}`;
        currentUserDocRef = doc(db, 'users', currentUserId);
        await loadStoreData();
    } else {
        loadingSpinner.classList.add('hidden');
        showMessage('You must be logged in to manage your store.', 'error');
        storeForm.querySelectorAll('input, textarea, button').forEach(el => el.disabled = true);
    }
});

// --- Load Existing Store Data ---
async function loadStoreData() {
    if (!currentUserDocRef) return;
    try {
        const userDoc = await getDoc(currentUserDocRef);
        if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // Pre-fill form if store data exists
            if (userData.store) {
                storeUsername.value = userData.store.username || '';
                storeName.value = userData.store.storeName || '';
                storeDescription.value = userData.store.storeDescription || userData.bio || ''; // Fallback to bio
                storeWhatsapp.value = userData.store.storeWhatsapp || userData.whatsapp || ''; // Fallback to main whatsapp
            } else {
                // Pre-fill from root document for first-time setup
                storeDescription.value = userData.bio || '';
                storeWhatsapp.value = userData.whatsapp || '';
            }
        }
    } catch (error) {
        console.error('Error loading store data:', error);
        showMessage('Error loading your store details.', 'error');
    } finally {
        loadingSpinner.classList.add('hidden');
        formContainer.classList.remove('hidden');
    }
}

// --- Form Submission Logic ---
storeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUserId) {
        showMessage('Error: You are not signed in.', 'error');
        return;
    }

    const newUsername = storeUsername.value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    const newStoreName = storeName.value.trim();
    const newStoreDesc = storeDescription.value.trim();
    const newWhatsapp = storeWhatsapp.value.trim();

    if (!newUsername || !newStoreName) {
        showMessage('Store Username and Store Name are required.', 'error');
        return;
    }
    
    storeUsername.value = newUsername; // Show sanitized version
    setButtonLoading(true);

    try {
        const userDoc = await getDoc(currentUserDocRef);
        const currentUsername = userDoc.exists() ? userDoc.data().store?.username : null;

        // --- 1. Check if username is unique (if it changed) ---
        if (newUsername !== currentUsername) {
            const q = query(collection(db, 'users'), where('store.username', '==', newUsername));
            const usernameSnapshot = await getDocs(q);
            if (!usernameSnapshot.empty) {
                showMessage('Error: This store username is already taken. Please choose another.', 'error');
                setButtonLoading(false);
                return;
            }
        }

        // --- 2. Username is unique, proceed to save ---
        const storeData = {
            username: newUsername,
            storeName: newStoreName,
            storeDescription: newStoreDesc,
            storeWhatsapp: newWhatsapp,
            // Add these when you add upload fields
            // storeLogoUrl: "...",
            // storeBannerUrl: "..."
        };

        // --- 3. Save to Firestore ---
        // Use setDoc with merge: true to update the 'user' document
        // without destroying existing fields like 'email', 'fullName', etc.
        await setDoc(currentUserDocRef, { 
            store: storeData,
            isSeller: true,
            // Also update the root fields for compatibility with your old `profile.js`
            bio: newStoreDesc, 
            whatsapp: newWhatsapp,
            name: newStoreName // Or keep `name` and `storeName` separate. Your choice.
        }, { merge: true }); // merge: true is CRITICAL!

        showMessage('Store updated successfully!', 'success');

    } catch (error) {
        console.error('Error saving store:', error);
        showMessage('An error occurred while saving. Please try again.', 'error');
    } finally {
        setButtonLoading(false);
    }
});

// --- Utility Functions ---
function setButtonLoading(isLoading) {
    saveButton.disabled = isLoading;
    saveButtonText.classList.toggle('hidden', isLoading);
    saveButtonSpinner.classList.toggle('hidden', !isLoading);
}

function showMessage(message, type = 'error') {
    messageBox.textContent = message;
    messageBox.className = type === 'error' ? 'p-4 rounded-lg bg-red-100 text-red-700' : 'p-4 rounded-lg bg-green-100 text-green-700';
}