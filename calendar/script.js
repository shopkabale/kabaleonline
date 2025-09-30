import { auth, db } from '../js/auth.js';
import { collection, getDocs, addDoc, serverTimestamp, doc, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { showMessage } from '../js/shared.js';

// --- DOM ELEMENTS ---
const loader = document.getElementById('calendar-loader');
const calendarEl = document.getElementById('calendar');
const eventModal = document.getElementById('event-modal');
const eventForm = document.getElementById('event-form');
const cancelEventBtn = document.getElementById('cancel-event-btn');
const eventTitleInput = document.getElementById('event-title');
const eventDateInput = document.getElementById('event-date');

let currentUser = null;
let calendar = null;

// --- AUTHENTICATION ---
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        initializeCalendar();
    }
});

// --- FULLCALENDAR INITIALIZATION ---
function initializeCalendar() {
    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        
        // --- Fetch events from Firestore ---
        events: async function(fetchInfo, successCallback, failureCallback) {
            try {
                const eventsCollectionRef = collection(db, 'users', currentUser.uid, 'calendarEvents');
                const querySnapshot = await getDocs(eventsCollectionRef);
                const events = [];
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    events.push({
                        id: doc.id,
                        title: data.title,
                        start: data.start.toDate() // Convert Firestore timestamp to JS Date
                    });
                });
                successCallback(events);
            } catch (error) {
                console.error("Error fetching calendar events:", error);
                failureCallback(error);
            }
        },

        // --- Handle clicking on a date ---
        dateClick: function(info) {
            eventForm.reset();
            eventDateInput.value = info.dateStr; // Pre-fill the date
            eventModal.style.display = 'flex';
        },

        // --- Handle clicking on an existing event ---
        eventClick: async function(info) {
            const eventId = info.event.id;
            const eventTitle = info.event.title;
            if (confirm(`Do you want to delete the event: "${eventTitle}"?`)) {
                try {
                    const eventDocRef = doc(db, 'users', currentUser.uid, 'calendarEvents', eventId);
                    await deleteDoc(eventDocRef);
                    calendar.refetchEvents(); // Refresh the calendar
                    alert('Event deleted!');
                } catch (error) {
                    console.error("Error deleting event:", error);
                    alert('Could not delete the event.');
                }
            }
        }
    });

    calendar.render();
    loader.style.display = 'none';
    calendarEl.style.display = 'block';
}


// --- MODAL & FORM EVENT LISTENERS ---

// Close the modal when "Cancel" is clicked
cancelEventBtn.addEventListener('click', () => {
    eventModal.style.display = 'none';
});

// Handle new event submission
eventForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = eventTitleInput.value;
    const startDate = new Date(eventDateInput.value + 'T00:00:00'); // Ensure it's treated as local time

    if (!title || !startDate || !currentUser) return;

    try {
        const eventsCollectionRef = collection(db, 'users', currentUser.uid, 'calendarEvents');
        await addDoc(eventsCollectionRef, {
            title: title,
            start: startDate, // Firestore will convert JS Date to a timestamp
            createdAt: serverTimestamp()
        });
        
        calendar.refetchEvents(); // Refresh the calendar to show the new event
        eventModal.style.display = 'none'; // Close the modal

    } catch (error) {
        console.error("Error adding event:", error);
        alert("Failed to save the event. Please try again.");
    }
});