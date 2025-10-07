import { auth } from '../../firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";

const ordersContainer = document.getElementById('orders-container');

onAuthStateChanged(auth, user => {
    if (user) {
        fetchOrders(user);
    } else {
        // Not logged in, redirect to login page
        window.location.href = '/login/';
    }
});

async function fetchOrders(user) {
    try {
        // NEW: Get the user's authentication token
        const token = await user.getIdToken();

        // MODIFIED: Send the request with the token in the headers
        const response = await fetch('/.netlify/functions/get-seller-orders', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(`Error fetching orders: ${response.statusText}`);
        }

        const orders = await response.json();
        renderOrders(orders);

    } catch (error) {
        console.error(error);
        ordersContainer.innerHTML = `<div class="placeholder-message"><p>Could not load your orders. Please try again.</p></div>`;
    }
}

function renderOrders(orders) {
    if (orders.length === 0) {
        ordersContainer.innerHTML = `
            <div class="placeholder-message">
                <h3>No Orders Yet</h3>
                <p>When a buyer places an order for one of your items, it will appear here.</p>
            </div>`;
        return;
    }

    let tableHTML = `
        <table class="orders-table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Buyer Details</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
    `;

    orders.forEach(order => {
        const orderDate = new Date(order.createdAt._seconds * 1000).toLocaleDateString();
        const buyerInfo = order.buyerInfo;
        
        let itemsList = '<ul>';
        order.items.forEach(item => {
            itemsList += `<li>${item.quantity || 1}x ${item.productName}</li>`;
        });
        itemsList += '</ul>';

        // Create the select dropdown for actions
        let actionSelect = `
            <select class="action-select" data-order-id="${order.id}">
                <option value="Pending" ${order.status === 'Pending' ? 'selected' : ''}>Pending</option>
                <option value="Confirmed" ${order.status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
                <option value="Delivered" ${order.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
            </select>
        `;

        tableHTML += `
            <tr>
                <td>${orderDate}</td>
                <td>
                    <strong>${buyerInfo.name}</strong><br>
                    ${buyerInfo.phone}<br>
                    <em>${buyerInfo.location}</em>
                </td>
                <td>${itemsList}</td>
                <td>UGX ${order.totalPrice.toLocaleString()}</td>
                <td><span class="status-badge status-${order.status.toLowerCase()}">${order.status}</span></td>
                <td>${actionSelect}</td>
            </tr>
        `;
    });

    tableHTML += `</tbody></table>`;
    ordersContainer.innerHTML = tableHTML;
}

// In the next step, we will add the logic to update the order status.