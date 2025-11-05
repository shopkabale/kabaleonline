import { db } from '../firebase.js';
import { checkAdminAuth, setupHeader } from './admin-common.js';
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- DOM ELEMENTS ---
const adminContent = document.getElementById('admin-content');
const loader = document.getElementById('loader');
const orderList = document.getElementById('order-list');

/**
 * Main initialization function.
 */
function initializeOrderManagement() {
    checkAdminAuth((adminData) => {
        setupHeader(adminData.name); 
        adminContent.style.display = 'block';
        loader.style.display = 'none';

        fetchAllOrders();
    });
}

async function fetchAllOrders() {
    orderList.innerHTML = '<li>Loading orders...</li>';
    try {
        // Assuming you have an 'orders' collection
        const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            orderList.innerHTML = '<li>No orders found.</li>';
            return;
        }
        
        orderList.innerHTML = '';
        snapshot.forEach(docSnap => {
            const order = docSnap.data();
            const orderDate = order.createdAt?.toDate().toLocaleDateString() || 'No date';
            
            const li = document.createElement('li');
            li.className = 'user-list-item';
            // Customize this with your order data structure
            li.innerHTML = `
                <div>
                    <p><strong>Order ID:</strong> ${docSnap.id}</p>
                    <p><strong>Customer:</strong> ${order.customerEmail || 'N/A'}</p>
                    <p><strong>Total:</strong> UGX ${(order.totalAmount || 0).toLocaleString()}</p>
                    <p><strong>Date:</strong> ${orderDate}</p>
                </div>
            `;
            orderList.appendChild(li);
        });
    } catch (e) { 
        console.error("Error fetching orders:", e); 
        orderList.innerHTML = '<li>Could not load orders.</li>'; 
    }
}

// --- START THE APP ---
document.addEventListener('DOMContentLoaded', initializeOrderManagement);