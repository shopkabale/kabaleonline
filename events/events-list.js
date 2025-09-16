/**
 * Creates an optimized and transformed Cloudinary URL.
 * @param {string} url The original Cloudinary URL.
 * @param {'thumbnail'|'full'|'grid_item'} type The desired transformation type.
 * @returns {string} The new, transformed URL.
 */
function getCloudinaryTransformedUrl(url, type) {
    if (!url || !url.includes('res.cloudinary.com')) {
        return url || 'https://placehold.co/400x400/e0e0e0/777?text=No+Image';
    }
    const transformations = {
        thumbnail: 'c_fill,g_auto,w_250,h_250,f_auto,q_auto',
        full: 'c_limit,w_800,h_800,f_auto,q_auto',
        grid_item: 'c_scale,w_400,f_auto,q_auto'
    };
    const transformString = transformations[type] || transformations.thumbnail;
    const urlParts = url.split('/upload/');
    if (urlParts.length !== 2) {
        return url;
    }
    return `${urlParts[0]}/upload/${transformString}/${urlParts[1]}`;
}


import { db } from '/firebase.js';
import { collection, getDocs, query, orderBy, where } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const eventGrid = document.getElementById('event-grid');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');

async function initializePage() {
    try {
        const keysResponse = await fetch('/.netlify/functions/get-algolia-keys');
        if (!keysResponse.ok) {
            throw new Error('Could not load search configuration.');
        }
        const keys = await keysResponse.json();
        const algoliaClient = algoliasearch(keys.appId, keys.searchKey);
        const eventsIndex = algoliaClient.initIndex('events');
        searchBtn.addEventListener('click', () => handleSearch(eventsIndex));
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                handleSearch(eventsIndex);
            }
        });
        fetchInitialEvents();
    } catch (error) {
        console.error("Could not initialize search:", error);
        eventGrid.innerHTML = '<p style="color:red;">Search is currently unavailable.</p>';
        searchInput.disabled = true;
        searchBtn.disabled = true;
    }
}

async function handleSearch(eventsIndex) {
    const searchTerm = searchInput.value.trim();
    if (!searchTerm) {
        fetchInitialEvents(); 
        return;
    }
    eventGrid.innerHTML = '<p>Searching...</p>';
    const { hits } = await eventsIndex.search(searchTerm);
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

function createEventCardHTML(event, eventId) {
    const priceText = event.price === 0 ? 'Free' : `UGX ${event.price.toLocaleString()}`;
    const eventDate = new Date(event.date + 'T00:00:00');
    const displayDate = eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const title = event.title || event.name;

    // ✨ OPTIMIZATION: Create an optimized URL for the event grid item
    const optimizedImageUrl = getCloudinaryTransformedUrl(event.imageUrl, 'grid_item');

    return `
        <a href="/events/detail.html?id=${eventId}" class="event-card">
            <img src="${optimizedImageUrl}" alt="${title}" loading="lazy">
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

initializePage();
