import { auth } from '../firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";

const ordersContainer = document.getElementById('orders-container');

onAuthStateChanged(auth, user => {
    if (user) {
        fetchBuyerOrders(user);
    } else {
        window.location.href = '/login/';
    }
});

async function fetchBuyerOrders(user) {
    try {
        const token = await user.getIdToken();
        const response = await fetch('/.netlify/functions/get-buyer-orders', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error(`Error fetching orders: ${response.statusText}`);
        }

        const orders = await response.json();
        renderBuyerOrders(orders);

    } catch (error) {
        console.error(error);
        ordersContainer.innerHTML = `<div class="placeholder-message"><p>Could not load your orders. Please try again.</p></div>`;
    }
}

function renderBuyerOrders(orders) {
    if (orders.length === 0) {
        ordersContainer.innerHTML = `<div class="placeholder-message"><h3>No Orders Yet</h3><p>You haven't placed any orders.</p></div>`;
        return;
    }

    let tableHTML = `
        <table class="orders-table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
    `;
    orders.forEach(order => {
        const orderDate = new Date(order.createdAt._seconds * 1000).toLocaleDateString();
        let itemsList = '<ul>';
        order.items.forEach(item => {
            itemsList += `<li>${item.quantity || 1}x ${item.productName}</li>`;
        });
        itemsList += '</ul>';

        tableHTML += `
            <tr>
                <td>${orderDate}</td>
                <td>${itemsList}</td>
                <td>UGX ${order.totalPrice.toLocaleString()}</td>
                <td><span class="status-badge status-${order.status.toLowerCase()}">${order.status}</span></td>
            </tr>
        `;
    });
    tableHTML += `</tbody></table>`;
    ordersContainer.innerHTML = tableHTML;
}