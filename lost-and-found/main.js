import { db } from '../firebase.js';
import { collection, query, where, orderBy, getDocs, limit, Timestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const lostItemsList = document.getElementById('lost-items-list');
const foundItemsList = document.getElementById('found-items-list');

async function fetchItems(status, element) {
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

        element.innerHTML = '';
        querySnapshot.forEach(doc => {
            const item = doc.data();
            const card = document.createElement('div');
            card.className = `item-card ${item.status}`;
            const date = item.createdAt.toDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'short'});

            let contactHTML = '';
            if (item.status === 'found') {
                if (item.posterId) {
                    contactHTML = `<a href="/profile.html?sellerId=${item.posterId}" class="contact-button">View Profile to Contact</a>`;
                } else if (item.contactInfo) {
                    contactHTML = `<p style="margin-top: 10px;"><strong>Contact:</strong> ${item.contactInfo}</p>`;
                }
            }
            
            // MODIFICATION START: Add placeholder for the timer
            // We pass the creation time into the element using a data attribute
            card.innerHTML = `
                <h3>${item.itemName}</h3>
                <p>${item.description}</p>
                ${contactHTML}
                <div class="item-card-timer" id="timer-${doc.id}" data-created-at="${item.createdAt.seconds}">
                    Calculating time left...
                </div>
                <div class="item-card-meta">
                    <strong>Area:</strong> ${item.location}<br>
                    <strong>Posted by:</strong> ${item.nickname} on ${date}
                </div>
            `;
            // MODIFICATION END
            element.appendChild(card);
        });

    } catch (error) {
        console.error(`Error fetching ${status} items:`, error);
        element.innerHTML = `<p>Could not load items. The database index might be missing.</p>`;
    }
}

// --- NEW COUNTDOWN TIMER LOGIC ---
function updateTimers() {
    const timerElements = document.querySelectorAll('.item-card-timer');
    const now = new Date().getTime();

    timerElements.forEach(timer => {
        const createdAtSeconds = parseInt(timer.dataset.createdAt, 10);
        // Expiry is 60 days after creation
        const expiryTime = (createdAtSeconds + (60 * 24 * 60 * 60)) * 1000;
        
        const timeLeft = expiryTime - now;

        if (timeLeft <= 0) {
            timer.textContent = "Expired";
            // Optionally, hide the whole card
            // timer.closest('.item-card').style.display = 'none';
        } else {
            const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
            const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
            
            timer.textContent = `Expires in: ${days}d ${hours}h ${minutes}m ${seconds}s`;
        }
    });
}

async function initializePage() {
    await fetchItems('lost', lostItemsList);
    await fetchItems('found', foundItemsList);
    // After items are loaded, start the timer
    updateTimers(); // Run once immediately
    setInterval(updateTimers, 1000); // Then update every second
}

initializePage();
