import { auth, db } from '../js/auth.js';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, increment, serverTimestamp, addDoc, orderBy } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { showMessage, toggleLoading } from '../js/shared.js';

// --- DOM ELEMENTS ---
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

// --- CONFIGURATION ---
const MINIMUM_PAYOUT_UGX = 5000;
let currentUser = null;

// --- AUTHENTICATION & DATA LOADING ---
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        await loadAndDisplayReferralData(user);
    }
});

async function loadAndDisplayReferralData(user) {
    const userDocRef = doc(db, 'users', user.uid);
    try {
        // Step 1: Get the user's current approved balance and referral code
        const userDoc = await getDoc(userDocRef);
        if (!userDoc.exists()) throw new Error("Current user not found.");
        
        const userData = userDoc.data();
        const currentBalance = userData.referralBalanceUGX || 0;

        // Populate the main UI elements
        referralLinkInput.value = `${window.location.origin}/signup/?ref=${userData.referralCode}`;
        referralBalanceEl.textContent = `${currentBalance.toLocaleString()} UGX`;
        
        const progressPercentage = Math.min((currentBalance / MINIMUM_PAYOUT_UGX) * 100, 100);
        payoutProgressBar.style.width = `${progressPercentage}%`;
        payoutProgressText.textContent = `${currentBalance.toLocaleString()} / ${MINIMUM_PAYOUT_UGX.toLocaleString()} UGX to request a payout`;
        
        payoutButton.disabled = currentBalance < MINIMUM_PAYOUT_UGX;

        // Step 2: Fetch the list of all referral requests to show their status
        const q = query(collection(db, 'referralValidationRequests'), where('referrerId', '==', user.uid), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);

        renderReferralList(snapshot.docs);

    } catch (error) {
        console.error("Error loading referral data:", error);
        showMessage(messageEl, 'Failed to load your referral data.', true);
    } finally {
        loader.style.display = 'none';
        content.style.display = 'block';
    }
}

function renderReferralList(referralDocs) {
    referralListContainer.innerHTML = '';
    referralCountEl.textContent = referralDocs.length;
    if (referralDocs.length === 0) {
        noReferralsMessage.style.display = 'block';
        return;
    }
    noReferralsMessage.style.display = 'none';
    
    let html = '';
    referralDocs.forEach(doc => {
        const referral = doc.data();
        const joinDate = referral.createdAt.toDate().toLocaleDateString();
        const statusClass = referral.status.toLowerCase(); // 'pending' or 'approved'
        html += `
            <div class="referral-item">
                <div class="referral-details">
                    <h3>${referral.referredUserName || 'New User'}</h3>
                    <p>Joined on: ${joinDate}</p>
                </div>
                <span class="referral-status ${statusClass}">${referral.status}</span>
            </div>
        `;
    });
    referralListContainer.innerHTML = html;
}


// --- BUTTON LISTENERS ---
copyReferralLinkBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(referralLinkInput.value).then(() => {
        const originalText = copyReferralLinkBtn.textContent;
        copyReferralLinkBtn.textContent = 'Copied!';
        setTimeout(() => { copyReferralLinkBtn.textContent = 'Copy'; }, 2000);
    });
});

payoutButton.addEventListener('click', async () => {
    if (!currentUser || payoutButton.disabled) return;
    if (!confirm(`Are you sure you want to request a payout for your entire balance? Your balance will be reset to zero and an admin will review your request.`)) return;
    
    toggleLoading(payoutButton, true, 'Requesting...');
    const userDocRef = doc(db, 'users', currentUser.uid);

    try {
        const userDoc = await getDoc(userDocRef);
        const currentBalance = userDoc.data().referralBalanceUGX || 0;
        if (currentBalance < MINIMUM_PAYOUT_UGX) {
            throw new Error("Your balance is below the minimum payout amount.");
        }
        
        // Create a payout request for the admin
        await addDoc(collection(db, "payoutRequests"), {
            userId: currentUser.uid,
            userName: userDoc.data().name,
            userEmail: currentUser.email,
            amount: currentBalance,
            currency: "UGX",
            status: "pending",
            requestedAt: serverTimestamp()
        });

        // Reset the user's balance to 0
        await updateDoc(userDocRef, { referralBalanceUGX: 0 });

        showMessage(messageEl, `Payout request for ${currentBalance.toLocaleString()} UGX submitted!`, false);
        await loadAndDisplayReferralData(currentUser); // Reload data to show zero balance

    } catch (error) {
        console.error("Payout request failed:", error);
        showMessage(messageEl, `Error: ${error.message}`, true);
    } finally {
        toggleLoading(payoutButton, false, 'Request Payout');
    }
});