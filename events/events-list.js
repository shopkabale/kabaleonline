import { db } from '/firebase.js';
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// Wait for the page's HTML to be fully loaded before running the script
document.addEventListener('DOMContentLoaded', function() {
    
    // Find the div on the page where we want to place the calendar
    const calendarEl = document.getElementById('calendar');

    // This is the main function that will fetch data and build the calendar
    async function fetchEventsAndRenderCalendar() {
        try {
            // 1. Fetch all events from your Firestore 'events' collection, ordered by date
            const eventsCollection = collection(db, 'events');
            const q = query(eventsCollection, orderBy('date', 'asc'));
            const querySnapshot = await getDocs(q);

            // 2. Loop through the Firestore documents and format them for FullCalendar
            // FullCalendar needs an array of objects with 'title', 'start', and 'url' properties.
            const events = querySnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    title: data.title || data.name, // Handles 'title' or 'name' field
                    start: data.date,             // The date of the event, e.g., '2025-09-20'
                    url: `/events/detail.html?id=${doc.id}` // The link for when an event is clicked
                };
            });

            // 3. Create a new FullCalendar instance with our settings and events
            const calendar = new FullCalendar.Calendar(calendarEl, {
                initialView: 'dayGridMonth', // The default view will be a month grid
                headerToolbar: {
                    left: 'prev,next today', // Navigation buttons
                    center: 'title',         // The month and year
                    right: 'dayGridMonth,timeGridWeek' // Buttons to switch between month/week view
                },
                events: events, // This is our array of events from Firestore
                
                // This makes the events in the calendar clickable
                eventClick: function(info) {
                    // Prevent the default browser action (which can be unreliable)
                    info.jsEvent.preventDefault(); 
                    
                    // If the event has a URL, navigate to that page
                    if (info.event.url) {
                        window.location.href = info.event.url;
                    }
                }
            });

            // 4. Render the calendar on the page
            calendar.render();

        } catch (error) {
            console.error("Error fetching events or rendering calendar:", error);
            calendarEl.innerHTML = '<p style="color:red; text-align:center;">Could not load the event calendar. Please try again later.</p>';
        }
    }

    // Run our main function to start the process
    fetchEventsAndRenderCalendar();
});
