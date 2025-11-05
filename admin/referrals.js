import { db } from '../firebase.js';
import { checkAdminAuth, setupHeader } from './admin-common.js';
import { collection, getDocs, query, where, orderBy } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

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

async function fetchReferralData() {
    referralList.innerHTML = '<li>Loading referral data...</li>';
    try {
        // Query users who have made referrals, order by count
        const q = query(
            collection(db, 'users'), 
            where('referralCount', '>', 0),
            orderBy('referralCount', 'desc')
        );
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            referralList.innerHTML = '<li>No referrals found.</li>';
            totalReferralsDisplay.textContent = '0';
            return;
        }
        
        let totalReferralCount = 0;
        referralList.innerHTML = '';
        
        snapshot.forEach(docSnap => {
            const user = docSnap.data();
            const count = user.referralCount || 0;
            totalReferralCount += count;
            
            const li = document.createElement('li');
            li.className = 'user-list-item';
            li.innerHTML = `
                <span>${user.email || user.id}</span>
                <span style="font-weight:bold;">${count} Referrals</span>
            `;
            referralList.appendChild(li);
        });

        totalReferralsDisplay.textContent = totalReferralCount;
        
    } catch (e) { 
        console.error("Error fetching referral data:", e); 
        referralList.innerHTML = '<li>Could not load referral data.</li>'; 
    }
}

// --- START THE APP ---
document.addEventListener('DOMContentLoaded', initializeReferrals);