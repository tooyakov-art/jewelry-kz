(function () {
    "use strict";

    var FALLBACK_WA_PHONE = "77071234567";
    var YITH_LOADER_DATA_URI = "data:image/gif;base64,R0lGODlhEAAQAPIAAP///wAAAMbGxv///8zMzP///yH/C05FVFNDQVBFMi4wAwEAAAAh+QQFCgAAACwAAAAAEAAQAAADMwi63P4wyklrE2MIOggZnAdOmGYJRbExwroUm2qB7AQAIfkEBQoAAAAsAAAAABAAEAAAAzMIutz+MMpJaxNjCDoIGZwHTphmCUWxMcK6FJtqgewEACH5BAUKAAAALAAAAAAQABAAAAMzCLrc/jDKSWsTYwg6CBmcB06YZglFsTHCuhSbaoHsBAAh+QQFCgAAACwAAAAAEAAQAAADMwi63P4wyklrE2MIOggZnAdOmGYJRbExwroUm2qB7AQAOw==";
    var WISHLIST_STORAGE_KEY = "dm_wishlist_item_ids";
    var EVENT_DEBOUNCE_MS = 420;
    var ONE_CLICK_SELECTOR = ".awooc-custom-order-button,[id^='awooc-custom-order-button'],.productcard-section__button-one-click";
    var GIFT_HINT_SELECTOR = ".open-popup";
    var OFFER_SELECTOR = ".open-popup-2";
    var WISHLIST_BUTTON_SELECTOR = ".alg-wc-wl-btn[data-item_id]";
    var INFINITE_SENTINEL_CLASS = "dm-infinite-sentinel";
    var INFINITE_SCROLL_OFFSET = 900;
    var infiniteState = {
        container: null,
        sentinel: null,
        observer: null,
        loading: false,
        nextUrl: "",
        loadedPages: {},
        fallbackBound: false
    };

    function normalizePhone(phone) {
        var digits = String(phone || "").replace(/\D/g, "");
        if (!digits) return "";
        if (digits.charAt(0) === "8" && digits.length === 11) digits = "7" + digits.slice(1);
        if (digits.charAt(0) !== "7" && digits.length === 10) digits = "7" + digits;
        return digits;
    }

    function cleanText(value) {
        return String(value || "").replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "");
    }

    function pickWhatsAppPhone() {
        var waLink = document.querySelector("a[href*='wa.me/'],a[href*='api.whatsapp.com/send']");
        if (waLink && waLink.getAttribute("href")) {
            var href = waLink.getAttribute("href");
            var fromWa = normalizePhone(href.replace(/^.*?(wa\.me\/|phone=)/, ""));
            if (fromWa) return fromWa;
        }

        var telLink = document.querySelector("a[href^='tel:']");
        if (telLink && telLink.getAttribute("href")) {
            var fromTel = normalizePhone(telLink.getAttribute("href"));
            if (fromTel) return fromTel;
        }

        return FALLBACK_WA_PHONE;
    }

    function absoluteUrl(url) {
        if (!url) return window.location.href;
        var a = document.createElement("a");
        a.href = url;
        return a.href;
    }

    function findText(scope, selectors) {
        for (var i = 0; i < selectors.length; i++) {
            var node = scope.querySelector(selectors[i]);
            if (!node) continue;
            var value = cleanText(node.textContent || node.innerText);
            if (value) return value;
        }
        return "";
    }

    function closest(node, selector) {
        if (!node || !node.closest) return null;
        return node.closest(selector);
    }

    function consumeEvent(event) {
        if (!event) return;
        if (event.preventDefault) event.preventDefault();
        if (event.stopImmediatePropagation) event.stopImmediatePropagation();
        if (event.stopPropagation) event.stopPropagation();
    }

    function shouldRunAction(element, key) {
        if (!element || !element.dataset) return true;
        var now = Date.now();
        var last = parseInt(element.dataset[key] || "0", 10);
        if (!isNaN(last) && now - last < EVENT_DEBOUNCE_MS) return false;
        element.dataset[key] = String(now);
        return true;
    }

    function closeLegacyOneClickUi() {
        var waModal = document.getElementById("wa-modal");
        if (waModal && waModal.classList) waModal.classList.remove("active");

        var popup = document.getElementById("awooc-form-custom-order");
        if (popup) {
            popup.style.display = "none";
            popup.classList.remove("active", "awooc-open", "mfp-ready");
            popup.setAttribute("aria-hidden", "true");
        }

        var overlays = document.querySelectorAll(".awooc-popup-overlay,.awooc-overlay,.mfp-bg,.mfp-wrap");
        for (var i = 0; i < overlays.length; i++) {
            overlays[i].style.display = "none";
            overlays[i].classList.remove("active", "mfp-ready");
            overlays[i].setAttribute("aria-hidden", "true");
        }

        if (document.body) {
            document.body.classList.remove("mfp-ready", "mfp-open", "awooc-open");
            document.body.style.overflow = "";
            document.body.style.paddingRight = "";
        }
        if (document.documentElement) document.documentElement.style.overflow = "";
    }

    function extractDetails(button) {
        var scope = button.closest(".single-product,.product,li.product,.productcard-section,.hits-section__slide,.products__item,.woocommerce") || document;
        var title = cleanText(button.getAttribute("data-title")) || findText(scope, [
            "h1.product_title",
            ".product_title",
            ".woocommerce-loop-product__title",
            ".products__item-name",
            ".productcard-section__title"
        ]) || document.title || "Изделие";

        var sku = cleanText(button.getAttribute("data-sku")) || findText(scope, [
            ".sku_wrapper .sku",
            ".product__articul .value",
            ".product__sku"
        ]);
        if (!sku) {
            var skuMatch = cleanText(scope.textContent).match(/Артикул[:\s]*([A-Za-zА-Яа-я0-9\-]+)/i);
            if (skuMatch && skuMatch[1]) sku = cleanText(skuMatch[1]);
        }

        var price = cleanText(button.getAttribute("data-price")) || findText(scope, [
            ".price .woocommerce-Price-amount",
            ".productcard-section__cost",
            ".products__item-price",
            ".woocommerce-Price-amount"
        ]);

        var url = button.getAttribute("data-link");
        if (!url) {
            var productLink = scope.querySelector("a[href*='/product/']");
            if (productLink) url = productLink.getAttribute("href");
        }

        return {
            title: title,
            sku: sku,
            price: price,
            url: absoluteUrl(url || window.location.href)
        };
    }

    function openWhatsApp(details, kind) {
        var phone = pickWhatsAppPhone();
        var intent = kind === "offer"
            ? "Здравствуйте! Хочу получить предложение по изделию."
            : "Здравствуйте! Хочу оформить заказ.";
        var message = [intent, "Изделие: " + (details.title || "Без названия")];
        if (details.sku) message.push("Артикул: " + details.sku);
        if (details.price) message.push("Цена: " + details.price);
        message.push("Ссылка: " + (details.url || window.location.href));

        var waUrl = "https://wa.me/" + phone + "?text=" + encodeURIComponent(message.join("\n"));
        window.open(waUrl, "_blank", "noopener,noreferrer");
    }

    function copyText(text) {
        if (!text) return Promise.resolve(false);
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(text).then(function () { return true; }).catch(function () { return false; });
        }
        try {
            var textarea = document.createElement("textarea");
            textarea.value = text;
            textarea.setAttribute("readonly", "");
            textarea.style.position = "fixed";
            textarea.style.opacity = "0";
            document.body.appendChild(textarea);
            textarea.select();
            var copied = document.execCommand("copy");
            document.body.removeChild(textarea);
            return Promise.resolve(!!copied);
        } catch (error) {
            return Promise.resolve(false);
        }
    }

    function shareGiftHint(details) {
        var title = details && details.title ? details.title : "Изделие";
        var url = details && details.url ? details.url : window.location.href;
        var sharePayload = {
            title: "Намек на подарок",
            text: "Посмотри это изделие: " + title,
            url: url
        };

        if (navigator.share) {
            navigator.share(sharePayload).catch(function () {
                copyText(url).then(function (copied) {
                    if (copied) alert("Ссылка на изделие скопирована");
                    else window.prompt("Скопируйте ссылку:", url);
                });
            });
            return;
        }

        copyText(url).then(function (copied) {
            if (copied) alert("Ссылка на изделие скопирована");
            else window.prompt("Скопируйте ссылку:", url);
        });
    }

    function overrideLegacyHooks() {
        window.openWaModal = function (name, price, sku) {
            closeLegacyOneClickUi();
            openWhatsApp({
                title: cleanText(name),
                price: cleanText(price),
                sku: cleanText(sku),
                url: window.location.href
            });
            return false;
        };

        window.sendToWhatsApp = function () {
            var titleNode = document.getElementById("wa-product-name");
            var priceNode = document.getElementById("wa-product-price");
            var skuNode = document.getElementById("wa-product-sku");
            closeLegacyOneClickUi();
            openWhatsApp({
                title: cleanText(titleNode && titleNode.textContent),
                price: cleanText(priceNode && priceNode.textContent),
                sku: cleanText(skuNode && skuNode.textContent),
                url: window.location.href
            });
            return false;
        };
    }

    function fixYithLoader() {
        if (window.yith_infs) window.yith_infs.loader = YITH_LOADER_DATA_URI;

        var images = document.querySelectorAll(
            "img[src*='yith-infinite-scrolling/assets/images/loader.gif']," +
            "#yit-infs-load-img img,.yit-infs-loader img"
        );
        for (var i = 0; i < images.length; i++) {
            images[i].src = YITH_LOADER_DATA_URI;
            images[i].onerror = function () { this.src = YITH_LOADER_DATA_URI; };
        }
    }

    function isCatalogPage() {
        var body = document.body;
        if (!body) return false;
        if (body.classList.contains("post-type-archive-product")) return true;
        if (body.classList.contains("tax-product_cat")) return true;
        if (body.classList.contains("tax-product_tag")) return true;

        var path = (window.location.pathname || "").toLowerCase();
        return path.indexOf("/shop") !== -1 || path.indexOf("/product-category/") !== -1;
    }

    function getProductsContainerFrom(scope) {
        if (!scope || !scope.querySelector) return null;
        return scope.querySelector("ul.products") || scope.querySelector(".products");
    }

    function getPaginationNodeFrom(scope) {
        if (!scope || !scope.querySelector) return null;
        return scope.querySelector("nav.woocommerce-pagination") || scope.querySelector(".woocommerce-pagination");
    }

    function getNextPageUrlFrom(scope) {
        if (!scope || !scope.querySelector) return "";
        var link = scope.querySelector("nav.woocommerce-pagination a.next, .woocommerce-pagination a.next, a.next.page-numbers");
        if (!link || !link.getAttribute("href")) return "";
        return absoluteUrl(link.getAttribute("href"));
    }

    function getProductKey(item) {
        if (!item || !item.querySelector) return "";
        var dataId = item.getAttribute("data-product_id") || item.getAttribute("data-productid");
        if (dataId) return "id:" + dataId;

        var link = item.querySelector("a[href*='/product/']");
        if (link && link.getAttribute("href")) return "url:" + absoluteUrl(link.getAttribute("href"));

        if (item.id) return "node:" + item.id;
        return cleanText(item.textContent).slice(0, 160);
    }

    function ensureInfiniteStyles() {
        if (document.getElementById("dm-infinite-style")) return;
        var style = document.createElement("style");
        style.id = "dm-infinite-style";
        style.textContent = [
            "." + INFINITE_SENTINEL_CLASS + "{height:72px;display:flex;align-items:center;justify-content:center;font-size:14px;line-height:1.3;color:rgba(44,43,43,.72)}",
            "." + INFINITE_SENTINEL_CLASS + ".is-loading{opacity:.9}",
            "." + INFINITE_SENTINEL_CLASS + ".is-done{opacity:.62}"
        ].join("");
        document.head.appendChild(style);
    }

    function setInfiniteSentinelState(text, className) {
        var sentinel = infiniteState.sentinel;
        if (!sentinel) return;
        sentinel.className = INFINITE_SENTINEL_CLASS + (className ? " " + className : "");
        sentinel.textContent = text || "";
    }

    function ensureInfiniteSentinel(container) {
        if (!container || !container.parentNode) return null;
        var sentinel = infiniteState.sentinel;
        if (!sentinel || !document.body.contains(sentinel)) {
            sentinel = document.createElement("div");
            sentinel.className = INFINITE_SENTINEL_CLASS;
            sentinel.setAttribute("aria-live", "polite");
            infiniteState.sentinel = sentinel;
        }

        if (sentinel.parentNode !== container.parentNode) {
            container.parentNode.insertBefore(sentinel, container.nextSibling);
        } else if (container.nextSibling !== sentinel) {
            container.parentNode.insertBefore(sentinel, container.nextSibling);
        }
        return sentinel;
    }

    function replacePaginationFrom(doc) {
        var currentPagination = getPaginationNodeFrom(document);
        var incomingPagination = getPaginationNodeFrom(doc);

        if (currentPagination && incomingPagination) {
            currentPagination.innerHTML = incomingPagination.innerHTML;
            return;
        }

        if (currentPagination && !incomingPagination) {
            if (currentPagination.parentNode) currentPagination.parentNode.removeChild(currentPagination);
            return;
        }

        if (!currentPagination && incomingPagination && infiniteState.container && infiniteState.container.parentNode) {
            infiniteState.container.parentNode.insertBefore(incomingPagination, infiniteState.container.nextSibling);
        }
    }

    function appendProductsFromDoc(doc) {
        var sourceContainer = getProductsContainerFrom(doc);
        var targetContainer = infiniteState.container;
        if (!sourceContainer || !targetContainer) return 0;

        var existing = {};
        var currentItems = targetContainer.querySelectorAll("li.product,li.product__ajax-scroll,.product__ajax-scroll");
        for (var i = 0; i < currentItems.length; i++) {
            var currentKey = getProductKey(currentItems[i]);
            if (currentKey) existing[currentKey] = true;
        }

        var incomingItems = sourceContainer.querySelectorAll("li.product,li.product__ajax-scroll,.product__ajax-scroll");
        var appended = 0;
        for (var j = 0; j < incomingItems.length; j++) {
            var key = getProductKey(incomingItems[j]);
            if (key && existing[key]) continue;
            if (key) existing[key] = true;
            targetContainer.appendChild(incomingItems[j].cloneNode(true));
            appended++;
        }
        return appended;
    }

    function loadNextProducts() {
        if (infiniteState.loading) return;
        if (!infiniteState.container || !document.body.contains(infiniteState.container)) return;

        var nextUrl = infiniteState.nextUrl || getNextPageUrlFrom(document);
        if (!nextUrl) {
            setInfiniteSentinelState("Вы дошли до конца каталога", "is-done");
            return;
        }
        if (infiniteState.loadedPages[nextUrl]) {
            setInfiniteSentinelState("Вы дошли до конца каталога", "is-done");
            infiniteState.nextUrl = "";
            return;
        }

        infiniteState.loading = true;
        infiniteState.loadedPages[nextUrl] = true;
        setInfiniteSentinelState("Загружаем еще изделия...", "is-loading");

        fetch(nextUrl, { credentials: "same-origin" }).then(function (response) {
            if (!response.ok) throw new Error("HTTP " + response.status);
            return response.text();
        }).then(function (html) {
            var parser = new DOMParser();
            var doc = parser.parseFromString(html, "text/html");
            var appended = appendProductsFromDoc(doc);

            replacePaginationFrom(doc);
            infiniteState.nextUrl = getNextPageUrlFrom(doc) || "";

            if (appended > 0) scheduleRefresh();

            if (infiniteState.nextUrl) setInfiniteSentinelState("Прокрутите ниже для загрузки", "");
            else setInfiniteSentinelState("Вы дошли до конца каталога", "is-done");
        }).catch(function () {
            delete infiniteState.loadedPages[nextUrl];
            setInfiniteSentinelState("Ошибка загрузки. Прокрутите еще раз.", "");
        }).finally(function () {
            infiniteState.loading = false;
        });
    }

    function fallbackInfiniteOnScroll() {
        if (!infiniteState.sentinel || infiniteState.loading) return;
        if (!infiniteState.nextUrl) return;
        var rect = infiniteState.sentinel.getBoundingClientRect();
        if (rect.top <= window.innerHeight + INFINITE_SCROLL_OFFSET) loadNextProducts();
    }

    function bindInfiniteObserver() {
        if (infiniteState.observer || !("IntersectionObserver" in window)) return;
        infiniteState.observer = new IntersectionObserver(function (entries) {
            for (var i = 0; i < entries.length; i++) {
                if (!entries[i].isIntersecting) continue;
                loadNextProducts();
                break;
            }
        }, {
            root: null,
            rootMargin: "0px 0px 1100px 0px",
            threshold: 0
        });
    }

    function setupInfiniteScrollFallback() {
        if (!isCatalogPage()) return;

        var container = getProductsContainerFrom(document);
        if (!container) return;

        ensureInfiniteStyles();
        ensureInfiniteSentinel(container);
        infiniteState.container = container;
        infiniteState.nextUrl = getNextPageUrlFrom(document);

        if (!infiniteState.nextUrl) {
            setInfiniteSentinelState("Вы дошли до конца каталога", "is-done");
            return;
        }

        setInfiniteSentinelState("Прокрутите ниже для загрузки", "");

        bindInfiniteObserver();
        if (infiniteState.observer && infiniteState.sentinel) {
            infiniteState.observer.unobserve(infiniteState.sentinel);
            infiniteState.observer.observe(infiniteState.sentinel);
        }

        if (!infiniteState.fallbackBound) {
            infiniteState.fallbackBound = true;
            window.addEventListener("scroll", fallbackInfiniteOnScroll, { passive: true });
            window.addEventListener("resize", fallbackInfiniteOnScroll);
        }
        fallbackInfiniteOnScroll();
    }

    function readWishlist() {
        try {
            var raw = localStorage.getItem(WISHLIST_STORAGE_KEY);
            var list = raw ? JSON.parse(raw) : [];
            if (!Array.isArray(list)) return [];
            return list.map(String);
        } catch (error) {
            return [];
        }
    }

    function writeWishlist(list) {
        try {
            localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(list));
        } catch (error) {
            /* ignore storage errors */
        }
    }

    function syncWishlistUI() {
        var list = readWishlist();
        var map = {};
        for (var i = 0; i < list.length; i++) map[list[i]] = true;

        var buttons = document.querySelectorAll(WISHLIST_BUTTON_SELECTOR);
        for (var j = 0; j < buttons.length; j++) {
            var btn = buttons[j];
            var id = String(btn.getAttribute("data-item_id") || "");
            var added = !!map[id];

            btn.classList.toggle("add", !added);
            btn.classList.toggle("remove", added);
            btn.setAttribute("aria-pressed", added ? "true" : "false");
        }

        var counters = document.querySelectorAll(".alg-wc-wl-counter");
        for (var k = 0; k < counters.length; k++) {
            if (counters[k].querySelector(".alg-wc-wl-counter")) continue;
            counters[k].textContent = String(list.length);
        }
    }

    function toggleWishlistItem(itemId) {
        if (!itemId) return;

        var list = readWishlist();
        var normalizedId = String(itemId);
        var idx = list.indexOf(normalizedId);
        if (idx === -1) list.push(normalizedId);
        else list.splice(idx, 1);

        writeWishlist(list);
        syncWishlistUI();
    }

    function onActionEvent(event) {
        var oneClickButton = closest(event.target, ONE_CLICK_SELECTOR);
        if (oneClickButton) {
            consumeEvent(event);
            if (!shouldRunAction(oneClickButton, "dmWaTs")) return false;
            closeLegacyOneClickUi();
            openWhatsApp(extractDetails(oneClickButton), "order");
            return false;
        }

        var giftHintButton = closest(event.target, GIFT_HINT_SELECTOR);
        if (giftHintButton) {
            consumeEvent(event);
            if (!shouldRunAction(giftHintButton, "dmGiftTs")) return false;
            shareGiftHint(extractDetails(giftHintButton));
            return false;
        }

        var offerButton = closest(event.target, OFFER_SELECTOR);
        if (offerButton) {
            consumeEvent(event);
            if (!shouldRunAction(offerButton, "dmOfferTs")) return false;
            closeLegacyOneClickUi();
            openWhatsApp(extractDetails(offerButton), "offer");
            return false;
        }

        var wishlistButton = closest(event.target, WISHLIST_BUTTON_SELECTOR);
        if (wishlistButton) {
            consumeEvent(event);
            if (!shouldRunAction(wishlistButton, "dmWlTs")) return false;
            toggleWishlistItem(wishlistButton.getAttribute("data-item_id"));
            return false;
        }
        return true;
    }

    function onPreemptEvent(event) {
        if (
            closest(event.target, ONE_CLICK_SELECTOR) ||
            closest(event.target, GIFT_HINT_SELECTOR) ||
            closest(event.target, OFFER_SELECTOR) ||
            closest(event.target, WISHLIST_BUTTON_SELECTOR)
        ) {
            consumeEvent(event);
            return false;
        }
        return true;
    }

    function bindDelegatedEvents() {
        var marker = document.documentElement;
        if (!marker || marker.dataset.dmDelegatedBound === "1") return;
        marker.dataset.dmDelegatedBound = "1";

        var actionEvents = ["click", "mouseup", "touchend", "pointerup"];
        for (var i = 0; i < actionEvents.length; i++) {
            document.addEventListener(actionEvents[i], onActionEvent, true);
        }

        var preemptEvents = ["mousedown", "touchstart", "pointerdown"];
        for (var j = 0; j < preemptEvents.length; j++) {
            document.addEventListener(preemptEvents[j], onPreemptEvent, true);
        }
    }

    var refreshToken = null;
    function scheduleRefresh() {
        if (refreshToken) return;
        var runner = function () {
            refreshToken = null;
            syncWishlistUI();
            fixYithLoader();
            closeLegacyOneClickUi();
            setupInfiniteScrollFallback();
        };
        if (window.requestAnimationFrame) refreshToken = window.requestAnimationFrame(runner);
        else refreshToken = window.setTimeout(runner, 80);
    }

    function init() {
        bindDelegatedEvents();
        overrideLegacyHooks();
        scheduleRefresh();

        if (window.MutationObserver && document.body) {
            var observer = new MutationObserver(function (mutations) {
                for (var i = 0; i < mutations.length; i++) {
                    if (mutations[i].type === "childList" && mutations[i].addedNodes.length) {
                        scheduleRefresh();
                        break;
                    }
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
        }

        if (window.jQuery) {
            window.jQuery(document).on("alg_wc_wish_list_init yith-infs-added-products awooc_open awooc_close", function () {
                scheduleRefresh();
            });
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
