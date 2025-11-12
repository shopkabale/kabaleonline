import { db, auth } from '../firebase.js'; // Import auth
import { checkAdminAuth, setupHeader } from './admin-common.js';
import { collection, getDocs, query, where, orderBy, doc, updateDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";

// --- DOM ELEMENTS ---
const adminContent = document.getElementById('admin-content');
const loader = document.getElementById('loader');
const pendingCountDisplay = document.getElementById('pending-referrals-count');
const pendingList = document.getElementById('pending-referrals-list');

/**
 * Main initialization function.
 */
function initializeReferrals() {
    // 1. Check if the user is an admin (from your admin-common.js)
    checkAdminAuth((adminData) => {
        setupHeader(adminData.name); 

        // 2. We also need the Auth User object to get a security token
        onAuthStateChanged(auth, (user) => {
            if (user) {
                // User is logged in and is an admin.
                adminContent.style.display = 'block';
                loader.style.display = 'none';
                loadPendingReferrals(user); // Pass the auth user object
            }
        });
    });
}

/**
 * Fetches all "pending" referrals from the referral_log.
 */
async function loadPendingReferrals(user) {
    pendingList.innerHTML = '<li>Loading pending referrals...</li>';
    try {
        const q = query(
            collection(db, 'referral_log'), 
            where("status", "==", "pending"),
            orderBy("createdAt", "desc")
        );
        
        const logSnapshot = await getDocs(q);
        
        if (logSnapshot.empty) {
            pendingList.innerHTML = '<li>No pending referrals found.</li>';
            pendingCountDisplay.textContent = '0';
            return;
        }

        pendingCountDisplay.textContent = logSnapshot.size;

        // 3. Build the final HTML
        let html = '';
        logSnapshot.forEach(doc => {
            const log = doc.data();
            const logId = doc.id;
            const date = log.createdAt?.toDate().toLocaleDateString() || 'N/A';
            
            html += `
                <li class="referral-queue-item" id="item-${logId}">
                    <div class="referral-info">
                        <strong>${log.referredUserName}</strong>
                        <small>Referred by: ${log.referrerEmail || 'N/A'}</small>
                        <small>Date: ${date}</small>
                    </div>
                    <div class="referral-actions">
                        <button class="btn-approve" data-log-id="${logId}">
                            <i class="fa-solid fa-check"></i> Approve
                        </button>
                        <button class="btn-reject" data-log-id="${logId}">
                            <i class="fa-solid fa-times"></i> Reject
                        </button>
                    </div>
                </li>
            `;
        });

        pendingList.innerHTML = html;

        // 4. Add event listeners to the new buttons
        pendingList.querySelectorAll('.btn-approve').forEach(btn => {
            btn.addEventListener('click', (e) => handleApproval(e, user));
        });
        
        pendingList.querySelectorAll('.btn-reject').forEach(btn => {
            btn.addEventListener('click', (e) => handleRejection(e, user));
        });

    } catch (e) { 
        console.error("Error fetching pending referrals:", e); 
        pendingList.innerHTML = '<li>Could not load referral data.</li>'; 
    }
}

/**
 * Handles the "Approve" button click.
 * This securely calls your 'approve-referral' Netlify function.
 */
async function handleApproval(e, user) {
    const btn = e.currentTarget;
    const logId = btn.dataset.logId;
    if (!logId) return;

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Approving...';

    try {
        const idToken = await user.getIdToken();

        const response = await fetch('/.netlify/functions/approve-referral', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}` // Send Firebase token for security
            },
            body: JSON.stringify({ logId: logId })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Failed to approve');
        }

        // Success! Remove item from the UI.
        document.getElementById(`item-${logId}`).remove();
        pendingCountDisplay.textContent = parseInt(pendingCountDisplay.textContent) - 1;

    } catch (err) {
        console.error('Approval failed:', err);
        alert('Error: ' + err.message);
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Approve';
    }
}

/**
 * Handles the "Reject" button click.
 * This calls a NEW Netlify function 'reject-referral'.
 */
async function handleRejection(e, user) {
    const btn = e.currentTarget;
    const logId = btn.dataset.logId;
    if (!logId) return;

    if (!confirm('Are you sure you want to reject this referral? This cannot be undone.')) {
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Rejecting...';

    try {
        const idToken = await user.getIdToken();

        const response = await fetch('/.netlify/functions/reject-referral', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify({ logId: logId })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Failed to reject');
        }

        // Success! Remove item from the UI.
        document.getElementById(`item-${logId}`).remove();
        pendingCountDisplay.textContent = parseInt(pendingCountDisplay.textContent) - 1;

    } catch (err) {
        console.error('Rejection failed:', err);
        alert('Error: ' + err.message);
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-times"></i> Reject';
    }
}

// --- START THE APP ---
document.addEventListener('DOMContentLoaded', initializeReferrals);