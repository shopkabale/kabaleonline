import { db } from '/firebase.js';
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', function() {

    // --- ELEMENT REFERENCES ---
    const calendarEl = document.getElementById('calendar');
    const calendarTitleEl = document.getElementById('calendar-title');
    const clockEl = document.getElementById('live-clock');
    
    // Main View Containers
    const calendarViewContainer = document.getElementById('calendar');
    const listViewContainer = document.getElementById('events-list');
    const calendarSubView = document.getElementById('calendar-sub-view');

    // Buttons
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const todayBtn = document.getElementById('today-btn');
    const monthViewBtn = document.getElementById('month-view-btn');
    const weekViewBtn = document.getElementById('week-view-btn');
    const calendarViewBtn = document.getElementById('calendar-view-btn');
    const listViewBtn = document.getElementById('list-view-btn');

    // --- STATE ---
    let allEvents = [];
    let calendarInstance = null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

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

    // --- DATA FETCHING ---
    async function fetchEvents() {
        try {
            const eventsCollection = collection(db, 'events');
            const q = query(eventsCollection, orderBy('date', 'asc'));
            const querySnapshot = await getDocs(q);

            allEvents = querySnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    title: data.title || data.name,
                    date: data.date,
                    time: data.time,
                    location: data.location,
                    url: `/events/detail.html?id=${doc.id}`
                };
            });
        } catch (error) {
            console.error("Error fetching events:", error);
            calendarEl.innerHTML = '<p style="color:red; text-align:center;">Could not load events.</p>';
        }
    }

    // --- RENDER FUNCTIONS ---
    function renderCalendar() {
        // Format events for FullCalendar
        const calendarEvents = allEvents.map(event => {
            const eventDate = new Date(event.date + 'T00:00:00');
            let className = 'event-future';
            if (eventDate < today) className = 'event-past';
            else if (eventDate.getTime() === today.getTime()) className = 'event-today';
            
            return {
                id: event.id,
                title: event.title,
                start: event.date,
                url: event.url,
                classNames: [className]
            };
        });

        calendarEl.innerHTML = '';
        calendarInstance = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            headerToolbar: false,
            events: calendarEvents,
            contentHeight: 'auto',
            datesSet: (viewInfo) => {
                calendarTitleEl.innerText = viewInfo.view.title;
            },
            eventClick: (info) => {
                info.jsEvent.preventDefault();
                if (info.event.url) window.location.href = info.event.url;
            }
        });
        calendarInstance.render();
    }

    function renderList() {
        if (allEvents.length === 0) {
            listViewContainer.innerHTML = '<p class="no-events-message">No events found.</p>';
            return;
        }

        // Sort events from newest to oldest for the list view
        const sortedEvents = [...allEvents].sort((a, b) => new Date(b.date) - new Date(a.date));

        const listHTML = sortedEvents.map(event => {
            const eventDate = new Date(event.date + 'T00:00:00');
            let statusClass = 'event-card-future';
            if (eventDate < today) statusClass = 'event-card-past';
            else if (eventDate.getTime() === today.getTime()) statusClass = 'event-card-today';
            
            const formattedDate = eventDate.toLocaleDateString('en-US', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            });

            return `
                <a href="${event.url}" class="event-card ${statusClass}">
                    <div class="event-card-header">
                        <h3>${event.title}</h3>
                    </div>
                    <div class="event-card-body">
                        <div class="event-meta-item">
                            <i class="fa-solid fa-calendar-day"></i>
                            <span>${formattedDate}</span>
                        </div>
                        <div class="event-meta-item">
                            <i class="fa-solid fa-clock"></i>
                            <span>${event.time}</span>
                        </div>
                        <div class="event-meta-item">
                            <i class="fa-solid fa-location-dot"></i>
                            <span>${event.location}</span>
                        </div>
                    </div>
                </a>
            `;
        }).join('');

        listViewContainer.innerHTML = `<div class="event-list-container">${listHTML}</div>`;
    }

    // --- UI & EVENT LISTENERS ---
    function setupEventListeners() {
        // Main View Toggle
        calendarViewBtn.addEventListener('click', () => {
            listViewContainer.classList.remove('active');
            calendarViewContainer.classList.add('active');
            listViewBtn.classList.remove('active');
            calendarViewBtn.classList.add('active');
            calendarSubView.style.display = 'flex';
            
            // ✨ --- FIX --- ✨
            // Tell the calendar to recalculate its size when it becomes visible again.
            if (calendarInstance) {
                calendarInstance.updateSize();
            }
        });

        listViewBtn.addEventListener('click', () => {
            calendarViewContainer.classList.remove('active');
            listViewContainer.classList.add('active');
            calendarViewBtn.classList.remove('active');
            listViewBtn.classList.add('active');
            calendarSubView.style.display = 'none';
            renderList(); // Render the list when switching to it
        });

        // Calendar Controls (only work if calendar is initialized)
        prevBtn.addEventListener('click', () => calendarInstance?.prev());
        nextBtn.addEventListener('click', () => calendarInstance?.next());
        todayBtn.addEventListener('click', () => calendarInstance?.today());
        monthViewBtn.addEventListener('click', () => {
            calendarInstance?.changeView('dayGridMonth');
            monthViewBtn.classList.add('active');
            weekViewBtn.classList.remove('active');
        });
        weekViewBtn.addEventListener('click', () => {
            calendarInstance?.changeView('timeGridWeek');
            weekViewBtn.classList.add('active');
            monthViewBtn.classList.remove('active');
        });
    }

    // --- INITIALIZATION ---
    async function initialize() {
        updateClock();
        setInterval(updateClock, 1000);

        await fetchEvents();
        renderCalendar(); // Render calendar by default
        setupEventListeners();
    }

    initialize();
});
