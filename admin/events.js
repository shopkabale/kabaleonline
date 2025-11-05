import { db } from '../firebase.js';
import { checkAdminAuth, setupHeader } from './admin-common.js';
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- DOM ELEMENTS ---
const adminContent = document.getElementById('admin-content');
const loader = document.getElementById('loader');
const eventList = document.getElementById('event-list');

/**
 * Main initialization function.
 */
function initializeEventManagement() {
    checkAdminAuth((adminData) => {
        setupHeader(adminData.name); 
        adminContent.style.display = 'block';
        loader.style.display = 'none';

        fetchAllEvents();
    });
}

async function fetchAllEvents() {
    eventList.innerHTML = '<li>Loading events...</li>';
    try {
        // Assuming you have an 'events' collection
        const q = query(collection(db, 'events'), orderBy('eventDate', 'desc'));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            eventList.innerHTML = '<li>No events found.</li>';
            return;
        }
        
        eventList.innerHTML = '';
        snapshot.forEach(docSnap => {
            const event = docSnap.data();
            const eventDate = event.eventDate?.toDate().toLocaleString() || 'No date';

            const li = document.createElement('li');
            li.className = 'user-list-item';
            // Customize this with your event data structure
            li.innerHTML = `
                <div>
                    <p><strong>${event.eventName || 'Unnamed Event'}</strong></p>
                    <p>Date: ${eventDate}</p>
                    <p>Location: ${event.location || 'N/A'}</p>
                </div>
            `;
            eventList.appendChild(li);
        });
    } catch (e) { 
        console.error("Error fetching events:", e); 
        eventList.innerHTML = '<li>Could not load events.</li>'; 
    }
}

// --- START THE APP ---
document.addEventListener('DOMContentLoaded', initializeEventManagement);