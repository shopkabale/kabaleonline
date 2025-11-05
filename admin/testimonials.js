import { db } from '../firebase.js';
import { checkAdminAuth, setupHeader } from './admin-common.js';
import { collection, getDocs, doc, deleteDoc, query, orderBy, updateDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- DOM ELEMENTS ---
const adminContent = document.getElementById('admin-content');
const loader = document.getElementById('loader');
const pendingTestimonialsList = document.getElementById('pending-testimonials-list');
const approvedTestimonialsList = document.getElementById('approved-testimonials-list');

/**
 * Main initialization function.
 */
function initializeTestimonialManagement() {
    checkAdminAuth((adminData) => {
        setupHeader(adminData.name); 
        adminContent.style.display = 'block';
        loader.style.display = 'none';

        fetchTestimonialsForAdmin();
        setupEventListeners();
    });
}

function setupEventListeners() {
    adminContent.addEventListener('click', (e) => {
        const button = e.target.closest('button[data-action]');
        if (!button) return;
        
        const action = button.dataset.action;
        
        switch(action) {
            case 'approve-testimonial': handleApproveTestimonial(button); break;
            case 'delete-testimonial': handleDeleteTestimonial(button); break;
        }
    });
}

async function fetchTestimonialsForAdmin() {
    pendingTestimonialsList.innerHTML = '<li>Loading...</li>';
    approvedTestimonialsList.innerHTML = '<li>Loading...</li>';
    try {
        const q = query(collection(db, 'testimonials'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        let pendingHTML = ''; 
        let approvedHTML = '';
        
        snapshot.forEach(docSnap => {
            const t = docSnap.data();
            const itemHTML = `
                <li class="user-list-item">
                    <div>
                        <p><strong>"${t.quote}"</strong></p>
                        <p>- ${t.authorName}</p>
                    </div>
                    <div style="display:flex; gap:10px;">
                        ${t.status === 'pending' ? `<button class="action-btn green" data-action="approve-testimonial" data-id="${docSnap.id}">Approve</button>` : ''}
                        <button class="action-btn red" data-action="delete-testimonial" data-id="${docSnap.id}">Delete</button>
                    </div>
                </li>`;
            
            if (t.status === 'pending') {
                pendingHTML += itemHTML;
            } else {
                approvedHTML += itemHTML;
            }
        });
        
        pendingTestimonialsList.innerHTML = pendingHTML || '<li>No pending testimonials.</li>';
        approvedTestimonialsList.innerHTML = approvedHTML || '<li>No approved testimonials.</li>';
        
    } catch (e) { 
        console.error("Error fetching testimonials:", e); 
        pendingTestimonialsList.innerHTML = '<li>Error loading testimonials.</li>';
        approvedTestimonialsList.innerHTML = '<li>Error loading testimonials.</li>';
    }
}

async function handleApproveTestimonial(button) {
    const id = button.dataset.id;
    button.disabled = true; 
    button.textContent = 'Approving...';
    try {
        await updateDoc(doc(db, 'testimonials', id), { status: 'approved', order: Date.now() });
        fetchTestimonialsForAdmin(); // Refresh lists
    } catch (e) { 
        console.error("Error approving testimonial:", e); 
        alert("Could not approve."); 
        button.disabled = false;
        button.textContent = 'Approve';
    }
}

async function handleDeleteTestimonial(button) {
    const id = button.dataset.id;
    if (!confirm("Delete this testimonial?")) return;
    
    button.disabled = true; 
    button.textContent = 'Deleting...';
    try {
        await deleteDoc(doc(db, 'testimonials', id));
        fetchTestimonialsForAdmin(); // Refresh lists
    } catch (e) { 
        console.error("Error deleting testimonial:", e); 
        alert("Could not delete."); 
        button.disabled = false;
        button.textContent = 'Delete';
    }
}

// --- START THE APP ---
document.addEventListener('DOMContentLoaded', initializeTestimonialManagement);