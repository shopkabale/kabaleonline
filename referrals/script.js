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
const chartCanvas = document.getElementById('referralsChart');
let referralsChart = null;

// --- CONFIGURATION ---
const UGX_PER_REFERRAL = 250;
const MINIMUM_PAYOUT_UGX = 5000;
const VALIDATION_PERIOD_HOURS = 24;
let currentUser = null;

auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        await syncAndLoadReferralData(user);
    }
});

async function syncAndLoadReferralData(user) {
    const userDocRef = doc(db, 'users', user.uid);
    try {
        // NEW QUERY: Read from the simple 'referrals' collection. This fixes the error.
        const q = query(collection(db, 'referrals'), where('referrerId', '==', user.uid), orderBy('createdAt', 'desc'));
        const referralsSnapshot = await getDocs(q);

        for (const referralDoc of referralsSnapshot.docs) {
            const referralData = referralDoc.data();
            if (referralData.status === 'pending') {
                const referredUserId = referralData.referredUserId;
                const productsQuery = query(collection(db, 'products'), where('sellerId', '==', referredUserId), orderBy('createdAt', 'asc'));
                const productsSnapshot = await getDocs(productsQuery);

                for (const productDoc of productsSnapshot.docs) {
                    const productData = productDoc.data();
                    if (productData.imageUrls?.length > 0 && productData.createdAt) {
                        const productAgeHours = (new Date() - productData.createdAt.toDate()) / (1000 * 60 * 60);
                        if (productAgeHours >= VALIDATION_PERIOD_HOURS) {
                            // This referral is now valid! Award the credit.
                            await updateDoc(userDocRef, { referralBalanceUGX: increment(UGX_PER_REFERRAL) });
                            await updateDoc(doc(db, 'referrals', referralDoc.id), { status: 'credited' });
                            break; // Stop checking products for this user
                        }
                    }
                }
            }
        }
        
        const userDoc = await getDoc(userDocRef);
        if (!userDoc.exists()) throw new Error("Current user not found.");
        
        const userData = userDoc.data();
        const currentBalance = userData.referralBalanceUGX || 0;

        referralLinkInput.value = `${window.location.origin}/signup/?ref=${userData.referralCode}`;
        referralBalanceEl.textContent = `${currentBalance.toLocaleString()} UGX`;
        const progressPercentage = Math.min((currentBalance / MINIMUM_PAYOUT_UGX) * 100, 100);
        payoutProgressBar.style.width = `${progressPercentage}%`;
        payoutProgressText.textContent = `${currentBalance.toLocaleString()} / ${MINIMUM_PAYOUT_UGX.toLocaleString()} UGX to request a payout`;
        payoutButton.disabled = currentBalance < MINIMUM_PAYOUT_UGX;

        const allReferrals = referralsSnapshot.docs.map(doc => doc.data());
        renderReferralList(allReferrals);
        createReferralsChart(allReferrals);

    } catch (error) {
        console.error("Error loading referral data:", error);
        showMessage(messageEl, 'Failed to load referral data. Please check the console for errors.', true);
    } finally {
        loader.style.display = 'none';
        content.style.display = 'block';
    }
}

function renderReferralList(allReferrals) {
    referralListContainer.innerHTML = '';
    referralCountEl.textContent = allReferrals.length;
    if (allReferrals.length === 0) {
        noReferralsMessage.style.display = 'block';
        return;
    }
    noReferralsMessage.style.display = 'none';
    allReferrals.forEach(referral => {
        const joinDate = referral.createdAt?.toDate()?.toLocaleDateString() || 'N/A';
        const referralItem = document.createElement('div');
        referralItem.className = 'referral-item';
        referralItem.innerHTML = `
            <div class="referral-details">
                <h3>${referral.referredUserName || 'New User'}</h3>
                <p>Joined on: ${joinDate}</p>
            </div>
            <span class="referral-status ${referral.status.toLowerCase()}">${referral.status}</span>
        `;
        referralListContainer.appendChild(referralItem);
    });
}

function createReferralsChart(allReferrals) {
    const monthlyData = {};
    allReferrals.forEach(ref => {
        if (ref.createdAt && ref.createdAt.toDate) {
            const date = ref.createdAt.toDate();
            const monthYear = date.toLocaleString('default', { month: 'short', year: 'numeric' });
            monthlyData[monthYear] = (monthlyData[monthYear] || 0) + 1;
        }
    });

    const sortedLabels = Object.keys(monthlyData).sort((a, b) => new Date(a) - new Date(b));
    const chartData = sortedLabels.map(label => monthlyData[label]);

    if (referralsChart) {
        referralsChart.destroy();
    }
    referralsChart = new Chart(chartCanvas, {
        type: 'line',
        data: {
            labels: sortedLabels,
            datasets: [{
                label: 'New Referrals',
                data: chartData,
                borderColor: 'rgba(233, 30, 99, 1)',
                backgroundColor: 'rgba(233, 30, 99, 0.2)',
                fill: true,
                tension: 0.4,
                pointBackgroundColor: 'rgba(233, 30, 99, 1)',
                pointBorderColor: '#fff',
                pointHoverRadius: 7,
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgba(233, 30, 99, 1)'
            }]
        },
        options: {
            responsive: true,
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }
    });
}

copyReferralLinkBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(referralLinkInput.value).then(() => {
        const originalText = copyReferralLinkBtn.innerHTML;
        copyReferralLinkBtn.innerHTML = 'Copied!';
        setTimeout(() => { copyReferralLinkBtn.innerHTML = originalText; }, 2000);
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
        
        await addDoc(collection(db, "payoutRequests"), {
            userId: currentUser.uid,
            userName: userDoc.data().name,
            userEmail: currentUser.email,
            amount: currentBalance,
            currency: "UGX",
            status: "pending",
            requestedAt: serverTimestamp()
        });

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