import { db } from '/firebase.js';
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', function() {
    
    // --- ELEMENT REFERENCES ---
    const calendarEl = document.getElementById('calendar');
    const calendarTitleEl = document.getElementById('calendar-title');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const todayBtn = document.getElementById('today-btn');
    const monthViewBtn = document.getElementById('month-view-btn');
    const weekViewBtn = document.getElementById('week-view-btn');
    const clockEl = document.getElementById('live-clock');

    // --- LIVE CLOCK LOGIC ---
    function updateClock() {
        if (!clockEl) return;
        const now = new Date();
        const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };
        const dateString = now.toLocaleDateString('en-US', dateOptions);
        const timeString = now.toLocaleTimeString('en-US', timeOptions);
        clockEl.innerHTML = `${dateString} | ${timeString}`;
    }
    // Update the clock immediately and then every second
    updateClock();
    setInterval(updateClock, 1000);

    // --- CALENDAR LOGIC ---
    async function fetchEventsAndRenderCalendar() {
        try {
            const eventsCollection = collection(db, 'events');
            const q = query(eventsCollection, orderBy('date', 'asc'));
            const querySnapshot = await getDocs(q);

            // Get today's date at midnight for accurate comparison
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Format events and add a custom class based on the date
            const events = querySnapshot.docs.map(doc => {
                const data = doc.data();
                const eventDate = new Date(data.date + 'T00:00:00'); // Use T00:00:00 to avoid timezone issues
                
                let className = 'event-future'; // Default to future
                if (eventDate < today) {
                    className = 'event-past';
                } else if (eventDate.getTime() === today.getTime()) {
                    className = 'event-today';
                }

                return {
                    id: doc.id,
                    title: data.title || data.name,
                    start: data.date,
                    url: `/events/detail.html?id=${doc.id}`,
                    classNames: [className] // Use classNames to apply our styles
                };
            });
            
            calendarEl.innerHTML = ''; // Fixes the "Loading..." bug

            const calendar = new FullCalendar.Calendar(calendarEl, {
                initialView: 'dayGridMonth',
                headerToolbar: false, // Use our custom header
                events: events,
                
                // ✨ FIX: This makes the calendar expand with events, not scroll
                contentHeight: 'auto',

                datesSet: (viewInfo) => {
                    calendarTitleEl.innerText = viewInfo.view.title;
                },
                eventClick: (info) => {
                    info.jsEvent.preventDefault();
                    if (info.event.url) {
                        window.location.href = info.event.url;
                    }
                }
            });

            calendar.render();

            // Wire up custom buttons
            prevBtn.addEventListener('click', () => calendar.prev());
            nextBtn.addEventListener('click', () => calendar.next());
            todayBtn.addEventListener('click', () => calendar.today());
            
            monthViewBtn.addEventListener('click', () => {
                calendar.changeView('dayGridMonth');
                monthViewBtn.classList.add('active');
                weekViewBtn.classList.remove('active');
            });
            
            weekViewBtn.addEventListener('click', () => {
                calendar.changeView('timeGridWeek');
                weekViewBtn.classList.add('active');
                monthViewBtn.classList.remove('active');
            });

        } catch (error) {
            console.error("Error with calendar:", error);
            calendarEl.innerHTML = '<p style="color:red; text-align:center;">Could not load the event calendar.</p>';
        }
    }

    fetchEventsAndRenderCalendar();
});
