import { db } from '/firebase.js';
import { collection, getDocs, query, orderBy, where } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const eventGrid = document.getElementById('event-grid');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');

function renderEvents(docs) {
    eventGrid.innerHTML = ''; 
    if (docs.length === 0) {
        eventGrid.innerHTML = '<p>No events found. Check back later or create one!</p>';
        return;
    }

    docs.forEach(doc => {
        const event = doc.data();
        const eventId = doc.id;
        const priceText = event.price === 0 ? 'Free' : `UGX ${event.price.toLocaleString()}`;
        
        const eventDate = new Date(event.date + 'T00:00:00');
        const displayDate = eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        const eventCardHTML = `
            <a href="/events/detail.html?id=${eventId}" class="event-card">
                <img src="${event.imageUrl}" alt="${event.title}">
                <div class="event-card-content">
                    <h3>${event.title}</h3>
                    <div class="event-card-info">
                        <div><i class="fa-solid fa-calendar-day"></i> ${displayDate} - ${event.time}</div>
                        <div><i class="fa-solid fa-location-dot"></i> ${event.location}</div>
                    </div>
                    <div class="event-card-footer">
                        <span class="event-price">${priceText}</span>
                        <span class="event-details-link">View Details</span>
                    </div>
                </div>
            </a>
        `;
        eventGrid.innerHTML += eventCardHTML;
    });
}

async function fetchAndRenderEvents(searchQuery = null) {
    try {
        let q;
        if (searchQuery) {
            q = searchQuery;
        } else {
            const today = new Date().toISOString().split('T')[0]; 
            q = query(collection(db, 'events'), where('date', '>=', today), orderBy('date', 'asc'));
        }

        const querySnapshot = await getDocs(q);
        renderEvents(querySnapshot.docs);

    } catch (error) {
        console.error("Error fetching events:", error);
        eventGrid.innerHTML = '<p>Sorry, something went wrong while loading events.</p>';
    }
}

async function handleSearch() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    if (!searchTerm) {
        fetchAndRenderEvents(); 
        return;
    }
    
    eventGrid.innerHTML = '<p>Searching...</p>';
    
    const q = query(
        collection(db, 'events'),
        where('title_lowercase', '>=', searchTerm),
        where('title_lowercase', '<=', searchTerm + '\uf8ff')
    );
    
    fetchAndRenderEvents(q);
}

searchBtn.addEventListener('click', handleSearch);
searchInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
        handleSearch();
    }
});

fetchAndRenderEvents();
