// =================================================================== //
//                                                                     //
//             KABALE ONLINE - GROUP CHAT SYSTEM                       //
//       GROUP DIRECTORY SCRIPT (group-list.js) - *AUTH WALL FIX* //
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

let currentUser = null;
let followedGroups = []; // Array of group IDs the user follows

// --- Auth Check (THIS IS THE NEW "LOGGING FIRST" LOGIC) ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is logged in!
        currentUser = user;
        // Hide the auth wall and show the real content
        authWall.style.display = 'none';
        groupsContent.style.display = 'block';
        
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

// --- Create Group Card UI ---
function createGroupCard(group, isFollowed) {
    const link = document.createElement('a');
    link.href = `chat.html?groupId=${group.id}`;
    link.className = 'group-link';
    
    const icon = group.isPublic ? 'fa-users' : 'fa-lock';
    
    link.innerHTML = `
        <i class="fas ${icon} group-icon"></i>
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

// --- Modal Logic ---
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

    // --- Create Group Form Logic ---
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
            // 1. Create the new group document
            const newGroupRef = await addDoc(collection(db, "groups"), {
                name: groupName,
                description: groupDesc,
                isPublic: true,
                createdAt: serverTimestamp(),
                createdBy: currentUser.uid,
                members: [currentUser.uid] // Creator is the first member
            });
            
            // 2. Automatically "follow" the group you created
            const userDocRef = doc(db, 'users', currentUser.uid);
            await updateDoc(userDocRef, {
                followedGroups: arrayUnion(newGroupRef.id)
            });
            
            // Success
            modal.classList.remove('active');
            createGroupForm.reset();
            
        } catch (error) {
            console.error("Error creating group:", error);
            modalError.textContent = "Could not create group. Please try again.";
            modalError.style.display = 'block';
        } finally {
            createGroupSubmit.disabled = false;
            createGroupSubmit.textContent = "Create Group";
        }
    });
}