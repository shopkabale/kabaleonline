import { auth, db } from '../js/auth.js';
import { collection, query, where, getDocs, doc, getDoc, writeBatch, increment, serverTimestamp, addDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { showMessage, toggleLoading } from '../js/shared.js';

// DOM Elements
const loader = document.getElementById('referral-loader');
const content = document.getElementById('referral-content');
const messageEl = document.getElementById('global-message');
const referralBalanceEl = document.getElementById('referral-balance');
const payoutProgressBar = document.getElementById('payout-progress-bar');
const payoutProgressText = document.getElementById('payout-progress-text');
const payoutButton = document.getElementById('payout-button');
const referralCountEl = document.getElementById('referral-count');
const referralListContainer = document.getElementById('referral-list-container');
const noReferralsMessage = document.getElementById('no-referrals-message');
const referralLinkInput = document.getElementById('referral-link-input');
const copyReferralLinkBtn = document.getElementById('copy-referral-link-btn');

// Configuration
const UGX_PER_REFERRAL = 250;
const MINIMUM_PAYOUT_UGX = 5000;

let currentUser = null;

auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        await syncAndLoadReferralData(user);
    }
});

async function syncAndLoadReferralData(user) { /* ... same as previous answer ... */ }

function renderReferralList(allReferrals) { /* ... same as previous answer ... */ }

copyReferralLinkBtn.addEventListener('click', () => { /* ... same as previous answer ... */ });

payoutButton.addEventListener('click', async () => {
    if (!currentUser || payoutButton.disabled) return;
    toggleLoading(payoutButton, true, 'Requesting...');
    const userDocRef = doc(db, 'users', currentUser.uid);

    try {
        const userDoc = await getDoc(userDocRef);
        const currentBalance = userDoc.data().referralBalanceUGX || 0;
        if (currentBalance < MINIMUM_PAYOUT_UGX) throw new Error("Balance is below minimum payout.");
        
        // Create a new payout request in the top-level 'payoutRequests' collection
        await addDoc(collection(db, "payoutRequests"), {
            userId: currentUser.uid,
            userName: userDoc.data().name,
            userEmail: currentUser.email,
            amount: currentBalance,
            currency: "UGX",
            status: "pending",
            requestedAt: serverTimestamp()
        });

        // Reset user's balance after creating the request
        await updateDoc(userDocRef, { referralBalanceUGX: 0 });

        showMessage(messageEl, `Payout request for ${currentBalance.toLocaleString()} UGX submitted! We will contact you shortly.`, false);
        await syncAndLoadReferralData(currentUser);
    } catch (error) {
        console.error("Payout request failed:", error);
        showMessage(messageEl, `Error: ${error.message}`, true);
    } finally {
        toggleLoading(payoutButton, false, 'Request Payout');
    }
});