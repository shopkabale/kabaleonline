import { auth, db } from '../js/auth.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { collection, query, where, getDocs, doc, getDoc, updateDoc, orderBy, serverTimestamp, runTransaction, increment } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// DOM Elements
const adminContent = document.getElementById('admin-content');
const accessDenied = document.getElementById('access-denied');
const pendingTableBody = document.querySelector('#pending-referrals-table tbody');
const approvedTableBody = document.querySelector('#approved-referrals-table tbody');

// Auth Check: Secure the page
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data().role === 'admin') {
            adminContent.style.display = 'block';
            accessDenied.style.display = 'none';
            loadReferralRequests();
        } else {
            showAccessDenied();
        }
    } else {
        showAccessDenied();
    }
});

function showAccessDenied() {
    adminContent.style.display = 'none';
    accessDenied.style.display = 'block';
}

// Fetch and display all referral requests
async function loadReferralRequests() {
    pendingTableBody.innerHTML = '<tr><td colspan="4">Loading...</td></tr>';
    approvedTableBody.innerHTML = '<tr><td colspan="4">Loading...</td></tr>';
    try {
        const q = query(collection(db, "referralValidationRequests"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            pendingTableBody.innerHTML = '<tr><td colspan="4">No pending referrals to approve.</td></tr>';
            approvedTableBody.innerHTML = '<tr><td colspan="4">No approved referrals found.</td></tr>';
            return;
        }

        let pendingHTML = '';
        let approvedHTML = '';

        snapshot.forEach(doc => {
            const request = doc.data();
            const requestDate = request.createdAt.toDate().toLocaleDateString();
            if (request.status === 'pending') {
                pendingHTML += `
                    <tr>
                        <td>${request.referrerEmail}</td>
                        <td>${request.referredUserName}</td>
                        <td>${requestDate}</td>
                        <td><button class="action-btn green" data-action="approve-referral" data-id="${doc.id}" data-referrer-id="${request.referrerId}">Approve</button></td>
                    </tr>
                `;
            } else {
                 approvedHTML += `
                    <tr>
                        <td>${request.referrerEmail}</td>
                        <td>${request.referredUserName}</td>
                        <td>${requestDate}</td>
                        <td class="status-approved">Approved</td>
                    </tr>
                `;
            }
        });
        pendingTableBody.innerHTML = pendingHTML || '<tr><td colspan="4">No pending referrals to approve.</td></tr>';
        approvedTableBody.innerHTML = approvedHTML || '<tr><td colspan="4">No approved referrals found.</td></tr>';
    } catch (e) {
        console.error("Error fetching referrals:", e);
        pendingTableBody.innerHTML = '<tr><td colspan="4">Error loading referrals. Check console.</td></tr>';
    }
}

// Handle the "Approve" button click
async function handleApproveReferral(button) {
    const { id, referrerId } = button.dataset;
    if (!id || !referrerId || !confirm("Approve this referral for 250 UGX?")) return;

    button.disabled = true;
    button.textContent = 'Approving...';

    try {
        const requestRef = doc(db, "referralValidationRequests", id);
        const referrerRef = doc(db, "users", referrerId);
        await runTransaction(db, async (transaction) => {
            transaction.update(requestRef, { status: "approved", approvedAt: serverTimestamp() });
            transaction.update(referrerRef, { referralBalanceUGX: increment(250) });
        });
        await loadReferralRequests(); // Refresh the list
    } catch (e) {
        console.error("Error approving referral:", e);
        alert("Could not approve referral.");
        button.disabled = false;
        button.textContent = 'Approve';
    }
}

// Global event listener
adminContent.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action="approve-referral"]');
    if (btn) {
        handleApproveReferral(btn);
    }
});