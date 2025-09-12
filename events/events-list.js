import { db } from '/firebase.js';
import { collection, getDocs, query, orderBy, where } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const eventGrid = document.getElementById('event-grid');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');

/**
 * Main function to initialize the page.
 * It fetches the Algolia keys, sets up the search client, and loads initial data.
 */
async function initializePage() {
    try {
        // 1. Securely fetch the public API keys from our Netlify function
        const keysResponse = await fetch('/.netlify/functions/get-algolia-keys');
        if (!keysResponse.ok) {
            throw new Error('Could not load search configuration.');
        }
        
        const keys = await keysResponse.json();

        // 2. Initialize the Algolia client with the fetched keys
        const algoliaClient = algoliasearch(keys.appId, keys.searchKey);
        const eventsIndex = algoliaClient.initIndex('events');
        
        // 3. Set up the search event listeners now that Algolia is ready
        searchBtn.addEventListener('click', () => handleSearch(eventsIndex));
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                handleSearch(eventsIndex);
            }
        });

        // 4. Load the initial list of events from Firestore for the default view
        fetchInitialEvents();

    } catch (error) {
        console.error("Could not initialize search:", error);
        eventGrid.innerHTML = '<p style="color:red;">Search is currently unavailable.</p>';
        // Disable search bar if initialization fails
        searchInput.disabled = true;
        searchBtn.disabled = true;
    }
}

/**
 * Performs a search using the Algolia index and renders the results.
 * @param {object} eventsIndex - The initialized Algolia index object.
 */
async function handleSearch(eventsIndex) {
    const searchTerm = searchInput.value.trim();
    
    // If the search bar is empty, show the default list from Firestore
    if (!searchTerm) {
        fetchInitialEvents(); 
        return;
    }

    eventGrid.innerHTML = '<p>Searching...</p>';

    // Send the search query to Algolia
    const { hits } = await eventsIndex.search(searchTerm);
    
    // Render the results from Algolia
    eventGrid.innerHTML = '';
    if (hits.length === 0) {
        eventGrid.innerHTML = `<p>No events found for "${searchTerm}". Try another search.</p>`;
        return;
    }
    hits.forEach(hit => {
        const eventCardHTML = createEventCardHTML(hit, hit.objectID);
        eventGrid.innerHTML += eventCardHTML;
    });
}

/**
 * Fetches the initial list of events from FIRESTORE.
 */
async function fetchInitialEvents() {
    try {
        const today = new Date().toISOString().split('T')[0]; 
        const q = query(collection(db, 'events'), where('date', '>=', today), orderBy('date', 'asc'));
        const querySnapshot = await getDocs(q);
        renderFirestoreEvents(querySnapshot.docs);
    } catch (error) {
        console.error("Error fetching initial events:", error);
        eventGrid.innerHTML = '<p>Sorry, something went wrong while loading events.</p>';
    }
}

/**
 * Renders event cards from Firestore documents.
 * @param {Array} docs - Array of Firestore documents.
 */
function renderFirestoreEvents(docs) {
    eventGrid.innerHTML = ''; 
    if (docs.length === 0) {
        eventGrid.innerHTML = '<p>No upcoming events found. Check back later!</p>';
        return;
    }
    docs.forEach(doc => {
        const eventCardHTML = createEventCardHTML(doc.data(), doc.id);
        eventGrid.innerHTML += eventCardHTML;
    });
}

/**
 * Creates the HTML for a single event card.
 * @param {object} event - The event data object.
 * @param {string} eventId - The unique ID for the event.
 * @returns {string} The HTML string for the card.
 */
function createEventCardHTML(event, eventId) {
    const priceText = event.price === 0 ? 'Free' : `UGX ${event.price.toLocaleString()}`;
    const eventDate = new Date(event.date + 'T00:00:00');
    const displayDate = eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    // Use event.title (from Algolia) or event.name (from older data structures) for compatibility
    const title = event.title || event.name;

    return `
        <a href="/events/detail.html?id=${eventId}" class="event-card">
            <img src="${event.imageUrl}" alt="${title}">
            <div class="event-card-content">
                <h3>${title}</h3>
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
}

// Start the page initialization process
initializePage();

