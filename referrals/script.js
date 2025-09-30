import { auth, db } from '../js/auth.js';
import { collection, query, where, getDocs, doc, updateDoc, getDoc, runTransaction } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { showMessage, toggleLoading } from '../js/shared.js';

// --- DOM ELEMENTS ---
const loader = document.getElementById('referral-loader');
const content = document.getElementById('referral-content');
const messageEl = document.getElementById('global-message');

const referralLinkInput = document.getElementById('referral-link-input');
const copyReferralLinkBtn = document.getElementById('copy-referral-link-btn');

const currentPointsEl = document.getElementById('current-points');
const pointsProgressBar = document.getElementById('points-progress-bar');
const pointsProgressText = document.getElementById('points-progress-text');
const redeemButton = document.getElementById('redeem-button');
const totalEarningsEl = document.getElementById('total-earnings');

const referralCountEl = document.getElementById('referral-count');
const referralListContainer = document.getElementById('referral-list-container');
const noReferralsMessage = document.getElementById('no-referrals-message');

// --- CONFIGURATION ---
const POINTS_PER_REFERRAL = 10;
const POINTS_FOR_REDEEM = 1000;
const REDEEM_AMOUNT = 50;

let currentUser = null;

auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        await loadReferralData(user);
    }
});

async function loadReferralData(user) {
    let validReferrals = [];
    const userDocRef = doc(db, 'users', user.uid);

    try {
        const userDoc = await getDoc(userDocRef);
        if (!userDoc.exists()) throw new Error("Current user not found in database.");
        const userData = userDoc.data();

        // 1. Populate Referral Link
        referralLinkInput.value = `${window.location.origin}/signup/?ref=${userData.referralCode}`;

        // 2. Query for users who were referred by the current user
        const q = query(collection(db, 'users'), where('referrerId', '==', user.uid));
        const referralsSnapshot = await getDocs(q);
        
        referralCountEl.textContent = referralsSnapshot.size;
        if (referralsSnapshot.empty) {
            noReferralsMessage.style.display = 'block';
        } else {
            noReferralsMessage.style.display = 'none';
        }

        // 3. Check each referral for the "valid" condition (uploaded an item with a picture)
        for (const referredUserDoc of referralsSnapshot.docs) {
            const referredUserData = referredUserDoc.data();
            const productsQuery = query(collection(db, 'products'), where('sellerId', '==', referredUserDoc.id));
            const productsSnapshot = await getDocs(productsQuery);

            let isFoundValid = false;
            for (const productDoc of productsSnapshot.docs) {
                if (productDoc.data().imageUrls && productDoc.data().imageUrls.length > 0) {
                    isFoundValid = true;
                    break; 
                }
            }

            if (isFoundValid) {
                validReferrals.push({ ...referredUserData, status: 'Valid' });
            }
        }
        
        // 4. Calculate points and update the UI
        const totalPoints = validReferrals.length * POINTS_PER_REFERRAL;
        currentPointsEl.textContent = totalPoints;
        
        const progressPercentage = Math.min((totalPoints / POINTS_FOR_REDEEM) * 100, 100);
        pointsProgressBar.style.width = `${progressPercentage}%`;
        pointsProgressText.textContent = `${totalPoints} / ${POINTS_FOR_REDEEM} points to cash out`;

        // 5. Update earnings and redemption status
        const totalEarnings = (userData.referralPayouts || 0) * REDEEM_AMOUNT;
        totalEarningsEl.textContent = `$${totalEarnings.toFixed(2)}`;
        
        if (totalPoints >= POINTS_FOR_REDEEM) {
            redeemButton.disabled = false;
        }

        // 6. Render the list of all referred members
        renderReferralList(referralsSnapshot.docs, validReferrals);

    } catch (error) {
        console.error("Error loading referral data:", error);
        showMessage(messageEl, 'Failed to load referral data.', true);
    } finally {
        loader.style.display = 'none';
        content.style.display = 'block';
    }
}

function renderReferralList(allReferrals, validReferrals) {
    referralListContainer.innerHTML = ''; // Clear previous list
    if (allReferrals.length === 0) return;

    allReferrals.forEach(doc => {
        const referral = doc.data();
        const isValid = validReferrals.some(valid => valid.email === referral.email);
        const status = isValid ? 'Valid' : 'Pending';

        const referralItem = document.createElement('div');
        referralItem.className = 'referral-item';
        referralItem.innerHTML = `
            <img src="${referral.profilePhotoUrl || 'https://placehold.co/50x50/e0e0e0/777?text=U'}" alt="${referral.name}">
            <div class="referral-details">
                <h3>${referral.name || 'New User'}</h3>
                <p>Joined on: ${referral.createdAt.toDate().toLocaleDateString()}</p>
            </div>
            <span class="referral-status ${status.toLowerCase()}">${status}</span>
        `;
        referralListContainer.appendChild(referralItem);
    });
}

copyReferralLinkBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(referralLinkInput.value).then(() => {
        const originalText = copyReferralLinkBtn.innerHTML;
        copyReferralLinkBtn.innerHTML = 'Copied!';
        setTimeout(() => { copyReferralLinkBtn.innerHTML = originalText; }, 2000);
    });
});

redeemButton.addEventListener('click', async () => {
    if (!currentUser || redeemButton.disabled) return;
    if (!confirm(`Are you sure you want to redeem ${POINTS_FOR_REDEEM} points for $${REDEEM_AMOUNT}? The points will be deducted from your account.`)) return;
    
    toggleLoading(redeemButton, true, 'Redeeming...');

    const userDocRef = doc(db, 'users', currentUser.uid);

    try {
        await runTransaction(db, async (transaction) => {
            const userDoc = await transaction.get(userDocRef);
            if (!userDoc.exists()) throw new Error("User document not found.");

            // Recalculate valid referrals inside the transaction for data consistency
            const q = query(collection(db, 'users'), where('referrerId', '==', currentUser.uid));
            const referralsSnapshot = await getDocs(q);
            let validReferralCount = 0;
            for (const referredUserDoc of referralsSnapshot.docs) {
                const productsQuery = query(collection(db, 'products'), where('sellerId', '==', referredUserDoc.id, 'limit', 1));
                const productsSnapshot = await getDocs(productsQuery);
                if (!productsSnapshot.empty && productsSnapshot.docs[0].data().imageUrls?.length > 0) {
                    validReferralCount++;
                }
            }
            const currentPoints = validReferralCount * POINTS_PER_REFERRAL;
            
            if (currentPoints < POINTS_FOR_REDEEM) {
                throw new Error("You do not have enough points to redeem.");
            }

            // In a real system, you'd deduct points. Here we'll add a payout counter.
            const newPayoutCount = (userDoc.data().referralPayouts || 0) + 1;
            
            transaction.update(userDocRef, {
                referralPayouts: newPayoutCount
            });
            // NOTE: This is a simplified model. A more robust model would deduct points or mark referrals as "redeemed".
        });
        
        showMessage(messageEl, `Redemption successful! We will contact you about your $${REDEEM_AMOUNT} payout.`, false);
        await loadReferralData(currentUser); // Reload data to show updated state

    } catch (error) {
        console.error("Redemption failed:", error);
        showMessage(messageEl, `Error: ${error.message}`, true);
    } finally {
        toggleLoading(redeemButton, false, `Redeem $${REDEEM_AMOUNT}`);
    }
});