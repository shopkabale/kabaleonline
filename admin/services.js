import { db } from '../firebase.js';
import { checkAdminAuth, setupHeader } from './admin-common.js';
import { collection, getDocs, doc, deleteDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- DOM ELEMENTS ---
const adminContent = document.getElementById('admin-content');
const loader = document.getElementById('loader');
const serviceList = document.getElementById('service-list');

/**
 * Main initialization function.
 */
function initializeServiceManagement() {
    checkAdminAuth((adminData) => {
        setupHeader(adminData.name); 
        adminContent.style.display = 'block';
        loader.style.display = 'none';

        fetchAllServices();
        setupEventListeners();
    });
}

function setupEventListeners() {
    adminContent.addEventListener('click', (e) => {
        const button = e.target.closest('button[data-action]');
        if (!button) return;
        
        if (button.dataset.action === 'delete-service') {
            handleDeleteService(button);
        }
    });
}

async function fetchAllServices() {
    serviceList.innerHTML = '<li>Loading services...</li>';
    try {
        // Assuming you have a 'services' collection
        const q = query(collection(db, 'services'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            serviceList.innerHTML = '<li>No services found.</li>';
            return;
        }
        
        serviceList.innerHTML = '';
        snapshot.forEach(docSnap => {
            const service = docSnap.data();
            
            const li = document.createElement('li');
            li.className = 'user-list-item';
            // Customize this with your service data structure
            li.innerHTML = `
                <div>
                    <p><strong>${service.serviceName || 'Unnamed Service'}</strong></p>
                    <p>Provider: ${service.providerName || 'N/A'}</p>
                    <p>Email: ${service.providerEmail || 'N/A'}</p>
                    <p>Price: ${service.price || 'N/A'}</p>
                </div>
                <button class="action-btn red" 
                        data-action="delete-service" 
                        data-id="${docSnap.id}" 
                        data-name="${service.serviceName || 'this'}">
                    Delete
                </button>
            `;
            serviceList.appendChild(li);
        });
    } catch (e) { 
        console.error("Error fetching services:", e); 
        serviceList.innerHTML = '<li>Could not load services.</li>'; 
    }
}

async function handleDeleteService(button) {
    const id = button.dataset.id;
    const name = button.dataset.name;
    
    if (!confirm(`Are you sure you want to delete the service "${name}"?`)) return;
    
    button.disabled = true;
    button.textContent = 'Deleting...';
    
    try {
        await deleteDoc(doc(db, 'services', id));
        await fetchAllServices(); // Refresh the list
    } catch (e) {
        console.error("Error deleting service:", e);
        alert("Failed to delete the service.");
        button.disabled = false;
        button.textContent = 'Delete';
    }
}

// --- START THE APP ---
document.addEventListener('DOMContentLoaded', initializeServiceManagement);