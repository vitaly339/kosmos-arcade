document.addEventListener('DOMContentLoaded', () => {
    // Mobile menu toggle
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const mainMenu = document.querySelector('.main-menu');

    mobileMenuToggle.addEventListener('click', () => {
        mainMenu.classList.toggle('active');
    });

    // Close mobile menu when a link is clicked
    mainMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            if (mainMenu.classList.contains('active')) {
                mainMenu.classList.remove('active');
            }
        });
    });

    // One-click purchase modal
    const oneClickModal = document.getElementById('modal-one-click');
    const closeButton = oneClickModal.querySelector('.close-button');
    const modalProductName = document.getElementById('modal-product-name');
    const quickOrderForm = document.getElementById('quick-order-form');
    const productForOrderInput = document.getElementById('product-for-order');

    document.querySelectorAll('.buy-one-click').forEach(button => {
        button.addEventListener('click', (event) => {
            const productName = event.target.dataset.product;
            modalProductName.textContent = productName;
            oneClickModal.style.display = 'flex';
            productForOrderInput.value = productName; // Pre-fill quick order form
        });
    });

    closeButton.addEventListener('click', () => {
        oneClickModal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === oneClickModal) {
            oneClickModal.style.display = 'none';
        }
    });

    // Form submission (for demonstration, actual submission would use fetch/XMLHttpRequest)
    document.querySelectorAll('.order-form').forEach(form => {
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            console.log('Form Submitted:', data);
            alert('Ваш заказ отправлен! Мы свяжемся с вами в ближайшее время.');
            form.reset();
            if (oneClickModal.style.display === 'flex') {
                oneClickModal.style.display = 'none';
            }
        });
    });

    // Product filtering (simplified example)
    const bicycleProducts = document.getElementById('bicycle-products');
    const categoryFilter = document.getElementById('category-filter');
    const wheelSizeFilter = document.getElementById('wheel-size-filter');
    const heightFilter = document.getElementById('height-filter');
    const frameFilter = document.getElementById('frame-filter');
    const priceFilter = document.getElementById('price-filter');
    const resetFiltersBtn = document.querySelector('.filters .reset-filters-btn');

    function applyBicycleFilters() {
        const selectedCategory = categoryFilter.value;
        const selectedWheelSize = wheelSizeFilter.value;
        const selectedHeight = parseInt(heightFilter.value);
        const selectedFrame = frameFilter.value.toLowerCase();
        const maxPrice = parseInt(priceFilter.value);

        Array.from(bicycleProducts.children).forEach(card => {
            const cardCategory = card.dataset.category;
            const cardWheel = card.dataset.wheel;
            const cardPrice = parseInt(card.dataset.price);
            // Assuming we'd have a data-frame attribute if filter was more complex
            // const cardFrame = card.dataset.frame.toLowerCase();

            const isCategoryMatch = selectedCategory === 'all' || cardCategory === selectedCategory;
            const isWheelMatch = selectedWheelSize === 'all' || cardWheel === selectedWheelSize;
            const isPriceMatch = cardPrice <= maxPrice;
            // Simplified height filter: assuming all bikes below selected height are visible
            // For a proper height filter, you'd need min/max height range for each bike
            const isHeightMatch = true; // Placeholder for now

            // Basic frame text match
            const isFrameMatch = selectedFrame === '' || (card.outerText.toLowerCase().includes(selectedFrame));


            if (isCategoryMatch && isWheelMatch && isPriceMatch && isHeightMatch && isFrameMatch) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }

    categoryFilter.addEventListener('change', applyBicycleFilters);
    wheelSizeFilter.addEventListener('change', applyBicycleFilters);
    heightFilter.
