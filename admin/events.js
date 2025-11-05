import { db } from '../firebase.js';
import { checkAdminAuth, setupHeader } from './admin-common.js';
import { collection, getDocs, doc, deleteDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

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
        setupEventListeners(); // <-- Add this
    });
}

/**
 * Add event listener for delete button
 */
function setupEventListeners() {
    adminContent.addEventListener('click', (e) => {
        const button = e.target.closest('button[data-action]');
        if (!button) return;
        
        if (button.dataset.action === 'delete-event') {
            handleDeleteEvent(button);
        }
    });
}


async function fetchAllEvents() {
    eventList.innerHTML = '<li>Loading events...</li>';
    try {
        // Use the 'date' field to order events, most recent first
        const q = query(collection(db, 'events'), orderBy('date', 'desc'));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            eventList.innerHTML = '<li>No events found.</li>';
            return;
        }
        
        eventList.innerHTML = '';
        snapshot.forEach(docSnap => {
            const event = docSnap.data();
            const id = docSnap.id;

            // --- UPDATED LOGIC (Matches your data structure) ---
            const title = event.title || 'Unnamed Event';
            const price = event.price || 0;
            const location = event.location || 'N/A';
            const imageUrl = event.imageUrl || 'https://placehold.co/100';
            const description = event.description || 'No description.';
            const eventDate = event.date || 'No Date';
            const eventTime = event.time || '';

            // Format price
            const priceString = price === 0 ? 'Free Entry' : `UGX ${price.toLocaleString()}`;
            // --- END UPDATED LOGIC ---

            const li = document.createElement('li');
            li.className = 'user-list-item';
            li.style.alignItems = 'flex-start'; // Align content to the top
            
            // New, more detailed card layout
            li.innerHTML = `
                <img src="${imageUrl}" alt="${title}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 4px; margin-right: 15px;">
                <div style="flex-grow: 1;">
                    <p style="font-weight: bold; font-size: 1.2em; margin: 0 0 5px 0;">${title}</p>
                    
                    <p style="margin: 5px 0; color: var(--text-secondary); font-weight: bold;">
                        <i class="fa-solid fa-calendar-day" style="margin-right: 5px;"></i> ${eventDate}
                        <span style="margin-left: 10px;"><i class="fa-solid fa-clock" style="margin-right: 5px;"></i> ${eventTime}</span>
                    </p>
                    
                    <p style="margin: 5px 0; color: var(--text-secondary);"><i class="fa-solid fa-location-dot" style="margin-right: 5px;"></i> ${location}</p>
                    <p style="margin: 5px 0; font-size: 0.9em;">${description}</p>
                    <p style="margin: 8px 0 0 0; font-weight:bold; color:green;">${priceString}</p>
                </div>
                <button class="action-btn red" 
                        data-action="delete-event" 
                        data-id="${id}" 
                        data-name="${title.replace(/"/g, '&quot;')}">
                    Delete
                </button>
            `;
            
            eventList.appendChild(li);
        });
    } catch (e) { 
        console.error("Error fetching events:", e); 
        eventList.innerHTML = '<li>Could not load events.</li>'; 
    }
}

/**
 * New function to handle deleting an event
 */
async function handleDeleteEvent(button) {
    const id = button.dataset.id;
    const name = button.dataset.name;
    
    if (!confirm(`Are you sure you want to delete the event "${name}"?`)) return;
    
    button.disabled = true;
    button.textContent = 'Deleting...';
    
    try {
        await deleteDoc(doc(db, 'events', id));
        await fetchAllEvents(); // Refresh the list
    } catch (e) {
        console.error("Error deleting event:", e);
        alert("Failed to delete the event.");
        button.disabled = false;
        button.textContent = 'Delete';
    }
}

// --- START THE APP ---
document.addEventListener('DOMContentLoaded', initializeEventManagement);