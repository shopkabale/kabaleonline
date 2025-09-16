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

// ✨ 1. NEW FUNCTION TO SET UP THE SHARE BUTTON
async function setupShareButton(event) {
    const shareBtn = document.getElementById('share-btn');
    if (!shareBtn) return;

    // Show the button now that we have the event data
    shareBtn.style.display = 'flex';

    shareBtn.addEventListener('click', async () => {
        const shareData = {
            title: event.title,
            text: `Check out this event on Kabale Online: ${event.title}`,
            url: window.location.href,
        };

        try {
            // Use the native Web Share API if available
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                // Fallback to copying the link to the clipboard
                await navigator.clipboard.writeText(window.location.href);
                
                // Provide visual feedback
                const originalIcon = shareBtn.innerHTML;
                shareBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
                shareBtn.classList.add('copied');
                
                setTimeout(() => {
                    shareBtn.innerHTML = originalIcon;
                    shareBtn.classList.remove('copied');
                }, 2000); // Revert after 2 seconds
            }
        } catch (err) {
            console.error("Share failed:", err);
            alert("Could not share. Please copy the link manually.");
        }
    });
}


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

            document.title = `${event.title} | Kabale Online`; 
            eventTitle.textContent = event.title;
            eventBannerImg.src = event.imageUrl; // Consider using your Cloudinary helper here too!
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

            const user = auth.currentUser;

            if (user && user.uid === event.uploaderId) {
                const deleteButtonHTML = `<button id="delete-event-btn" class="action-btn" style="background-color: #dc3545; color: white; margin-top: 10px;"><i class="fa-solid fa-trash"></i> Delete Event</button>`;
                ownerActionsContainer.innerHTML = deleteButtonHTML;
                document.getElementById('delete-event-btn').addEventListener('click', () => deleteEvent(eventId));
            } else if (user) {
                chatBtn.href = `/chat.html?recipientId=${event.uploaderId}`;
                chatBtn.style.display = 'block';
            } else {
                loginPrompt.style.display = 'block';
            }
            
            // ✨ 2. CALL THE SHARE BUTTON SETUP FUNCTION
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
