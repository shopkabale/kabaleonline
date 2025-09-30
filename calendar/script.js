import { auth, db } from '../js/auth.js';
import { collection, getDocs, addDoc, serverTimestamp, doc, getDoc, deleteDoc, query } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- DOM ELEMENTS ---
const loader = document.getElementById('calendar-loader');
const calendarWrapper = document.getElementById('calendar-wrapper');
const calendarEl = document.getElementById('calendar');
const eventModal = document.getElementById('event-modal');
const eventForm = document.getElementById('event-form');
const cancelEventBtn = document.getElementById('cancel-event-btn');
const eventTitleInput = document.getElementById('event-title');
const eventDateInput = document.getElementById('event-date');

// Custom Header Elements
const calendarTitleEl = document.getElementById('calendar-title');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const todayBtn = document.getElementById('today-btn');
const viewSwitcher = document.querySelector('.view-switcher');

let currentUser = null;
let calendar = null;

// --- AUTHENTICATION ---
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        initializeCalendar();
        setupCustomHeaderListeners();
    }
});

// --- FULLCALENDAR INITIALIZATION ---
function initializeCalendar() {
    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: false, // Using our own custom header
        height: 'auto', // Prevents internal scrollbar on mobile
        
        // Fetch events from Firestore
        events: async function(fetchInfo, successCallback, failureCallback) {
            try {
                const eventsCollectionRef = collection(db, 'users', currentUser.uid, 'calendarEvents');
                const querySnapshot = await getDocs(eventsCollectionRef);
                const events = [];
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    if (data.start && data.start.toDate) { // Check if 'start' is a valid timestamp
                        events.push({
                            id: doc.id,
                            title: data.title,
                            start: data.start.toDate()
                        });
                    }
                });
                successCallback(events);
            } catch (error) {
                console.error("Error fetching calendar events:", error);
                failureCallback(error);
            }
        },

        // Handle clicking on a date to open the add-event modal
        dateClick: function(info) {
            eventForm.reset();
            eventDateInput.value = info.dateStr;
            eventModal.style.display = 'flex';
        },

        // Handle clicking on an existing event to delete it
        eventClick: async function(info) {
            const eventId = info.event.id;
            const eventTitle = info.event.title;
            if (confirm(`Do you want to delete the event: "${eventTitle}"?`)) {
                try {
                    const eventDocRef = doc(db, 'users', currentUser.uid, 'calendarEvents', eventId);
                    await deleteDoc(eventDocRef);
                    calendar.refetchEvents();
                    alert('Event deleted!');
                } catch (error) {
                    console.error("Error deleting event:", error);
                    alert('Could not delete the event.');
                }
            }
        },

        // Update our custom title when the view or date changes
        datesSet: function(viewInfo) {
            calendarTitleEl.textContent = viewInfo.view.title;
        }
    });

    calendar.render();
    loader.style.display = 'none';
    calendarWrapper.style.display = 'block';
}

// --- CONTROL CUSTOM HEADER BUTTONS ---
function setupCustomHeaderListeners() {
    prevBtn.addEventListener('click', () => calendar.prev());
    nextBtn.addEventListener('click', () => calendar.next());
    todayBtn.addEventListener('click', () => calendar.today());
    
    viewSwitcher.addEventListener('click', (e) => {
        if (e.target.classList.contains('view-btn')) {
            const currentActive = viewSwitcher.querySelector('.active-view');
            if (currentActive) {
                currentActive.classList.remove('active-view');
            }
            e.target.classList.add('active-view');
            calendar.changeView(e.target.dataset.view);
        }
    });
}

// --- MODAL & FORM EVENT LISTENERS ---
cancelEventBtn.addEventListener('click', () => {
    eventModal.style.display = 'none';
});

eventForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = eventTitleInput.value;
    const startDate = new Date(eventDateInput.value + 'T00:00:00');

    if (!title || !startDate || !currentUser) return;

    try {
        const eventsCollectionRef = collection(db, 'users', currentUser.uid, 'calendarEvents');
        await addDoc(eventsCollectionRef, {
            title: title,
            start: startDate, // Firestore converts JS Date to a timestamp
            createdAt: serverTimestamp()
        });
        
        calendar.refetchEvents();
        eventModal.style.display = 'none';

    } catch (error) {
        console.error("Error adding event:", error);
        alert("Failed to save the event. Please try again.");
    }
});