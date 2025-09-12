import { auth, db } from '/firebase.js';
import { doc, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const eventTitle = document.getElementById('event-title');
const eventBannerImg = document.getElementById('event-banner-img');
const eventDate = document.getElementById('event-date');
const eventTime = document.getElementById('event-time');
const eventLocation = document.getElementById('event-location');
const eventDescription = document.getElementById('event-description');
const ownerActionsContainer = document.getElementById('owner-actions');

// NEW: Function to handle the deletion
async function deleteEvent(eventId) {
    if (confirm('Are you sure you want to permanently delete this event?')) {
        try {
            await deleteDoc(doc(db, 'events', eventId));
            alert('Event deleted successfully.');
            // Redirect user back to the main events list
            window.location.href = '/events/';
        } catch (error) {
            console.error("Error deleting event:", error);
            alert('Failed to delete event. Please try again.');
        }
    }
}

async function fetchEventDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('id');

    if (!eventId) {
        eventTitle.textContent = "Event Not Found";
        eventDescription.textContent = "No event ID was provided in the URL.";
        return;
    }

    try {
        const eventRef = doc(db, 'events', eventId);
        const docSnap = await getDoc(eventRef);

        if (docSnap.exists()) {
            const event = docSnap.data();
            
            // Populate the page with the data
            document.title = `${event.title} | Kabale Online`; 
            eventTitle.textContent = event.title;
            eventBannerImg.src = event.imageUrl;
            eventBannerImg.alt = event.title;
            
            const fullDate = new Date(event.date + 'T00:00:00');
            eventDate.textContent = fullDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            
            eventTime.textContent = event.time;
            eventLocation.textContent = event.location;
            eventDescription.textContent = event.description;

            // --- THIS IS THE NEW LOGIC ---
            // Check if a user is logged in AND if their ID matches the event's uploaderId
            const user = auth.currentUser;
            if (user && user.uid === event.uploaderId) {
                // If they are the owner, create and display the delete button
                const deleteButtonHTML = `<button id="delete-event-btn" class="action-btn" style="background-color: #dc3545; color: white;"><i class="fa-solid fa-trash"></i> Delete Event</button>`;
                ownerActionsContainer.innerHTML = deleteButtonHTML;
                
                // Add a click listener to the new button
                document.getElementById('delete-event-btn').addEventListener('click', () => deleteEvent(eventId));
            }

        } else {
            eventTitle.textContent = "Event Not Found";
            eventDescription.textContent = "The event you are looking for does not exist.";
        }
    } catch (error) {
        console.error("Error fetching event details:", error);
        eventTitle.textContent = "Error Loading Event";
        eventDescription.textContent = "There was a problem retrieving the event details.";
    }
}

// Load the event details when the page opens
fetchEventDetails();
