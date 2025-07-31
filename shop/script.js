// Wait for the DOM to be fully loaded before running the script  
document.addEventListener('DOMContentLoaded', () => {  

    // --- Element Selectors ---  
    const searchInput = document.getElementById('search-input');  
    const searchForm = document.getElementById('search-form');  
    const categoryButtons = document.querySelectorAll('.category-btn');  
    const productCards = document.querySelectorAll('.product-card');  

    // --- Search Functionality ---  
    const filterProductsBySearch = () => {  
        const searchTerm = searchInput.value.toLowerCase();  

        productCards.forEach(card => {  
            const productName = card.querySelector('h3').textContent.toLowerCase();  
            const shouldShow = productName.includes(searchTerm);  
            card.style.display = shouldShow ? 'flex' : 'none';  
        });  
    };  

    searchForm.addEventListener('submit', (e) => {  
        e.preventDefault();  
        filterProductsBySearch();  
    });  

    searchInput.addEventListener('keyup', filterProductsBySearch);  

    // --- Category Filtering Functionality ---  
    categoryButtons.forEach(button => {  
        button.addEventListener('click', () => {  
            const selectedCategory = button.textContent.toLowerCase().replace(' & ', '-').split(' ')[0];  

            categoryButtons.forEach(btn => btn.classList.remove('active'));  
            button.classList.add('active');  

            productCards.forEach(card => {  
                const cardCategory = card.dataset.category.toLowerCase();  

                if (selectedCategory === 'all' || cardCategory === selectedCategory) {  
                    card.style.display = 'flex';  
                } else {  
                    card.style.display = 'none';  
                }  
            });  
        });  
    });  

    // --- WhatsApp Contact Functionality ---  
    const contactButtons = document.querySelectorAll('.btn-contact');

    contactButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();

            const productCard = button.closest('.product-card');
            const productName = productCard.querySelector('h3').textContent;
            const productPrice = productCard.querySelector('.product-price').textContent;
            const seller = productCard.querySelector('.product-description').textContent.replace('Seller: ', '');

            const message = `Hello, I'm interested in the item "${productName}" priced at ${productPrice}. Is it still available?\n\nSeller: ${seller}\n\n- From Kabale Online`;
            const encodedMessage = encodeURIComponent(message);

            // Replace with your WhatsApp number (no plus sign, just country code and number)
          //  const whatsappNumber = '256784655792'; // ← Replace with your number
          const whatsappNumber = productCard.getAttribute('data-phone');

            window.open(`https://wa.me/${whatsappNumber}?text=${encodedMessage}`, '_blank');
        });
    });

});