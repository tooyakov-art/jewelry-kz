document.addEventListener('DOMContentLoaded', function() {
    // Replace text logo placeholder with the same logo used on the homepage
    document.querySelectorAll('.header__logo .logo-placeholder').forEach(function(node) {
        var logoImg = document.createElement('img');
        logoImg.src = '/jewelry-kz/st-ones.ru/wp-content/uploads/client/logo-dameli.svg';
        logoImg.alt = 'Dameli Maison';
        logoImg.loading = 'eager';
        node.replaceWith(logoImg);
    });

    var isCatalogPage = window.location.pathname.indexOf('/product-category/') !== -1 || window.location.pathname.indexOf('/shop/') !== -1;
    var productionImage = '/jewelry-kz/st-ones.ru/wp-content/themes/st-ones/assets/img/home/production-emerald-2026.webp';
    var toOrderImage = '/jewelry-kz/st-ones.ru/wp-content/themes/st-ones/assets/img/home/to-order-earrings-2026.webp';

    function processCatalogCustomBlocks(root) {
        if (!isCatalogPage) return;
        var scope = root && root.querySelectorAll ? root : document;
        var wrappers = scope.querySelectorAll('.custom-block-wrapper');

        wrappers.forEach(function(wrapper) {
            // Remove KPI block ("aboutas-template")
            if (wrapper.querySelector('.section-aboutas')) {
                wrapper.remove();
                return;
            }

            // Replace production block image
            var productionImg = wrapper.querySelector('.production__block-img img, .production-section__img img');
            if (productionImg) {
                productionImg.src = productionImage;
                productionImg.srcset = '';
                productionImg.style.objectFit = 'cover';
                productionImg.style.objectPosition = 'center';
            }

            // Replace "to-order" card image and text
            var toOrderImg = wrapper.querySelector('.to-order__banner img');
            if (toOrderImg) {
                toOrderImg.src = toOrderImage;
                toOrderImg.srcset = '';
                toOrderImg.style.objectFit = 'cover';
                toOrderImg.style.objectPosition = 'center';
            }

            var toOrderTitle = wrapper.querySelector('.to-order__title');
            if (toOrderTitle) {
                toOrderTitle.textContent = '\u0418\u041d\u0414\u0418\u0412\u0418\u0414\u0423\u0410\u041b\u042c\u041d\u042b\u0415 \u0418\u0417\u0414\u0415\u041b\u0418\u042f';
            }

            var toOrderText = wrapper.querySelector('.to-order__text');
            if (toOrderText) {
                toOrderText.textContent = 'Dameli Maison \u0441\u043e\u0437\u0434\u0430\u0451\u0442 \u0430\u0432\u0442\u043e\u0440\u0441\u043a\u0438\u0435 \u0434\u0440\u0430\u0433\u043e\u0446\u0435\u043d\u043d\u043e\u0441\u0442\u0438 \u0432 \u0432\u044b\u0441\u043e\u043a\u043e\u0439 \u044e\u0432\u0435\u043b\u0438\u0440\u043d\u043e\u0439 \u043a\u043b\u0430\u0441\u0441\u0438\u043a\u0435 \u043f\u043e \u0432\u0430\u0448\u0435\u043c\u0443 \u0437\u0430\u043f\u0440\u043e\u0441\u0443 \u0438 \u043f\u043e\u0434 \u0432\u0430\u0448\u0443 \u0438\u0441\u0442\u043e\u0440\u0438\u044e.';
            }

            wrapper.querySelectorAll('.to-order__link, .to-order a.page__btn, .to-order a').forEach(function(link) {
                var text = (link.textContent || '').trim().toUpperCase();
                if (text && (text.indexOf('\u041f\u041e\u0414\u0420\u041e\u0411') !== -1 || text.indexOf('\u041f\u041e\u0414\u0420\u041e\u0411\u041d\u0415\u0415') !== -1)) {
                    link.textContent = '\u041f\u041e\u0414\u0420\u041e\u0411\u041d\u0415\u0415';
                }
            });
        });
    }

    processCatalogCustomBlocks(document);

    if (isCatalogPage && document.body) {
        var blockObserver = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                mutation.addedNodes.forEach(function(node) {
                    if (!node || node.nodeType !== 1) return;
                    if (node.matches && node.matches('.custom-block-wrapper')) {
                        processCatalogCustomBlocks(node.parentNode || document);
                        return;
                    }
                    if (node.querySelector && node.querySelector('.custom-block-wrapper')) {
                        processCatalogCustomBlocks(node);
                    }
                });
            });
        });
        blockObserver.observe(document.body, { childList: true, subtree: true });
    }

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
        // Replace dropdown options with all categories (berocket JS removes them)
        var currentPath = window.location.pathname;
        while (catFilter.firstChild) {
            catFilter.removeChild(catFilter.firstChild);
        }
        var defaultOpt = document.createElement('option');
        defaultOpt.value = '';
        defaultOpt.textContent = 'Все категории';
        catFilter.appendChild(defaultOpt);

        Object.keys(categoryMap).forEach(function(name) {
            var opt = document.createElement('option');
            opt.textContent = name;
            opt.setAttribute('data-name', name);
            opt.value = name;
            if (currentPath.indexOf(categoryMap[name]) !== -1) {
                opt.selected = true;
            }
            catFilter.appendChild(opt);
        });

        // Use capture phase to run before berocket's AJAX handler
        catFilter.addEventListener('change', function(e) {
            e.stopImmediatePropagation();
            e.preventDefault();
            var selected = this.options[this.selectedIndex];
            var name = selected.getAttribute('data-name');
            if (name && categoryMap[name]) {
                window.location.assign(categoryMap[name]);
            } else if (!name) {
                window.location.assign('/jewelry-kz/st-ones.ru/shop/');
            }
        }, true);
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
