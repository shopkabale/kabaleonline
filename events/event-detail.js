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

// ✨ --- NEW FUNCTION: Injects CSS for the full-screen image modal --- ✨
function injectModalStyles() {
    // Check if styles are already injected to avoid duplicates
    if (document.getElementById('image-modal-styles')) return;

    const style = document.createElement('style');
    style.id = 'image-modal-styles';
    style.innerHTML = `
        /* Adds a pointer cursor to show the image is clickable */
        .expandable-image {
            cursor: pointer;
            transition: transform 0.2s ease-in-out;
        }
        .expandable-image:hover {
            transform: scale(1.02); /* Slight zoom effect on hover */
        }
        /* The full-screen black overlay */
        .image-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.85);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            cursor: pointer;
        }
        /* The image inside the overlay */
        .image-modal-overlay img {
            max-width: 90vw;  /* Max width is 90% of viewport width */
            max-height: 90vh; /* Max height is 90% of viewport height */
            object-fit: contain;
            border-radius: 5px;
        }
    `;
    document.head.appendChild(style);
}

// ✨ --- NEW FUNCTION: Makes the banner image clickable --- ✨
function makeImageExpandable(imgElement) {
    // Add the class that makes the cursor a pointer
    imgElement.classList.add('expandable-image');

    // Listen for a click on the image
    imgElement.addEventListener('click', () => {
        // Create the modal overlay div
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'image-modal-overlay';

        // Create the image element for the modal
        const modalImage = document.createElement('img');
        modalImage.src = imgElement.src;
        modalImage.alt = imgElement.alt;

        // Add the image to the overlay, and the overlay to the page
        modalOverlay.appendChild(modalImage);
        document.body.appendChild(modalOverlay);

        // To close the modal, the user can click anywhere on the overlay
        modalOverlay.addEventListener('click', () => {
            document.body.removeChild(modalOverlay);
        });
    });
}

// (The setupShareButton function remains unchanged)
async function setupShareButton(event) {
    const shareBtn = document.getElementById('share-btn');
    if (!shareBtn) return;
    shareBtn.style.display = 'flex';
    shareBtn.addEventListener('click', async () => {
        const shareData = {
            title: event.title,
            text: `Check out this event on Kabale Online: ${event.title}`,
            url: window.location.href,
        };
        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(window.location.href);
                const originalIcon = shareBtn.innerHTML;
                shareBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
                shareBtn.classList.add('copied');
                setTimeout(() => {
                    shareBtn.innerHTML = originalIcon;
                    shareBtn.classList.remove('copied');
                }, 2000);
            }
        } catch (err) {
            console.error("Share failed:", err);
            alert("Could not share. Please copy the link manually.");
        }
    });
}

// (The deleteEvent function remains unchanged)
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
            eventBannerImg.src = event.imageUrl;
            eventBannerImg.alt = event.title;

            // ✨ --- MODIFICATION: Call the new function to make the image expandable --- ✨
            makeImageExpandable(eventBannerImg);

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
                const editButtonHTML = `<a href="/events/edit.html?id=${eventId}" class="action-btn" style="background-color: #ffc107; color: #212529;"><i class="fa-solid fa-pen-to-square"></i> Edit Event</a>`;
                const deleteButtonHTML = `<button id="delete-event-btn" class="action-btn" style="background-color: #dc3545; color: white; margin-top: 10px;"><i class="fa-solid fa-trash"></i> Delete Event</button>`;
                ownerActionsContainer.innerHTML = editButtonHTML + deleteButtonHTML;
                document.getElementById('delete-event-btn').addEventListener('click', () => deleteEvent(eventId));
            } else if (user) {
                chatBtn.href = `/chat.html?recipientId=${event.uploaderId}`;
                chatBtn.style.display = 'block';
            } else {
                loginPrompt.style.display = 'block';
            }

            setupShareButton(event);

        } else {
            eventTitle.textContent = "Event Not Found";
        }
    } catch (error) {
        console.error("Error fetching event details:", error);
        eventTitle.textContent = "Error Loading Event";
    }
}

// Initial call to run the function when the page loads
fetchEventDetails();

// ✨ --- MODIFICATION: Call the function to add the necessary CSS to the page --- ✨
injectModalStyles();
