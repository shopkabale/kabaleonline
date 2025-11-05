import { db } from '../firebase.js';
import { checkAdminAuth, setupHeader } from './admin-common.js';
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- DOM ELEMENTS ---
const adminContent = document.getElementById('admin-content');
const loader = document.getElementById('loader');
const totalSalesDisplay = document.getElementById('total-sales-display');
const soldItemsList = document.getElementById('sold-items-list');

/**
 * Main initialization function.
 */
function initializeEarnings() {
    checkAdminAuth((adminData) => {
        setupHeader(adminData.name); 
        adminContent.style.display = 'block';
        loader.style.display = 'none';

        fetchSalesData();
    });
}

async function fetchSalesData() {
    soldItemsList.innerHTML = '<li>Loading sold items...</li>';
    try {
        // This query matches the logic from your dashboard
        const q = query(collection(db, 'products'), where('isSold', '==', true));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            soldItemsList.innerHTML = '<li>No sold items found.</li>';
            totalSalesDisplay.textContent = 'UGX 0';
            return;
        }
        
        let totalSalesValue = 0;
        soldItemsList.innerHTML = '';
        
        snapshot.forEach(docSnap => {
            const product = docSnap.data();
            const price = product.price || 0;
            totalSalesValue += price;
            
            const li = document.createElement('li');
            li.className = 'user-list-item';
            li.innerHTML = `
                <span>${product.name}</span>
                <span style="color:green; font-weight:bold;">UGX ${price.toLocaleString()}</span>
            `;
            soldItemsList.appendChild(li);
        });

        totalSalesDisplay.textContent = `UGX ${totalSalesValue.toLocaleString()}`;
        
    } catch (e) { 
        console.error("Error fetching sales data:", e); 
        soldItemsList.innerHTML = '<li>Could not load sales data.</li>'; 
    }
}

// --- START THE APP ---
document.addEventListener('DOMContentLoaded', initializeEarnings);