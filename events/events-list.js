import { db } from '/firebase.js';
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', function() {
    
    const calendarEl = document.getElementById('calendar');
    const calendarTitleEl = document.getElementById('calendar-title');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const todayBtn = document.getElementById('today-btn');
    const monthViewBtn = document.getElementById('month-view-btn');
    const weekViewBtn = document.getElementById('week-view-btn');

    const eventColors = ['#007bff', '#28a745', '#fd7e14', '#6f42c1', '#dc3545'];

    async function fetchEventsAndRenderCalendar() {
        try {
            const eventsCollection = collection(db, 'events');
            const q = query(eventsCollection, orderBy('date', 'asc'));
            const querySnapshot = await getDocs(q);

            let colorIndex = 0;
            const events = querySnapshot.docs.map(doc => {
                const data = doc.data();
                const color = eventColors[colorIndex % eventColors.length];
                colorIndex++;
                return {
                    id: doc.id,
                    title: data.title || data.name,
                    start: data.date,
                    url: `/events/detail.html?id=${doc.id}`,
                    color: color,
                    borderColor: color
                };
            });
            
            calendarEl.innerHTML = '';

            const calendar = new FullCalendar.Calendar(calendarEl, {
                initialView: 'dayGridMonth',
                headerToolbar: false,
                events: events,
                
                // ✨ THIS MAKES THE CALENDAR FIT THE SCREEN BETTER
                height: 'auto',

                datesSet: function(viewInfo) {
                    calendarTitleEl.innerText = viewInfo.view.title;
                },

                eventClick: function(info) {
                    info.jsEvent.preventDefault();
                    if (info.event.url) {
                        window.location.href = info.event.url;
                    }
                }
            });

            calendar.render();

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
            console.error("Error fetching events or rendering calendar:", error);
            calendarEl.innerHTML = '<p style="color:red; text-align:center;">Could not load the event calendar.</p>';
        }
    }

    fetchEventsAndRenderCalendar();
});
