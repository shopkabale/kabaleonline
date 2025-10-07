import { auth } from '../../firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";

const ordersContainer = document.getElementById('orders-container');

onAuthStateChanged(auth, user => {
    if (user) {
        fetchOrders(user);
    } else {
        window.location.href = '/login/';
    }
});

async function fetchOrders(user) {
    try {
        const token = await user.getIdToken();
        const response = await fetch('/.netlify/functions/get-seller-orders', {
            headers: { 'Authorization': `Bearer ${token}` }
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

        let actionSelect = `
            <select class="action-select" data-order-id="${order.id}">
                <option value="Pending" ${order.status === 'Pending' ? 'selected' : ''}>Pending</option>
                <option value="Confirmed" ${order.status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
                <option value="Delivered" ${order.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
            </select>
        `;

        tableHTML += `
            <tr id="order-row-${order.id}">
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

// NEW: Event listener to handle status changes
ordersContainer.addEventListener('change', async (event) => {
    if (event.target.classList.contains('action-select')) {
        const selectElement = event.target;
        const orderId = selectElement.dataset.orderId;
        const newStatus = selectElement.value;

        selectElement.disabled = true;

        try {
            const user = auth.currentUser;
            if (!user) throw new Error("Not authenticated.");
            
            const token = await user.getIdToken();
            const response = await fetch('/.netlify/functions/update-order-status', {
                method: 'POST',
                body: JSON.stringify({ orderId, newStatus }),
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || "Failed to update status.");
            }
            
            // Update the UI visually
            const statusBadge = document.querySelector(`#order-row-${orderId} .status-badge`);
            statusBadge.textContent = newStatus;
            statusBadge.className = `status-badge status-${newStatus.toLowerCase()}`;
            alert("Order status updated successfully!");

        } catch (error) {
            console.error("Error updating status:", error);
            alert(`Error: ${error.message}`);
            // Revert dropdown on failure
            fetchOrders(auth.currentUser); 
        } finally {
            selectElement.disabled = false;
        }
    }
});