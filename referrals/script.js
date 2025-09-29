import { auth, db } from '/js/auth.js';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { showMessage } from '/js/shared.js';

const userReferralLinkInput = document.getElementById('user-referral-link');
const copyReferralBtn = document.getElementById('copy-referral-btn');
const userReferralCount = document.getElementById('user-referral-count');
const dashboardMessage = document.getElementById('dashboard-message');
const referredUsersList = document.getElementById('referred-users-list');
const chartCanvas = document.getElementById('referralsChart');
let referralsChart = null;

copyReferralBtn.addEventListener('click', () => {
    userReferralLinkInput.select();
    navigator.clipboard.writeText(userReferralLinkInput.value).then(() => {
        showMessage(dashboardMessage, "Referral link copied!", false);
        const originalIcon = copyReferralBtn.innerHTML;
        copyReferralBtn.innerHTML = `<i class="fa-solid fa-check"></i>`;
        setTimeout(() => { copyReferralBtn.innerHTML = originalIcon; }, 2000);
    }).catch(err => { showMessage(dashboardMessage, "Could not copy link.", true); });
});

function createChart(data) {
    if (referralsChart) referralsChart.destroy(); // Destroy old chart before creating new one
    
    const labels = Object.keys(data);
    const values = Object.values(data);
    
    referralsChart = new Chart(chartCanvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '# of Referrals',
                data: values,
                backgroundColor: 'rgba(0, 123, 255, 0.5)',
                borderColor: 'rgba(0, 123, 255, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }
    });
}

async function fetchReferralData(uid) {
    // 1. Get user's referral code
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (!userDoc.exists()) return;
    const refCode = userDoc.data().referralCode;
    const referralLink = `https://www.kabaleonline.com/signup/?ref=${refCode}`;
    userReferralLinkInput.value = referralLink;

    // 2. Fetch users who were referred by the current user
    const q = query(collection(db, 'users'), where('referrerId', '==', uid), orderBy('createdAt', 'desc'));
    const referralsSnapshot = await getDocs(q);

    userReferralCount.textContent = referralsSnapshot.size;
    referredUsersList.innerHTML = '';
    const monthlyData = {};

    if (referralsSnapshot.empty) {
        referredUsersList.innerHTML = '<p>You haven\'t referred anyone yet. Share your link to get started!</p>';
        createChart({}); // Create empty chart
        return;
    }

    referralsSnapshot.forEach(doc => {
        const referredUser = doc.data();
        const listItem = document.createElement('div');
        listItem.className = 'referred-user';
        listItem.innerHTML = `<i class="fa-solid fa-user-check"></i> <div><strong>${referredUser.name || 'Anonymous User'}</strong> joined on ${referredUser.createdAt.toDate().toLocaleDateString()}</div>`;
        referredUsersList.appendChild(listItem);
        
        // Process data for chart (group by month)
        const date = referredUser.createdAt.toDate();
        const monthYear = date.toLocaleString('default', { month: 'short', year: 'numeric' });
        monthlyData[monthYear] = (monthlyData[monthYear] || 0) + 1;
    });

    // Sort monthly data for chart labels
    const sortedMonthlyData = Object.entries(monthlyData).sort(([a], [b]) => new Date(a) - new Date(b));
    const chartData = Object.fromEntries(sortedMonthlyData);
    
    createChart(chartData);
}

auth.onAuthStateChanged((user) => {
    if (user) {
        fetchReferralData(user.uid);
    }
});