import { db } from '/firebase.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const eventTitle = document.getElementById('event-title');
const eventBannerImg = document.getElementById('event-banner-img');
const eventDate = document.getElementById('event-date');
const eventTime = document.getElementById('event-time');
const eventLocation = document.getElementById('event-location');
const eventDescription = document.getElementById('event-description');

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
            
            document.title = `${event.title} | Kabale Online`; 
            eventTitle.textContent = event.title;
            eventBannerImg.src = event.imageUrl;
            eventBannerImg.alt = event.title;
            
            const fullDate = new Date(event.date + 'T00:00:00');
            eventDate.textContent = fullDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            
            eventTime.textContent = event.time;
            eventLocation.textContent = event.location;
            eventDescription.textContent = event.description;

        } else {
            eventTitle.textContent = "Event Not Found";
            eventDescription.textContent = "The event you are looking for does not exist.";
        }
    } catch (error) a{
        console.error("Error fetching event details:", error);
        eventTitle.textContent = "Error Loading Event";
        eventDescription.textContent = "There was a problem retrieving the event details.";
    }
}

fetchEventDetails();
