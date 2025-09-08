import { db } from '../firebase.js';
import { collection, query, orderBy, where, getDocs, Timestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const requestsList = document.getElementById('requests-list');

async function fetchRequests() {
    try {
        // Only fetch requests from the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const thirtyDaysAgoTimestamp = Timestamp.fromDate(thirtyDaysAgo);

        const q = query(
            collection(db, "requests"), 
            where("createdAt", ">", thirtyDaysAgoTimestamp),
            orderBy("createdAt", "desc")
        );

        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            requestsList.innerHTML = '<p>No active requests at the moment. Be the first to post one!</p>';
            return;
        }

        requestsList.innerHTML = '';

        querySnapshot.forEach(doc => {
            const request = doc.data();
            const card = document.createElement('div');
            card.className = 'request-card';

            const date = request.createdAt
                ? request.createdAt.toDate().toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'short', year: 'numeric'
                  })
                : 'a few moments ago';

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
        requestsList.innerHTML = '<p>Sorry, could not load requests. Please check the console for a missing index error.</p>';
    }
}

fetchRequests();