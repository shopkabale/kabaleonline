import { auth, db } from '/firebase.js';
import { doc, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// Get all the elements we need to update
const eventTitle = document.getElementById('event-title');
const eventBannerImg = document.getElementById('event-banner-img');
const eventMeta = document.getElementById('event-meta');
const eventDescription = document.getElementById('event-description');
const ownerActionsContainer = document.getElementById('owner-actions');
const chatBtn = document.getElementById('chat-with-uploader-btn');
const loginPrompt = document.getElementById('login-for-chat-prompt');

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
            
            // Populate the page with event data
            document.title = `${event.title} | Kabale Online`; 
            eventTitle.textContent = event.title;
            eventBannerImg.src = event.imageUrl;
            eventBannerImg.alt = event.title;
            const fullDate = new Date(event.date + 'T00:00:00');
            
            eventMeta.innerHTML = `
                <div class="meta-item">
                    <i class="fa-solid fa-calendar-day"></i>
                    <div><strong>Date</strong><br><span>${fullDate.toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span></div>
                </div>
                <div class="meta-item">
                    <i class="fa-solid fa-clock"></i>
                    <div><strong>Time</strong><br><span>${event.time}</span></div>
                </div>
                <div class="meta-item">
                    <i class="fa-solid fa-location-dot"></i>
                    <div><strong>Location</strong><br><span>${event.location}</span></div>
                </div>
            `;
            eventDescription.textContent = event.description;

            // Logic to show the correct button based on who is viewing the page
            const user = auth.currentUser;

            if (user && user.uid === event.uploaderId) {
                // Case 1: The viewer is the owner of the event -> Show Delete Button
                const deleteButtonHTML = `<button id="delete-event-btn" class="action-btn" style="background-color: #dc3545; color: white; margin-top: 10px;"><i class="fa-solid fa-trash"></i> Delete Event</button>`;
                ownerActionsContainer.innerHTML = deleteButtonHTML;
                document.getElementById('delete-event-btn').addEventListener('click', () => deleteEvent(eventId));
            } else if (user) {
                // Case 2: The viewer is logged in, but NOT the owner -> Show Chat Button
                chatBtn.href = `/chat.html?recipientId=${event.uploaderId}`;
                chatBtn.style.display = 'block';
            } else {
                // Case 3: The viewer is not logged in -> Show Login Prompt
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

fetchEventDetails();
