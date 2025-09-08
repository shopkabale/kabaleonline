import { db } from '../firebase.js';
import { collection, query, where, orderBy, getDocs, limit, Timestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const lostItemsList = document.getElementById('lost-items-list');
const foundItemsList = document.getElementById('found-items-list');

async function fetchItems(status, element) {
    if (!element) return; // Exit if the container element doesn't exist

    try {
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
        const sixtyDaysAgoTimestamp = Timestamp.fromDate(sixtyDaysAgo);

        const q = query(
            collection(db, "lost_and_found"),
            where("status", "==", status),
            where("createdAt", ">", sixtyDaysAgoTimestamp),
            orderBy("createdAt", "desc"),
            limit(20)
        );
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            element.innerHTML = `<p>No ${status} items reported recently.</p>`;
            return;
        }

        element.innerHTML = ''; // Clear loading message
        querySnapshot.forEach(doc => {
            const item = doc.data();
            const card = document.createElement('div');
            card.className = `item-card ${item.status}`;
            const date = item.createdAt.toDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'short'});

            let contactHTML = '';
            if (item.status === 'found' && item.contactInfo) {
                contactHTML = `<a href="tel:${item.contactInfo}" class="contact-button">Contact Finder</a>`;
            } else if (item.status === 'lost') {
                 contactHTML = `<a href="/lost-and-found/post.html" class="contact-button">I Found This</a>`;
            }

            card.innerHTML = `
                <h3>${item.itemName}</h3>
                <p>${item.description}</p>
                <div class="item-card-meta">
                    <strong>Area:</strong> ${item.location}<br>
                    <strong>Posted by:</strong> ${item.nickname} on ${date}
                </div>
                ${contactHTML}
            `;
            element.appendChild(card);
        });

    } catch (error) {
        console.error(`Error fetching ${status} items:`, error);
        element.innerHTML = `<p>Could not load items. The database index might be missing.</p>`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    fetchItems('lost', lostItemsList);
    fetchItems('found', foundItemsList);
});
