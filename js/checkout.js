async function handlePlaceOrder(event) {
    event.preventDefault();
    const placeOrderBtn = document.getElementById('place-order-btn');
    placeOrderBtn.disabled = true;
    placeOrderBtn.querySelector('span').textContent = 'Placing Order...';
    placeOrderBtn.querySelector('.fa-spin').style.display = 'inline-block';

    const orderDetails = {
        buyerInfo: {
            name: document.getElementById('fullName').value,
            phone: document.getElementById('phone').value,
            location: document.getElementById('location').value,
            // buyerId is now removed from here
        },
        items: cartItems,
        totalPrice: totalPrice
    };

    try {
        const user = auth.currentUser;
        if (!user) {
            throw new Error("User not logged in.");
        }
        const token = await user.getIdToken();

        const response = await fetch('/.netlify/functions/submit-order', {
            method: 'POST',
            body: JSON.stringify(orderDetails),
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            // This will now correctly parse the JSON error from the function
            const errorData = await response.json(); 
            throw new Error(errorData.error || 'Failed to place order.');
        }

        window.location.href = '/order-success.html';

    } catch (error) {
        console.error("Checkout error:", error);
        alert(`There was a problem placing your order: ${error.message}`);
        placeOrderBtn.disabled = false;
        placeOrderBtn.querySelector('span').textContent = 'Confirm Order';
        placeOrderBtn.querySelector('.fa-spin').style.display = 'none';
    }
}