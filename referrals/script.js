import { auth, db } from '../js/auth.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { doc, getDoc, query, collection, where, getDocs, updateDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { showMessage } from '../js/shared.js';

// --- DOM ELEMENTS ---
const loader = document.getElementById('referral-loader');
const content = document.getElementById('referral-content');
const userReferralLinkEl = document.getElementById('user-referral-link');
const copyReferralLinkBtn = document.getElementById('copy-referral-link-btn');
const referralListEl = document.getElementById('referral-list');
const referralCountEl = document.getElementById('referral-count'); // small counter
const userReferralCountEl = document.getElementById('user-referral-count'); // big stat counter
const messageEl = document.getElementById('global-message');

// --- INITIALIZATION ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            // Step 1: Get current user's profile data
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);
            if (!userDoc.exists()) {
                throw new Error("Could not find your user profile.");
            }
            const userData = userDoc.data();
            const referralCode = userData.referralCode || 'N/A';

            // Generate and display referral link
            userReferralLinkEl.value = `${window.location.origin}/signup/?ref=${referralCode}`;

            // Step 2: Query referred users (all users with referrerId == current user)
            const referralsQuery = query(
                collection(db, 'users'),
                where('referrerId', '==', user.uid)
            );
            const referralsSnapshot = await getDocs(referralsQuery);
            const actualReferralCount = referralsSnapshot.size;

            // ✅ Update both counters
            referralCountEl.textContent = actualReferralCount;
            userReferralCountEl.textContent = actualReferralCount;

            // ✅ Step 3: Display referred users in list
            referralListEl.innerHTML = "";
            const referralDates = []; // for chart
            if (referralsSnapshot.empty) {
                referralListEl.innerHTML = "<li>No referrals yet.</li>";
            } else {
                referralsSnapshot.forEach((docSnap) => {
                    const data = docSnap.data();
                    const li = document.createElement("li");
                    li.textContent = data.name || data.fullName || data.email || docSnap.id;
                    referralListEl.appendChild(li);

                    // Collect createdAt date for chart
                    if (data.createdAt) {
                        const date = new Date(data.createdAt.seconds * 1000);
                        referralDates.push(date.toLocaleDateString());
                    }
                });
            }

            // Step 4: Update stored referralCount if needed
            if (userData.referralCount !== actualReferralCount) {
                await updateDoc(userDocRef, { referralCount: actualReferralCount });
            }

            // --- Step 5: Render Chart ---
            if(referralDates.length > 0) {
                const referralCounts = {};
                referralDates.forEach(date => {
                    referralCounts[date] = (referralCounts[date] || 0) + 1;
                });
                const labels = Object.keys(referralCounts).sort((a,b) => new Date(a) - new Date(b));
                const counts = labels.map(date => referralCounts[date]);

                // Check if chart canvas exists
                const chartCanvas = document.getElementById('referralChart');
                if(chartCanvas) {
                    const ctx = chartCanvas.getContext('2d');
                    new Chart(ctx, {
                        type: 'line',
                        data: {
                            labels: labels,
                            datasets: [{
                                label: 'Referrals',
                                data: counts,
                                fill: false,
                                borderColor: '#28a745',
                                tension: 0.3,
                                pointBackgroundColor: '#28a745'
                            }]
                        },
                        options: {
                            responsive: true,
                            plugins: {
                                legend: { display: false },
                                tooltip: { mode: 'index', intersect: false }
                            },
                            scales: {
                                x: { title: { display: true, text: 'Date' } },
                                y: { title: { display: true, text: 'Number of Referrals' }, beginAtZero: true, precision:0 }
                            }
                        }
                    });
                }
            }

        } catch (error) {
            console.error("Error loading referral data:", error);
            showMessage(messageEl, 'Failed to load referral data. Please check the console for errors.', true);
        } finally {
            loader.style.display = 'none';
            content.style.display = 'block';
        }
    }
});

// --- EVENT LISTENERS ---
copyReferralLinkBtn.addEventListener('click', () => {
    if (userReferralLinkEl.value === 'Loading your link...') return;

    userReferralLinkEl.select();
    navigator.clipboard.writeText(userReferralLinkEl.value).then(() => {
        const originalText = copyReferralLinkBtn.innerHTML;
        copyReferralLinkBtn.innerHTML = 'Copied!';
        setTimeout(() => { 
            copyReferralLinkBtn.innerHTML = `<i class="fa-solid fa-copy"></i> Copy`; 
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
        showMessage(messageEl, 'Could not copy code.', true);
    });
});