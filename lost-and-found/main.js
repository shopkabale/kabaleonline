import { db } from '../firebase.js';
import { collection, query, where, orderBy, getDocs, limit } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const lostItemsList = document.getElementById('lost-items-list');
const foundItemsList = document.getElementById('found-items-list');

async function fetchItems(status, element) {
    try {
        const q = query(
            collection(db, "lost_and_found"),
            where("status", "==", status),
            orderBy("createdAt", "desc"),
            limit(20)
        );
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            element.innerHTML = `<p>No ${status} items reported recently.</p>`;
            return;
        }

        element.innerHTML = '';
        querySnapshot.forEach(doc => {
            const item = doc.data();
            const card = document.createElement('div');
            card.className = `item-card ${item.status}`;
            const date = item.createdAt.toDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'short'});

            let contactHTML = '';
            // Only show contact info for FOUND items
            if (item.status === 'found') {
                // Prioritize the secure profile link for logged-in posters
                if (item.posterId) {
                    contactHTML = `<a href="/profile.html?sellerId=${item.posterId}" class="contact-button">View Profile to Contact</a>`;
                } else if (item.contactInfo) {
                    // Show public number only if poster was not logged in
                    contactHTML = `<p style="margin-top: 10px;"><strong>Contact:</strong> ${item.contactInfo}</p>`;
                }
            }

            card.innerHTML = `
                <h3>${item.itemName}</h3>
                <p>${item.description}</p>
                ${contactHTML}
                <div class="item-card-meta">
                    <strong>Area:</strong> ${item.location}<br>
                    <strong>Posted by:</strong> ${item.nickname} on ${date}
                </div>
            `;
            element.appendChild(card);
        });
    } catch (error) {
        console.error(`Error fetching ${status} items:`, error);
        element.innerHTML = `<p>Could not load items. The database index might be missing.</p>`;
    }
}

fetchItems('lost', lostItemsList);
fetchItems('found', foundItemsList);
