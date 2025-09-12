import { auth, db } from '/firebase.js';
import { doc, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const eventTitle = document.getElementById('event-title');
const eventBannerImg = document.getElementById('event-banner-img');
const eventDate = document.getElementById('event-date');
const eventTime = document.getElementById('event-time');
const eventLocation = document.getElementById('event-location');
const eventDescription = document.getElementById('event-description');

// Get the new elements from the HTML
const ownerActionsContainer = document.getElementById('owner-actions');
const chatBtn = document.getElementById('chat-with-uploader-btn');
const loginPrompt = document.getElementById('login-for-chat-prompt');

// Function to handle the deletion
async function deleteEvent(eventId) {
    if (confirm('Are you sure you want to permanently delete this event?')) {
        try {
            await deleteDoc(doc(db, 'events', eventId));
            alert('Event deleted successfully.');
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
        return;
    }

    try {
        const eventRef = doc(db, 'events', eventId);
        const docSnap = await getDoc(eventRef);

        if (docSnap.exists()) {
            const event = docSnap.data();
            
            // Populate the page with the event data
            document.title = `${event.title} | Kabale Online`; 
            eventTitle.textContent = event.title;
            eventBannerImg.src = event.imageUrl;
            eventBannerImg.alt = event.title;
            const fullDate = new Date(event.date + 'T00:00:00');
            eventDate.textContent = fullDate.toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            eventTime.textContent = event.time;
            eventLocation.textContent = event.location;
            eventDescription.textContent = event.description;

            // --- NEW LOGIC TO SHOW THE CORRECT BUTTON ---
            const user = auth.currentUser;

            // Case 1: The viewer is the owner of the event
            if (user && user.uid === event.uploaderId) {
                const deleteButtonHTML = `<button id="delete-event-btn" class="action-btn" style="background-color: #dc3545; color: white; margin-top: 10px;"><i class="fa-solid fa-trash"></i> Delete Event</button>`;
                ownerActionsContainer.innerHTML = deleteButtonHTML;
                document.getElementById('delete-event-btn').addEventListener('click', () => deleteEvent(eventId));
            } 
            // Case 2: The viewer is logged in, but NOT the owner
            else if (user) {
                chatBtn.href = `/chat.html?recipientId=${event.uploaderId}`;
                chatBtn.style.display = 'block';
            } 
            // Case 3: The viewer is not logged in
            else {
                loginPrompt.style.display = 'block';
            }

        } else {
            eventTitle.textContent = "Event Not Found";
        }
    } catch (error) {
        console.error("Error fetching event details:", error);
        eventTitle.textContent = "Error Loading Event";
    }
}

// Load the event details when the page opens
fetchEventDetails();
