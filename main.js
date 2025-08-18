// In main.js
function renderProducts(productsToDisplay) {
    // ...
    productsToDisplay.forEach(product => {
        const primaryImage = product.imageUrls && product.imageUrls.length > 0 ? product.imageUrls[0] : '';
        const productLink = document.createElement('a');
        productLink.href = `product.html?id=${product.id}`;
        productLink.className = 'product-card-link';
        productLink.innerHTML = `
            <div class="product-card">
                <img src="${primaryImage}" alt="${product.name}">
                <h3>${product.name}</h3>
                <p class="price">UGX ${product.price.toLocaleString()}</p>
            </div>
        `;
        productGrid.appendChild(productLink);
    });
}
