// =================================================================== //
//                                                                     //
//             KABALE ONLINE - GROUP CHAT SYSTEM                       //
//       GROUP DIRECTORY SCRIPT (group-list.js)
//                                                                     //
// =================================================================== //

import { auth, db } from '../firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { 
    collection, 
    query, 
    orderBy, 
    onSnapshot, 
    addDoc, 
    serverTimestamp,
    doc,
    getDoc,
    updateDoc,
    arrayUnion,
    arrayRemove
} from "https/www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- DOM Elements ---
const authWall = document.getElementById('auth-wall');
const loadingSpinner = document.getElementById('loading-spinner');
const loginMessage = document.getElementById('login-message');
const groupsContent = document.getElementById('groups-content');

const myGroupsSection = document.getElementById('my-groups-section');
const myGroupsList = document.getElementById('my-groups-list');
const allGroupsList = document.getElementById('all-groups-list');
const groupsLoader = document.getElementById('groups-loader');
const noGroupsMessage = document.getElementById('no-groups-message');

// Search & Filter Elements
const searchBar = document.getElementById('search-bar');
const categoryFilters = document.getElementById('category-filters');

// Create Group Modal Elements
const createGroupBtn = document.getElementById('create-group-btn');
const modal = document.getElementById('create-group-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const createGroupForm = document.getElementById('create-group-form');
const createGroupSubmit = document.getElementById('create-group-submit');
const modalError = document.getElementById('modal-error');
const groupImageUploadArea = document.getElementById('group-image-upload-area');
const groupImageInput = document.getElementById('group-image-input');
const groupImagePreviewContainer = document.getElementById('group-image-preview-container');
const groupImageUploadIcon = document.getElementById('group-image-upload-icon');
const groupCategorySelect = document.getElementById('group-category');

// Follow Prompt Modal Elements
const followPromptModal = document.getElementById('follow-prompt-modal');
const closeFollowModalBtn = document.getElementById('close-follow-modal-btn');
const followModalCancelBtn = document.getElementById('follow-modal-cancel-btn');
const followModalConfirmBtn = document.getElementById('follow-modal-confirm-btn');

// --- Global State ---
let currentUser = null;
let followedGroups = []; // Array of group IDs the user follows
let groupImageFile = null; 
let allGroupsCache = []; // Caches all groups from Firestore
let currentSearchTerm = '';
let currentCategory = 'all';
let groupToFollow = null; // Stores the group ID for the follow prompt

// --- Auth Check ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        authWall.style.display = 'none';
        groupsContent.style.display = 'block';
        initializePage(user.uid);
    } else {
        currentUser = null;
        authWall.style.display = 'block';
        loadingSpinner.style.display = 'none';
        loginMessage.style.display = 'block';
        groupsContent.style.display = 'none';
    }
});

// --- Initialization ---
function initializePage(uid) {
    getUserProfile(uid);
    listenForAllGroups();
    setupModal();
    setupFilters();
}

async function getUserProfile(uid) {
    const userDocRef = doc(db, 'users', uid);
    onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
            followedGroups = doc.data().followedGroups || [];
        } else {
            followedGroups = [];
        }
        // Re-render the lists to update follow statuses
        renderFilteredGroups(); 
    });
}

// --- Data Fetching & Rendering ---
function listenForAllGroups() {
    const groupsRef = collection(db, "groups");
    const q = query(groupsRef, orderBy("createdAt", "desc"));

    onSnapshot(q, (snapshot) => {
        allGroupsCache = []; // Clear cache
        if (groupsLoader) groupsLoader.remove();

        snapshot.forEach((doc) => {
            allGroupsCache.push({ id: doc.id, ...doc.data() });
        });
        
        // Render the filtered list
        renderFilteredGroups();

    }, (error) => {
        console.error("Error fetching groups:", error);
        allGroupsList.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">Could not load groups. Check permissions.</p>';
    });
}

