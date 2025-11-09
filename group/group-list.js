// =================================================================== //
//                                                                     //
//             KABALE ONLINE - GROUP CHAT SYSTEM                       //
//       GROUP DIRECTORY SCRIPT (group-list.js) - *IMAGE UPDATE* //
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
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- DOM Elements ---
const authWall = document.getElementById('auth-wall');
const loadingSpinner = document.getElementById('loading-spinner');
const loginMessage = document.getElementById('login-message');
const groupsContent = document.getElementById('groups-content');

const myGroupsSection = document.getElementById('my-groups-section');
const myGroupsList = document.getElementById('my-groups-list');
const allGroupsList = document.getElementById('all-groups-list');
const groupsLoader = document.getElementById('groups-loader');
const createGroupBtn = document.getElementById('create-group-btn');
const modal = document.getElementById('create-group-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const createGroupForm = document.getElementById('create-group-form');
const createGroupSubmit = document.getElementById('create-group-submit');
const modalError = document.getElementById('modal-error');

// NEW: Group Image Upload Elements
const groupImageUploadArea = document.getElementById('group-image-upload-area');
const groupImageInput = document.getElementById('group-image-input');
const groupImagePreviewContainer = document.getElementById('group-image-preview-container');
const groupImageUploadIcon = document.getElementById('group-image-upload-icon');

let currentUser = null;
let followedGroups = []; // Array of group IDs the user follows
let groupImageFile = null; // NEW: Stores the file to be uploaded

// --- Auth Check (THIS IS THE NEW "LOGGING FIRST" LOGIC) ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is logged in!
        currentUser = user;
        // Hide the auth wall and show the real content
        authWall.style.display = 'block'; // Show auth wall first
        loadingSpinner.style.display = 'none'; // Hide spinner
        loginMessage.style.display = 'none'; // Hide message
        authWall.style.display = 'none'; // Then hide auth wall
        groupsContent.style.display = 'block'; // And show content
        
        // Now, load all the group functions
        initializePage(user.uid);
    } else {
        // User is not logged in.
        currentUser = null;
        // Show the auth wall and hide the loader
        authWall.style.display = 'block';
        loadingSpinner.style.display = 'none';
        loginMessage.style.display = 'block';
        
        // Hide the content
        groupsContent.style.display = 'none';
    }
});

// --- This function now only runs AFTER login is confirmed ---
function initializePage(uid) {
    // 1. Fetch user's profile to see what groups they follow
    getUserProfile(uid);
    
    // 2. Load all public groups
    listenForAllGroups();
    
    // 3. Set up the "Create Group" button and modal
    setupModal();
}

async function getUserProfile(uid) {
    const userDocRef = doc(db, 'users', uid);
    onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
            followedGroups = doc.data().followedGroups || [];
            if (followedGroups.length > 0) {
                myGroupsSection.style.display = 'block';
            } else {
                myGroupsSection.style.display = 'none';
            }
        }
        // Re-render the lists to update the button states
        listenForAllGroups(); 
    });
}

// --- Fetch and Display All Groups ---
function listenForAllGroups() {
    const groupsRef = collection(db, "groups");
    const q = query(groupsRef, orderBy("createdAt", "desc"));

    onSnapshot(q, (snapshot) => {
        allGroupsList.innerHTML = '';
        myGroupsList.innerHTML = ''; // Clear both lists
        
        if (groupsLoader) groupsLoader.remove();

        snapshot.forEach((doc) => {
            const group = { id: doc.id, ...doc.data() };
            const isFollowed = followedGroups.includes(group.id);
            
            // Render the group card in the correct section
            const groupCard = createGroupCard(group, isFollowed);
            
            if (isFollowed) {
                myGroupsList.appendChild(groupCard);
            } else {
                allGroupsList.appendChild(groupCard);
            }
        });
        
        // If "My Groups" is empty, hide it.
        if (myGroupsList.innerHTML === '') {
            myGroupsSection.style.display = 'none';
        } else {
            myGroupsSection.style.display = 'block';
        }

    }, (error) => {
        console.error("Error fetching groups:", error);
        allGroupsList.innerHTML = '<p>Could not load groups.</p>';
    });
}

