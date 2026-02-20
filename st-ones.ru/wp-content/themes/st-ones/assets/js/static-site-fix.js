document.addEventListener('DOMContentLoaded', function() {
    // Category dropdown -> navigate to actual category pages
    var categoryMap = {
        'Бриллианты': '/jewelry-kz/st-ones.ru/product-category/brillianty/',
        'Цветные камни': '/jewelry-kz/st-ones.ru/product-category/czvetniki/',
        'Кольца': '/jewelry-kz/st-ones.ru/product-category/kolcza/',
        'Браслеты': '/jewelry-kz/st-ones.ru/product-category/braslety/',
        'Серьги': '/jewelry-kz/st-ones.ru/product-category/sergi/',
        'Подвески': '/jewelry-kz/st-ones.ru/product-category/podveski/',
        'Пусеты': '/jewelry-kz/st-ones.ru/product-category/pusety/'
    };

    var catFilter = document.querySelector('[data-taxonomy="product_cat"] select');
    if (catFilter) {
        catFilter.addEventListener('change', function() {
            var selected = this.options[this.selectedIndex];
            var name = selected.getAttribute('data-name');
            if (name && categoryMap[name]) {
                window.location.href = categoryMap[name];
            }
        });
    }

    // Hide stone, metal filters (require WordPress backend)
    document.querySelectorAll('[data-taxonomy="pa_kamen"], [data-taxonomy="pa_metall"]').forEach(function(el) {
        var widget = el.closest('.berocket_single_filter_widget');
        if (widget) widget.style.display = 'none';
    });

    // Hide cut shape visual filter
    var cutTitle = document.querySelector('.filter-title-ogranka');
    if (cutTitle) cutTitle.style.display = 'none';
    document.querySelectorAll('[data-taxonomy="pa_ogranka"]').forEach(function(el) {
        var widget = el.closest('.berocket_single_filter_widget');
        if (widget) widget.style.display = 'none';
    });

    // Client-side sorting
    var sortSelect = document.querySelector('.woocommerce-ordering .orderby');
    if (sortSelect) {
        sortSelect.addEventListener('change', function(e) {
            e.preventDefault();
            var order = this.value;
            var list = document.querySelector('ul.products');
            if (!list) return;
            var items = Array.from(list.querySelectorAll('li.product'));
            if (items.length === 0) return;

            items.sort(function(a, b) {
                if (order === 'price' || order === 'price-desc') {
                    var priceA = parsePrice(a);
                    var priceB = parsePrice(b);
                    return order === 'price' ? priceA - priceB : priceB - priceA;
                }
                return 0;
            });

            items.forEach(function(item) { list.appendChild(item); });
        });

        // Prevent form submit
        var form = sortSelect.closest('form');
        if (form) {
            form.addEventListener('submit', function(e) { e.preventDefault(); });
        }
    }

    function parsePrice(el) {
        var priceEl = el.querySelector('.woocommerce-Price-amount bdi');
        if (!priceEl) return 0;
        var text = priceEl.textContent.replace(/[^\d]/g, '');
        return parseInt(text, 10) || 0;
    }

    // Fix 0 tenge prices
    document.querySelectorAll('.woocommerce-Price-amount').forEach(function(el) {
        var text = el.textContent.trim();
        if (text === '0 \u20B8' || text === '0\u20B8' || /^0\s*\u20B8$/.test(text)) {
            el.textContent = 'По запросу';
            el.style.fontSize = '14px';
            el.style.color = '#5C5C5C';
        }
    });
});
