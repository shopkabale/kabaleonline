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

/**
 * Fetches all orders with detailed product/buyer/seller info.
 */
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
            
            // --- UPDATED LOGIC ---
            // Try common field names for buyer and total
            const customer = order.buyerEmail || order.customerEmail || order.email || 'N/A';
            const total = order.totalPrice || order.totalAmount || 0;
            
            // Build the list of products in the order
            // Assumes your order doc has an array field named 'items'
            let productsHTML = '<ul style="padding-left: 20px; margin: 0;">';
            if (order.items && Array.isArray(order.items)) {
                order.items.forEach(item => {
                    productsHTML += `
                        <li style="margin-top: 10px; list-style-type: disc;">
                            <strong>Product:</strong> ${item.productName || 'Unnamed Product'} <br>
                            <strong>Price:</strong> UGX ${(item.price || 0).toLocaleString()} <br>
                            <strong>Seller:</strong> ${item.sellerName || 'N/A'}
                        </li>
                    `;
                });
            } else {
                productsHTML += '<li>No item details available for this order.</li>';
            }
            productsHTML += '</ul>';
            // --- END UPDATED LOGIC ---

            const li = document.createElement('li');
            li.className = 'user-list-item';
            // Change styles to stack content vertically and align left
            li.style.flexDirection = 'column';
            li.style.alignItems = 'flex-start';
            
            // New, more detailed card layout
            li.innerHTML = `
                <div style="width: 100%;">
                    <p><strong>Order ID:</strong> ${docSnap.id}</p>
                    <p><strong>Buyer:</strong> ${customer}</p>
                    <p><strong>Total:</strong> <span style="font-weight:bold; color:green;">UGX ${total.toLocaleString()}</span></p>
                    <p><strong>Date:</strong> ${orderDate}</p>
                    
                    <hr style="border:0; border-top: 1px solid var(--border-color); margin: 10px 0;">
                    
                    <p style="font-weight: bold; margin-bottom: 5px;">Items in this Order:</p>
                    ${productsHTML}
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