// --- NEW: Create Group Card UI (Updated for Images) ---
function createGroupCard(group, isFollowed) {
    const link = document.createElement('a');
    link.href = `chat.html?groupId=${group.id}`;
    link.className = 'group-link';
    
    // Determine icon: Use image, or placeholder
    let iconHtml = '';
    if (group.imageUrl) {
        iconHtml = `<img src="${group.imageUrl}" alt="${group.name}" class="group-icon-img">`;
    } else {
        const placeholder = (group.name || 'G').charAt(0).toUpperCase();
        iconHtml = `<div class="group-icon-placeholder">${placeholder}</div>`;
    }
    
    link.innerHTML = `
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
    
    // Add click listener for the follow button
    const followBtn = link.querySelector('.follow-btn');
    followBtn.addEventListener('click', (e) => {
        e.preventDefault(); // Prevent link navigation
        handleFollowToggle(group.id, isFollowed);
    });

    return link;
}

// --- "Follow" Logic (This is your request) ---
async function handleFollowToggle(groupId, isCurrentlyFollowed) {
    if (!currentUser) {
        alert("Please log in to follow groups.");
        return;
    }
    
    const userDocRef = doc(db, 'users', currentUser.uid);
    const groupDocRef = doc(db, 'groups', groupId);

    try {
        if (isCurrentlyFollowed) {
            // --- Unfollow ---
            await updateDoc(userDocRef, {
                followedGroups: arrayRemove(groupId)
            });
            await updateDoc(groupDocRef, {
                members: arrayRemove(currentUser.uid)
            });
        } else {
            // --- Follow ---
            await updateDoc(userDocRef, {
                followedGroups: arrayUnion(groupId)
            });
            await updateDoc(groupDocRef, {
                members: arrayUnion(currentUser.uid)
            });
        }
    } catch (error) {
        console.error("Error updating follow status:", error);
    }
}

// --- NEW: Cloudinary Upload Function (from your upload.js) ---
async function uploadImageToCloudinary(file) {
    try {
        // Note: Make sure this Netlify function path is correct for your site
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

// --- NEW: File Preview and Removal Functions ---
function handleFilePreview(file) {
    groupImageFile = file; // Store the file
    
    const reader = new FileReader();
    reader.onload = (e) => {
        groupImagePreviewContainer.innerHTML = `
            <div class="image-preview-wrapper">
                <img src="${e.target.result}" alt="Image preview" class="image-preview-img">
                <button type="button" class="remove-image-btn" id="remove-group-image-btn">&times;</button>
            </div>
        `;
        groupImageUploadIcon.style.display = 'none';
        
        // Add listener for the new remove button
        document.getElementById('remove-group-image-btn').addEventListener('click', (e) => {
            e.stopPropagation(); // Stop it from triggering the upload click
            removeFile();
        });
    };
    reader.readAsDataURL(file);
}

function removeFile() {
    groupImageFile = null;
    groupImageInput.value = null; // Reset file input
    groupImagePreviewContainer.innerHTML = ''; // Clear preview
    groupImageUploadIcon.style.display = 'block';
}

// --- Modal Logic (Updated) ---
function setupModal() {
    createGroupBtn.addEventListener('click', () => {
        if (!currentUser) {
            alert("Please log in to create a group.");
            return;
        }
        modal.classList.add('active');
    });
    
    closeModalBtn.addEventListener('click', () => modal.classList.remove('active'));
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });

    // NEW: Listeners for image upload
    groupImageUploadArea.addEventListener('click', () => {
        groupImageInput.click();
    });

    groupImageInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFilePreview(e.target.files[0]);
        }
    });

    // --- Create Group Form Logic (Updated) ---
    createGroupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentUser) return;
        
        const groupName = document.getElementById('group-name').value.trim();
        const groupDesc = document.getElementById('group-description').value.trim();
        
        if (!groupName) {
            modalError.textContent = "Please enter a group name.";
            modalError.style.display = 'block';
            return;
        }
        
        createGroupSubmit.disabled = true;
        createGroupSubmit.textContent = "Creating...";
        modalError.style.display = 'none';

        try {
            let imageUrl = null; // Default image URL

            // 1. Check for and upload image
            if (groupImageFile) {
                createGroupSubmit.textContent = "Uploading image...";
                try {
                    imageUrl = await uploadImageToCloudinary(groupImageFile);
                } catch (uploadError) {
                    throw new Error("Cloudinary upload failed. Please try again.");
                }
            }

            createGroupSubmit.textContent = "Saving group...";

            // 2. Create the new group document
            const newGroupRef = await addDoc(collection(db, "groups"), {
                name: groupName,
                description: groupDesc,
                imageUrl: imageUrl, // NEW: Save the image URL
                isPublic: true,
                createdAt: serverTimestamp(),
                createdBy: currentUser.uid,
                members: [currentUser.uid] // Creator is the first member
            });
            
            // 3. Automatically "follow" the group you created
            const userDocRef = doc(db, 'users', currentUser.uid);
            await updateDoc(userDocRef, {
                followedGroups: arrayUnion(newGroupRef.id)
            });
            
            // Success
            modal.classList.remove('active');
            createGroupForm.reset();
            removeFile(); // NEW: Clear the image preview
            
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