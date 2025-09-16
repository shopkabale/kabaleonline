// /events/event-detail.js

import { auth, db } from '/firebase.js';
import { doc, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// ... (keep all the existing code at the top: get all elements, setupShareButton, etc.)

const eventTitle = document.getElementById('event-title');
const eventBannerImg = document.getElementById('event-banner-img');
const eventMeta = document.getElementById('event-meta');
const eventDescription = document.getElementById('event-description');
const ownerActionsContainer = document.getElementById('owner-actions');
const chatBtn = document.getElementById('chat-with-uploader-btn');
const loginPrompt = document.getElementById('login-for-chat-prompt');

async function setupShareButton(event) {
    // ... (no changes needed in this function)
}

async function deleteEvent(eventId) {
    // ... (no changes needed in this function)
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

            // ... (keep all the existing code for populating event data)
            document.title = `${event.title} | Kabale Online`; 
            eventTitle.textContent = event.title;
            // ... etc.

            const user = auth.currentUser;

            // ✨ --- MODIFICATION START --- ✨
            if (user && user.uid === event.uploaderId) {
                // Now we add both an Edit and a Delete button
                const editButtonHTML = `<a href="/events/edit.html?id=${eventId}" class="action-btn" style="background-color: #ffc107; color: #212529;"><i class="fa-solid fa-pen-to-square"></i> Edit Event</a>`;
                const deleteButtonHTML = `<button id="delete-event-btn" class="action-btn" style="background-color: #dc3545; color: white; margin-top: 10px;"><i class="fa-solid fa-trash"></i> Delete Event</button>`;
                
                // Set the innerHTML for the container with both buttons
                ownerActionsContainer.innerHTML = editButtonHTML + deleteButtonHTML;
                
                // Add the event listener for the delete button as before
                document.getElementById('delete-event-btn').addEventListener('click', () => deleteEvent(eventId));

            } else if (user) {
                // ... (no changes to the rest of the file)
                chatBtn.href = `/chat.html?recipientId=${event.uploaderId}`;
                chatBtn.style.display = 'block';
            } else {
                loginPrompt.style.display = 'block';
            }
            // ✨ --- MODIFICATION END --- ✨

            setupShareButton(event);

        } else {
            eventTitle.textContent = "Event Not Found";
        }
    } catch (error) {
        console.error("Error fetching event details:", error);
        eventTitle.textContent = "Error Loading Event";
    }
}

fetchEventDetails();
