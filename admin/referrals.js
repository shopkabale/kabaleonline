import { db, auth } from '../firebase.js'; // Import auth
import { checkAdminAuth, setupHeader } from './admin-common.js';
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";

// --- DOM ELEMENTS ---
const adminContent = document.getElementById('admin-content');
const loader = document.getElementById('loader');
const totalCountDisplay = document.getElementById('total-referrals-count');
const logList = document.getElementById('referral-log-list');

/**
 * Main initialization function.
 */
function initializeReferrals() {
    checkAdminAuth((adminData) => {
        setupHeader(adminData.name); 

        onAuthStateChanged(auth, (user) => {
            if (user) {
                adminContent.style.display = 'block';
                loader.style.display = 'none';
                loadAllReferrals(user); // Pass the auth user object
            }
        });
    });
}

/**
 * Fetches all referrals from the referral_log.
 */
async function loadAllReferrals(user) {
    logList.innerHTML = '<li>Loading referral log...</li>';
    try {
        // Simple query to get all logs, sorted by most recent
        const q = query(
            collection(db, 'referral_log'), 
            orderBy("createdAt", "desc")
        );

        const logSnapshot = await getDocs(q);

        if (logSnapshot.empty) {
            logList.innerHTML = '<li>No referrals found yet.</li>';
            totalCountDisplay.textContent = '0';
            return;
        }

        totalCountDisplay.textContent = logSnapshot.size;

        // Build the final HTML
        let html = '';
        logSnapshot.forEach(doc => {
            const log = doc.data();
            const logId = doc.id;
            const date = log.createdAt?.toDate().toLocaleDateString() || 'N/A';

            // Get status and apply a class
            let status = log.status || 'pending';
            let statusClass = `status-${status}`; // e.g., status-pending, status-approved

            html += `
                <li class="referral-log-item" id="item-${logId}">
                    <div class="referral-info">
                        <strong>${log.referredUserName}</strong>
                        <small>Referred by: ${log.referrerEmail || 'N/A'}</small>
                        <small>Date: ${date}</small>
                    </div>
                    <div class="referral-status">
                        <span class="status-badge ${statusClass}">${status}</span>
                    </div>
                </li>
            `;
        });

        logList.innerHTML = html;

    } catch (e) { 
        console.error("Error fetching referrals:", e); 
        logList.innerHTML = '<li>Could not load referral data. (Check console for errors)</li>'; 
    }
}

// --- START THE APP ---
document.addEventListener('DOMContentLoaded', initializeReferrals);