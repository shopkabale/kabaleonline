// users.js
import { db } from '../firebase.js';
import { checkAdminAuth, setupHeader } from './admin-common.js';
import { collection, getDocs, doc, query, orderBy, updateDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- DOM ELEMENTS ---
const adminContent = document.getElementById('admin-content');
const loader = document.getElementById('loader');
const userList = document.getElementById('user-list');

/**
 * Main initialization function.
 */
function initializeUserManagement() {
    checkAdminAuth((adminData) => {
        setupHeader(adminData.name); 
        adminContent.style.display = 'block';
        loader.style.display = 'none';

        fetchAllUsers();
        setupEventListeners();
    });
}

function setupEventListeners() {
    adminContent.addEventListener('click', (e) => {
        const button = e.target.closest('button[data-action]');
        if (!button) return;
        
        if (button.dataset.action === 'toggle-verify') {
            handleToggleVerify(button);
        }
    });
}

async function fetchAllUsers() {
    userList.innerHTML = '<li>Loading users...</li>';
    try {
        const q = query(collection(db, 'users'), orderBy('email'));
        const snapshot = await getDocs(q);
        if (snapshot.empty) { userList.innerHTML = '<li>No users found.</li>'; return; }
        userList.innerHTML = '';
        snapshot.forEach(docSnap => {
            const userData = docSnap.data();
            if (userData.role === 'admin') return; // Skip admins
            const isVerified = userData.isVerified || false;
            const li = document.createElement('li');
            li.className = 'user-list-item';
            li.innerHTML = `
                <span class="user-info">
                    ${userData.name || 'No Name'} (${userData.email}) 
                    ${isVerified ? '<span style="color:green;">✔️ Verified</span>' : ''}
                </span>
                <button class="action-btn ${isVerified ? 'red' : 'green'}" 
                        data-action="toggle-verify" 
                        data-uid="${docSnap.id}" 
                        data-status="${isVerified}">
                    ${isVerified ? 'Un-verify' : 'Verify'}
                </button>`;
            userList.appendChild(li);
        });
    } catch (e) { 
        console.error("Error fetching users:", e); 
        userList.innerHTML = '<li>Could not load users.</li>'; 
    }
}

async function handleToggleVerify(button) {
    const userId = button.dataset.uid;
    const currentStatus = button.dataset.status === 'true';
    const newStatus = !currentStatus;
    if (!confirm(`Are you sure you want to ${newStatus ? 'verify' : 'un-verify'} this user?`)) return;
    
    button.disabled = true; 
    button.textContent = 'Updating...';
    
    try {
        await updateDoc(doc(db, 'users', userId), { isVerified: newStatus });
        await fetchAllUsers(); // Refresh the list
    } catch (e) { 
        console.error("Error toggling user verification:", e); 
        alert("Failed to update status."); 
        button.disabled = false; 
        button.textContent = currentStatus ? 'Un-verify' : 'Verify'; 
    }
}

// --- START THE APP ---
document.addEventListener('DOMContentLoaded', initializeUserManagement);