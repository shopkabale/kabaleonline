// =================================================================== //
//                                                                     //
//             KABALE ONLINE - GROUP CHAT SYSTEM                       //
//                   GROUP DIRECTORY SCRIPT (group-list.js)            //
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

// --- Auth Check ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        // Fetch user's followed groups to sync state
        getUserProfile(user.uid);
    } else {
        // Not logged in
        currentUser = null;
        myGroupsSection.style.display = 'none';
    }
    // Always load all public groups
    listenForAllGroups();
});

async function getUserProfile(uid) {
    const userDocRef = doc(db, 'users', uid);
    onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
            followedGroups = doc.data().followedGroups || [];
            myGroupsSection.style.display = 'block';
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