function renderFilteredGroups() {
    // Clear both lists
    allGroupsList.innerHTML = '';
    myGroupsList.innerHTML = ''; 

    // 1. Filter the cached groups
    const filteredGroups = allGroupsCache.filter(group => {
        const nameMatch = group.name.toLowerCase().includes(currentSearchTerm);
        const categoryMatch = currentCategory === 'all' || group.category === currentCategory;
        return nameMatch && categoryMatch;
    });

    if (filteredGroups.length === 0 && currentSearchTerm) {
        noGroupsMessage.textContent = `No groups found for "${currentSearchTerm}".`;
        noGroupsMessage.style.display = 'block';
    } else if (filteredGroups.length === 0) {
        noGroupsMessage.textContent = "No groups in this category yet.";
        noGroupsMessage.style.display = 'block';
    } else {
        noGroupsMessage.style.display = 'none';
    }

    // 2. Render the filtered groups
    filteredGroups.forEach((group) => {
        const isFollowed = followedGroups.includes(group.id);
        const groupCard = createGroupCard(group, isFollowed);
        
        if (isFollowed) {
            myGroupsList.appendChild(groupCard);
        } else {
            allGroupsList.appendChild(groupCard);
        }
    });
    
    // 3. Show/Hide "My Groups" section
    if (myGroupsList.innerHTML === '') {
        myGroupsSection.style.display = 'none';
    } else {
        myGroupsSection.style.display = 'block';
    }
}

// --- UI Creation ---
function createGroupCard(group, isFollowed) {
    // This is now a <div>, not an <a> tag, to handle the click logic
    const card = document.createElement('div');
    card.className = 'group-link';
    card.dataset.groupId = group.id; // Store ID for click logic

    let iconHtml = '';
    if (group.imageUrl) {
        iconHtml = `<img src="${group.imageUrl}" alt="${group.name}" class="group-icon-img">`;
    } else {
        const placeholder = (group.name || 'G').charAt(0).toUpperCase();
        iconHtml = `<div class="group-icon-placeholder">${placeholder}</div>`;
    }
    
    card.innerHTML = `
        <div class="group-icon-wrapper">
            ${iconHtml}
        </div>
        <div class="group-info">
            <h3>${group.name}</h3>
            <p>${group.description || 'No description'}</p>
        </div>
        <button class="follow-btn ${isFollowed ? 'followed' : ''}" data-group-id="${group.id}">
            ${isFollowed ? 'Following' : 'Follow'}
        </button>
    `;
    
    // Follow button logic
    const followBtn = card.querySelector('.follow-btn');
    followBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Stop the card click from firing
        handleFollowToggle(group.id, isFollowed);
    });

    // Card click logic (for "Follow to View")
    card.addEventListener('click', () => {
        if (isFollowed) {
            // If they follow, go to chat
            window.location.href = `chat.html?groupId=${group.id}`;
        } else {
            // If they don't follow, show the prompt
            groupToFollow = group.id;
            followPromptModal.classList.add('active');
        }
    });

    return card;
}

// --- Event Handlers ---

