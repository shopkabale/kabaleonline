import { db } from '../firebase.js';
import { collection, query, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const requestsList = document.getElementById('requests-list');

async function fetchRequests() {
    try {
        const q = query(collection(db, "requests"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            requestsList.innerHTML = '<p>No active requests at the moment. Be the first to post one!</p>';
            return;
        }

        requestsList.innerHTML = ''; // Clear loading message

        querySnapshot.forEach(doc => {
            const request = doc.data();
            const card = document.createElement('div');
            card.className = 'request-card';

            // Format the date nicely
            const date = request.createdAt ? request.createdAt.toDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric'}) : 'a few moments ago';

            card.innerHTML = `
                <h3>${request.item}</h3>
                ${request.details ? `<p>${request.details}</p>` : ''}
                <div class="request-card-meta">
                    Posted by <strong>${request.nickname}</strong> on ${date}
                </div>
            `;
            requestsList.appendChild(card);
        });

    } catch (error) {
        console.error("Error fetching requests:", error);
        requestsList.innerHTML = '<p>Sorry, could not load requests. Please try again later.</p>';
    }
}

fetchRequests();
