import { db } from '../firebase.js';
import { checkAdminAuth, setupHeader } from './admin-common.js';
import { collection, getDocs, query } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- DOM ELEMENTS ---
const adminContent = document.getElementById('admin-content');
const loader = document.getElementById('loader');
const totalReferralsDisplay = document.getElementById('total-referrals-display');
const referralList = document.getElementById('referral-list');

/**
 * Main initialization function.
 */
function initializeReferrals() {
    checkAdminAuth((adminData) => {
        setupHeader(adminData.name); 
        adminContent.style.display = 'block';
        loader.style.display = 'none';

        fetchReferralData();
    });
}

/**
 * Fetches all users, builds a referral tree, and displays the full list.
 */
async function fetchReferralData() {
    referralList.innerHTML = '<li>Loading and processing all user data...</li>';
    try {
        const usersSnapshot = await getDocs(query(collection(db, 'users')));
        if (usersSnapshot.empty) {
            referralList.innerHTML = '<li>No users found in the system.</li>';
            return;
        }

        const usersById = new Map();
        const referrers = new Map();

        // Step 1: Map all users by their ID and initialize referrer data
        usersSnapshot.forEach(doc => {
            const userData = doc.data();
            const userId = doc.id;
            const userName = userData.name || userData.email || 'Unknown User';
            
            usersById.set(userId, { ...userData, id: userId, displayName: userName });
            
            // Initialize every user as a potential referrer
            referrers.set(userId, {
                id: userId,
                displayName: userName,
                referred: [] // A list to hold users they referred
            });
        });

        // Step 2: Connect referred users to their referrer
        // This assumes a user doc has a field like 'referredBy' or 'referrerId'
        usersById.forEach(user => {
            const referrerId = user.referredBy || user.referrerId;
            if (referrerId && referrers.has(referrerId)) {
                referrers.get(referrerId).referred.push(user);
            }
        });

        // Step 3: Filter down to only users who *actually* referred someone
        const actualReferrers = [...referrers.values()]
            .filter(r => r.referred.length > 0)
            .sort((a, b) => b.referred.length - a.referred.length); // Sort by count

        if (actualReferrers.length === 0) {
            referralList.innerHTML = '<li>No users have referred anyone yet.</li>';
            totalReferralsDisplay.textContent = '0';
            return;
        }

        // Step 4: Build the final HTML
        let totalReferralCount = 0;
        let html = '';

        actualReferrers.forEach(referrer => {
            totalReferralCount += referrer.referred.length;
            
            // Create the header for the referrer
            html += `
                <li class="user-list-item" style="background-color: var(--bg-card); flex-direction: column; align-items: flex-start; gap: 5px;">
                    <strong style="font-size: 1.2em;">${referrer.displayName}</strong>
                    <span>Total Referrals: ${referrer.referred.length}</span>
                </li>
            `;
            
            // Create the list of users they referred
            referrer.referred.forEach(referredUser => {
                html += `
                    <li class="user-list-item" style="padding-left: 40px;">
                        <span>- ${referredUser.displayName}</span>
                        <span style="color: var(--text-secondary);">${referredUser.email || ''}</span>
                    </li>
                `;
            });
        });

        referralList.innerHTML = html;
        totalReferralsDisplay.textContent = totalReferralCount;
        
    } catch (e) { 
        console.error("Error fetching referral data:", e); 
        referralList.innerHTML = '<li>Could not load referral data.</li>'; 
    }
}

// --- START THE APP ---
document.addEventListener('DOMContentLoaded', initializeReferrals);