function setupFilters() {
    // Search bar listener
    searchBar.addEventListener('input', (e) => {
        currentSearchTerm = e.target.value.toLowerCase();
        renderFilteredGroups();
    });

    // Category filter listener
    categoryFilters.addEventListener('click', (e) => {
        if (e.target.classList.contains('category-btn')) {
            // Remove active class from all
            categoryFilters.querySelectorAll('.category-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            // Add active class to clicked button
            e.target.classList.add('active');
            // Update state and re-render
            currentCategory = e.target.dataset.category;
            renderFilteredGroups();
        }
    });
}

async function handleFollowToggle(groupId, isCurrentlyFollowed) {
    if (!currentUser) {
        alert("Please log in to follow groups.");
        return;
    }
    
    const userDocRef = doc(db, 'users', currentUser.uid);
    const groupDocRef = doc(db, 'groups', groupId);
    const operation = isCurrentlyFollowed ? arrayRemove : arrayUnion;

    try {
        await updateDoc(userDocRef, {
            followedGroups: operation(groupId)
        });
        await updateDoc(groupDocRef, {
            members: operation(currentUser.uid)
        });
    } catch (error) {
        console.error("Error updating follow status:", error);
    }
}

// --- Modal Logic ---
function setupModal() {
    // --- Create Group Modal ---
    createGroupBtn.addEventListener('click', () => modal.classList.add('active'));
    closeModalBtn.addEventListener('click', () => modal.classList.remove('active'));
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
    });
    groupImageUploadArea.addEventListener('click', () => groupImageInput.click());
    groupImageInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) handleFilePreview(e.target.files[0]);
    });

    // --- "Follow Prompt" Modal ---
    const closeFollowModal = () => followPromptModal.classList.remove('active');
    closeFollowModalBtn.addEventListener('click', closeFollowModal);
    followModalCancelBtn.addEventListener('click', closeFollowModal);

    followModalConfirmBtn.addEventListener('click', async () => {
        if (groupToFollow) {
            followModalConfirmBtn.disabled = true;
            await handleFollowToggle(groupToFollow, false);
            followModalConfirmBtn.disabled = false;
            groupToFollow = null;
            closeFollowModal();
        }
    });

    // --- Create Group Form Logic ---
    createGroupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentUser) return;
        
        const groupName = document.getElementById('group-name').value.trim();
        const groupDesc = document.getElementById('group-description').value.trim();
        const groupCategory = groupCategorySelect.value; // Get category

        if (!groupName || !groupCategory) {
            modalError.textContent = "Please enter a name and select a category.";
            modalError.style.display = 'block';
            return;
        }
        
        createGroupSubmit.disabled = true;
        createGroupSubmit.textContent = "Creating...";
        modalError.style.display = 'none';

        try {
            let imageUrl = null; 

            if (groupImageFile) {
                createGroupSubmit.textContent = "Uploading image...";
                imageUrl = await uploadImageToCloudinary(groupImageFile);
            }

            createGroupSubmit.textContent = "Saving group...";

            const newGroupRef = await addDoc(collection(db, "groups"), {
                name: groupName,
                description: groupDesc,
                category: groupCategory, // Save category
                imageUrl: imageUrl, 
                isPublic: true,
                createdAt: serverTimestamp(),
                createdBy: currentUser.uid,
                members: [currentUser.uid] // Creator is the first member
            });
            
            const userDocRef = doc(db, 'users', currentUser.uid);
            await updateDoc(userDocRef, {
                followedGroups: arrayUnion(newGroupRef.id)
            });
            
            modal.classList.remove('active');
            createGroupForm.reset();
            removeFile(); 
            
        } catch (error) {
            console.error("Error creating group:", error);
            modalError.textContent = error.message || "Could not create group. Please try again.";
            modalError.style.display = 'block';
        } finally {
            createGroupSubmit.disabled = false;
            createGroupSubmit.textContent = "Create Group";
        }
    });
}

// --- Image Upload Logic ---
async function uploadImageToCloudinary(file) {
    try {
        const response = await fetch('/.netlify/functions/generate-group-signature');
        if (!response.ok) throw new Error('Could not get upload signature.');
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

function handleFilePreview(file) {
    groupImageFile = file; 
    
    const reader = new FileReader();
    reader.onload = (e) => {
        groupImagePreviewContainer.innerHTML = `
            <div class="image-preview-wrapper">
                <img src="${e.target.result}" alt="Image preview" class="image-preview-img">
                <button type="button" class="remove-image-btn" id="remove-group-image-btn">&times;</button>
            </div>
        `;
        groupImageUploadIcon.style.display = 'none';
        
        document.getElementById('remove-group-image-btn').addEventListener('click', (e) => {
            e.stopPropagation(); 
            removeFile();
        });
    };
    reader.readAsDataURL(file);
}

function removeFile() {
    groupImageFile = null;
    groupImageInput.value = null; 
    groupImagePreviewContainer.innerHTML = ''; 
    groupImageUploadIcon.style.display = 'block';
}