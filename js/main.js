/* ============================================
   Cryptova - Main JavaScript
   Optimized for Performance
   ============================================ */

(function() {
    'use strict';

    // === Utility Functions ===
    function throttle(fn, wait) {
        var lastTime = 0;
        return function() {
            var now = Date.now();
            if (now - lastTime >= wait) {
                lastTime = now;
                fn.apply(this, arguments);
            }
        };
    }

    function debounce(fn, delay) {
        var timer;
        return function() {
            var context = this;
            var args = arguments;
            clearTimeout(timer);
            timer = setTimeout(function() {
                fn.apply(context, args);
            }, delay);
        };
    }

    // === DOM Ready ===
    document.addEventListener('DOMContentLoaded', function() {

        // === Loading Screen ===
        var loadingScreen = document.querySelector('.loading-screen');
        if (loadingScreen) {
            var hideLoader = function() {
                loadingScreen.classList.add('hidden');
                setTimeout(function() {
                    loadingScreen.style.display = 'none';
                }, 500);
            };

            if (document.readyState === 'complete') {
                setTimeout(hideLoader, 400);
            } else {
                window.addEventListener('load', function() {
                    setTimeout(hideLoader, 400);
                });
            }

            // Fallback
            setTimeout(hideLoader, 2500);
        }

        // === Navbar Scroll Effect (Throttled) ===
        var navbar = document.querySelector('.navbar');
        if (navbar) {
            var lastScrollY = 0;
            var ticking = false;

            var updateNavbar = function() {
                if (window.scrollY > 50) {
                    navbar.classList.add('scrolled');
                } else {
                    navbar.classList.remove('scrolled');
                }
                ticking = false;
            };

            window.addEventListener('scroll', function() {
                lastScrollY = window.scrollY;
                if (!ticking) {
                    requestAnimationFrame(updateNavbar);
                    ticking = true;
                }
            }, { passive: true });
        }

        // === Mobile Menu Toggle ===
        var mobileToggle = document.querySelector('.mobile-toggle');
        var navbarNav = document.querySelector('.navbar-nav');
        var navOverlay = document.querySelector('.nav-overlay');
        var navLinks = document.querySelectorAll('.navbar-nav .nav-link');

        if (mobileToggle && navbarNav) {
            var toggleMenu = function() {
                var isOpen = navbarNav.classList.toggle('open');
                if (navOverlay) navOverlay.classList.toggle('show');
                document.body.style.overflow = isOpen ? 'hidden' : '';
                mobileToggle.setAttribute('aria-expanded', isOpen);
            };

            var closeMenu = function() {
                navbarNav.classList.remove('open');
                if (navOverlay) navOverlay.classList.remove('show');
                document.body.style.overflow = '';
                mobileToggle.setAttribute('aria-expanded', 'false');
            };

            mobileToggle.addEventListener('click', toggleMenu);
            if (navOverlay) {
                navOverlay.addEventListener('click', closeMenu);
            }

            navLinks.forEach(function(link) {
                link.addEventListener('click', closeMenu);
            });

            // Close on Escape
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape' && navbarNav.classList.contains('open')) {
                    closeMenu();
                }
            });
        }

        // === Scroll Animations (AOS-like) with IntersectionObserver ===
        var animatedElements = document.querySelectorAll('[data-aos]');

        if ('IntersectionObserver' in window && animatedElements.length > 0) {
            var aosObserver = new IntersectionObserver(function(entries) {
                entries.forEach(function(entry) {
                    if (entry.isIntersecting) {
                        var el = entry.target;
                        var delay = parseInt(el.getAttribute('data-aos-delay') || '0');
                        if (delay > 0) {
                            setTimeout(function() {
                                el.classList.add('aos-animate');
                            }, delay);
                        } else {
                            el.classList.add('aos-animate');
                        }
                        aosObserver.unobserve(el);
                    }
                });
            }, {
                threshold: 0.15,
                rootMargin: '0px 0px -50px 0px'
            });

            animatedElements.forEach(function(el) {
                aosObserver.observe(el);
            });
        } else {
            // Fallback: show all
            animatedElements.forEach(function(el) {
                el.classList.add('aos-animate');
            });
        }

        // === Counter Animation ===
        var counters = document.querySelectorAll('.stat-number, .hero-stat-number');

        function animateCounter(el) {
            var target = parseInt(el.getAttribute('data-count'));
            if (isNaN(target) || target <= 0) return;

            var duration = 1800;
            var startTime = null;
            var startVal = 0;

            function update(timestamp) {
                if (!startTime) startTime = timestamp;
                var progress = Math.min((timestamp - startTime) / duration, 1);

                // Ease out cubic
                var eased = 1 - Math.pow(1 - progress, 3);
                var current = Math.floor(eased * target);

                el.textContent = formatNumber(current);

                if (progress < 1) {
                    requestAnimationFrame(update);
                } else {
                    el.textContent = formatNumber(target);
                }
            }

            requestAnimationFrame(update);
        }

        function formatNumber(num) {
            if (num >= 1000) {
                return num.toLocaleString('ar-SA');
            }
            return num.toString();
        }

        if ('IntersectionObserver' in window && counters.length > 0) {
            var counterObserver = new IntersectionObserver(function(entries) {
                entries.forEach(function(entry) {
                    if (entry.isIntersecting) {
                        animateCounter(entry.target);
                        counterObserver.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.5 });

            counters.forEach(function(counter) {
                if (counter.getAttribute('data-count')) {
                    counterObserver.observe(counter);
                }
            });
        }

        // === FAQ Accordion ===
        var faqItems = document.querySelectorAll('.faq-item');

        faqItems.forEach(function(item) {
            var question = item.querySelector('.faq-question');
            var answer = item.querySelector('.faq-answer');
            var content = item.querySelector('.faq-answer-content');

            if (question && answer && content) {
                question.addEventListener('click', function() {
                    var isActive = item.classList.contains('active');

                    // Close all others
                    faqItems.forEach(function(otherItem) {
                        if (otherItem !== item) {
                            otherItem.classList.remove('active');
                            var otherAnswer = otherItem.querySelector('.faq-answer');
                            if (otherAnswer) otherAnswer.style.maxHeight = '0';
                        }
                    });

                    // Toggle current
                    if (!isActive) {
                        item.classList.add('active');
                        answer.style.maxHeight = content.scrollHeight + 30 + 'px';
                    } else {
                        item.classList.remove('active');
                        answer.style.maxHeight = '0';
                    }
                });
            }
        });

        // === Scroll to Top Button (Throttled) ===
        var scrollTopBtn = document.querySelector('.scroll-top');

        if (scrollTopBtn) {
            var updateScrollTop = throttle(function() {
                if (window.scrollY > 400) {
                    scrollTopBtn.classList.add('visible');
                } else {
                    scrollTopBtn.classList.remove('visible');
                }
            }, 100);

            window.addEventListener('scroll', updateScrollTop, { passive: true });

            scrollTopBtn.addEventListener('click', function() {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }

        // === Contact Form Handling ===
        var contactForm = document.getElementById('contactForm');

        if (contactForm) {
            contactForm.addEventListener('submit', function(e) {
                e.preventDefault();

                var formData = new FormData(contactForm);
                var data = {};
                formData.forEach(function(value, key) {
                    data[key] = value;
                });

                var submitBtn = contactForm.querySelector('button[type="submit"]');
                var originalHTML = submitBtn ? submitBtn.innerHTML : '';
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري تجهيز الرسالة...';
                }

                var name = (data.name || '').trim();
                var email = (data.email || '').trim();
                var phone = (data.phone || '').trim();
                var service = (data.service || '').trim();
                var msg = (data.message || '').trim();

                var subject = 'رسالة جديدة من موقع Cryptova';
                if (name) {
                    subject += ' - ' + name;
                }

                var bodyLines = [];
                if (name) {
                    bodyLines.push('الاسم: ' + name);
                }
                if (email) {
                    bodyLines.push('البريد الإلكتروني: ' + email);
                }
                if (phone) {
                    bodyLines.push('رقم الهاتف: ' + phone);
                }
                if (service) {
                    bodyLines.push('الخدمة المطلوبة: ' + service);
                }
                bodyLines.push('');
                bodyLines.push(msg);

                var mailtoLink = 'mailto:cryptovaye@gmail.com?subject=' +
                    encodeURIComponent(subject) + '&body=' +
                    encodeURIComponent(bodyLines.join('\r\n'));

                window.location.href = mailtoLink;

                try {
                    fetch('/api/contact', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    }).catch(function() {});
                } catch (err) {}

                showToast('تم فتح برنامج بريدك — اضغط "إرسال" هناك، ويُحفظ نسخة احتياطية من رسالتك هنا');
                contactForm.reset();

                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalHTML;
                }
            });
        }

        // === Crypto Calculator ===
        var calcForm = document.getElementById('cryptoCalcForm');

        if (calcForm) {
            calcForm.addEventListener('submit', function(e) {
                e.preventDefault();

                var amount = parseFloat(document.getElementById('calcAmount').value);
                var fromCurrency = document.getElementById('calcFrom').value;
                var toCurrency = document.getElementById('calcTo').value;
                var regionEl = document.getElementById('calcRegion');
                var region = regionEl ? regionEl.value : 'sanaa';

                if (isNaN(amount) || amount <= 0) {
                    showToast('الرجاء إدخال مبلغ صحيح');
                    return;
                }

                var live = window.__cryptoLiveRates || {};
                var yer = window.__cryptoYerRates || {};
                var btcUsd = live.BTC || 66000;
                var ethUsd = live.ETH || 3300;

                var regionRates = /* @__PURE__ */(function() {
                    var r = (region === 'aden') ? yer.aden : yer.sanaa;
                    if (r && r.buy && r.sell) return r;
                    var fallback = (region === 'aden') ? { buy: 1554, sell: 1562 } : { buy: 533, sell: 536 };
                    return fallback;
                })();

                var rates = {
                    'USDT': { 'YER': regionRates.buy, 'USD': 1, 'BTC': 1 / btcUsd, 'ETH': 1 / ethUsd },
                    'BTC': { 'YER': btcUsd * regionRates.buy, 'USD': btcUsd, 'USDT': btcUsd, 'ETH': btcUsd / ethUsd },
                    'ETH': { 'YER': ethUsd * regionRates.buy, 'USD': ethUsd, 'USDT': ethUsd, 'BTC': ethUsd / btcUsd },
                    'YER': { 'USDT': 1 / regionRates.sell, 'USD': 1 / regionRates.sell, 'BTC': 1 / (btcUsd * regionRates.sell), 'ETH': 1 / (ethUsd * regionRates.sell) },
                    'USD': { 'YER': regionRates.buy, 'USDT': 1, 'BTC': 1 / btcUsd, 'ETH': 1 / ethUsd }
                };

                var result = 0;
                if (rates[fromCurrency] && rates[fromCurrency][toCurrency]) {
                    result = amount * rates[fromCurrency][toCurrency];
                }

                var resultEl = document.getElementById('calcResult');
                if (resultEl) {
                    resultEl.textContent = result.toFixed(toCurrency === 'BTC' ? 8 : 2) + ' ' + toCurrency;
                }

                updateCalcRateNote();
            });
        }

        // === Live Crypto Prices ===
        var cryptoPricesTable = document.getElementById('cryptoPricesBody');
        var cryptoUpdateTime = document.getElementById('cryptoUpdateTime');

        var COINS = [
            { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', icon: '₿', color: '#f7931a' },
            { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', icon: 'Ξ', color: '#627eea' },
            { id: 'tether', name: 'Tether', symbol: 'USDT', icon: '₮', color: '#26a17b' },
            { id: 'binancecoin', name: 'BNB', symbol: 'BNB', icon: 'B', color: '#f3ba2f' },
            { id: 'solana', name: 'Solana', symbol: 'SOL', icon: 'S', color: '#9945ff' },
            { id: 'ripple', name: 'XRP', symbol: 'XRP', icon: 'X', color: '#00aae4' }
        ];

        var livePrices = {};
        var isFirstLoad = true;

        // Expose live rates for the crypto calculator (works on all pages)
        window.__cryptoLiveRates = {};

        // Fallback YER rates until the server proxy responds (region-aware calculator)
        window.__cryptoYerRates = {
            sanaa: { buy: 533, sell: 536 },
            aden: { buy: 1554, sell: 1562 },
        };

        // Loading shimmer while prices load
        if (cryptoPricesTable) {
            cryptoPricesTable.innerHTML = (
                '<tr><td colspan="4"><div class="loading-row"></div></td></tr>'
            ).repeat(6);
        }

        function formatPrice(price) {
            if (price === null || price === undefined) return '--';
            if (price >= 1000) return '$' + Math.round(price).toLocaleString('en-US');
            if (price >= 1) return '$' + price.toFixed(2);
            return '$' + price.toFixed(4);
        }

        function formatChange(change) {
            if (change === null || change === undefined) return '--';
            var up = change >= 0;
            return (up ? '+' : '') + change.toFixed(2) + '%';
        }

        function renderRows() {
            var html = COINS.map(function(coin) {
                var price = livePrices[coin.symbol];
                var change = livePrices[coin.symbol + '_change'];
                var up = change >= 0;
                return '<tr id="crypto-row-' + coin.symbol + '">' +
                    '<td><div class="crypto-name">' +
                        '<div class="crypto-icon" style="background:' + coin.color + '20; color:' + coin.color + '">' + coin.icon + '</div>' +
                        '<div><strong>' + coin.name + '</strong><br><span style="color:var(--text-muted);font-size:0.85rem">' + coin.symbol + '</span></div>' +
                    '</div></td>' +
                    '<td><strong class="crypto-price">' + formatPrice(price) + '</strong></td>' +
                    '<td class="' + (up ? 'price-up' : 'price-down') + '">' +
                        '<i class="fas fa-caret-' + (up ? 'up' : 'down') + '"></i> ' + formatChange(change) +
                    '</td>' +
                    '<td><a href="' + '/contact-Rb1jI0TUQy-s' + '" class="btn btn-gold btn-sm">اشترِ الآن</a></td>' +
                '</tr>';
            }).join('');
            cryptoPricesTable.innerHTML = html;
        }

        function flashRow(row, up) {
            row.classList.remove('price-flash-up', 'price-flash-down');
            void row.offsetWidth;
            row.classList.add(up ? 'price-flash-up' : 'price-flash-down');
        }

        function updateRows() {
            COINS.forEach(function(coin) {
                var row = document.getElementById('crypto-row-' + coin.symbol);
                var price = livePrices[coin.symbol];
                var change = livePrices[coin.symbol + '_change'];
                var prev = livePrices[coin.symbol + '_prev'];
                if (!row) return;

                var priceEl = row.querySelector('.crypto-price');
                var changeEl = row.querySelector('td:nth-child(3)');
                var up = change >= 0;

                if (prev !== undefined && prev !== price) {
                    flashRow(row, price > prev);
                }

                if (priceEl) priceEl.textContent = formatPrice(price);
                if (changeEl) {
                    changeEl.className = (up ? 'price-up' : 'price-down');
                    changeEl.innerHTML = '<i class="fas fa-caret-' + (up ? 'up' : 'down') + '"></i> ' + formatChange(change);
                }
            });
        }

        function syncCalculatorRates() {
            var btc = livePrices['BTC'] || 66000;
            var eth = livePrices['ETH'] || 3300;
            window.__cryptoLiveRates = { BTC: btc, ETH: eth, USDT: 1 };
        }

        function applyYerRates(yer) {
            if (!yer) return;
            var meta = {
                __live: true,
                __manual: yer.source === 'manual',
            };
            window.__cryptoYerRates = Object.assign(meta,
                (yer.sanaa ? { sanaa: yer.sanaa } : {}),
                (yer.aden ? { aden: yer.aden } : {})
            );
        }

        function updateCalcRateNote() {
            var note = document.getElementById('calcRateNote');
            if (!note) return;
            var regionEl = document.getElementById('calcRegion');
            var region = regionEl ? regionEl.value : 'sanaa';
            var yer = window.__cryptoYerRates || {};
            var r = (region === 'aden') ? yer.aden : yer.sanaa;
            if (r && r.buy && r.sell) {
                var label = (region === 'aden') ? 'عدن والمحافظات الجنوبية' : 'صنعاء والمحافظات الشمالية';
                var tag = yer.__manual ? ' — تعديل يدوي' : (yer.__live ? ' — سعر السوق' : ' — سعر تقريبي');
                note.textContent = label + ' · شراء ' + r.buy + ' · بيع ' + r.sell + tag;
            } else {
                note.textContent = 'جاري تحميل سعر الصرف...';
            }
        }

        // Data shape: { id: { usd, usd_24h_change } } (CoinGecko or server-normalized)
        function applyCoinGeckoData(data) {
            COINS.forEach(function(coin) {
                var d = data[coin.id];
                if (d && d.usd !== undefined) {
                    livePrices[coin.symbol + '_prev'] = livePrices[coin.symbol];
                    livePrices[coin.symbol] = d.usd;
                    livePrices[coin.symbol + '_change'] = d.usd_24h_change;
                }
            });
            syncCalculatorRates();
        }

        // Data shape: Binance array [{ symbol, lastPrice, priceChangePercent }]
        function applyBinanceData(data) {
            data.forEach(function(ticker) {
                var symbol = ticker.symbol.replace('USDT', '');
                for (var i = 0; i < COINS.length; i++) {
                    if (COINS[i].symbol === symbol) {
                        livePrices[COINS[i].symbol + '_prev'] = livePrices[COINS[i].symbol];
                        livePrices[COINS[i].symbol] = parseFloat(ticker.lastPrice);
                        livePrices[COINS[i].symbol + '_change'] = parseFloat(ticker.priceChangePercent);
                        break;
                    }
                }
            });
            // USDT is a stablecoin pegged to $1
            for (var i = 0; i < COINS.length; i++) {
                if (COINS[i].symbol === 'USDT') {
                    livePrices[COINS[i].symbol + '_prev'] = livePrices[COINS[i].symbol];
                    livePrices[COINS[i].symbol] = 1.00;
                    livePrices[COINS[i].symbol + '_change'] = 0.01;
                    break;
                }
            }
            syncCalculatorRates();
        }

        function renderOrUpdate() {
            if (cryptoPricesTable) {
                if (isFirstLoad) {
                    renderRows();
                    isFirstLoad = false;
                } else {
                    updateRows();
                }
            }
            if (cryptoUpdateTime) {
                var now = new Date();
                cryptoUpdateTime.textContent = 'آخر تحديث: ' + now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
            }
        }

        function setUpdateError() {
            if (cryptoUpdateTime) {
                cryptoUpdateTime.textContent = 'تعذر الاتصال - إعادة المحاولة...';
            }
        }

        function fetchWithTimeout(url, timeout) {
            var controller = new AbortController();
            var timer = setTimeout(function() { controller.abort(); }, timeout);
            return fetch(url, { signal: controller.signal }).then(function(res) {
                clearTimeout(timer);
                if (!res.ok) throw new Error('Request failed');
                return res.json();
            }).catch(function(e) {
                clearTimeout(timer);
                throw e;
            });
        }

        function fetchCoinGecko() {
            var ids = COINS.map(function(c) { return c.id; }).join(',');
            var url = 'https://api.coingecko.com/api/v3/simple/price?ids=' + ids + '&vs_currencies=usd&include_24hr_change=true';
            return fetchWithTimeout(url, 10000);
        }

        function fetchBinance() {
            var symbols = [];
            for (var i = 0; i < COINS.length; i++) {
                if (COINS[i].symbol !== 'USDT') symbols.push(COINS[i].symbol + 'USDT');
            }
            var url = 'https://api.binance.com/api/v3/ticker/24hr?symbols=' + encodeURIComponent('["' + symbols.join('","') + '"]');
            return fetchWithTimeout(url, 10000);
        }

        function fetchViaProxy() {
            return fetch('/api/crypto-prices').then(function(res) {
                if (!res.ok) throw new Error('Proxy failed');
                return res.json();
            }).then(function(data) {
                if (!data || !data.prices) throw new Error('Proxy no data');
                applyYerRates(data.yer);
                return data.prices;
            });
        }

        function refreshPrices() {
            // Prefer the server proxy (cached, CORS-safe), then direct APIs as fallback
            fetchViaProxy()
                .then(function(prices) {
                    applyCoinGeckoData(prices);
                    renderOrUpdate();
                })
                .catch(function() {
                    fetchCoinGecko()
                        .then(function(data) {
                            applyCoinGeckoData(data);
                            renderOrUpdate();
                        })
                        .catch(function() {
                            fetchBinance()
                                .then(function(data) {
                                    applyBinanceData(data);
                                    renderOrUpdate();
                                })
                                .catch(function() {
                                    setUpdateError();
                                });
                        });
                });
        }

        refreshPrices();
        setInterval(refreshPrices, 30000);

        // Update the live rate note when the user switches region
        var calcRegionEl = document.getElementById('calcRegion');
        if (calcRegionEl) {
            calcRegionEl.addEventListener('change', updateCalcRateNote);
        }
        updateCalcRateNote();

        // === Swiper Testimonials ===
        if (typeof Swiper !== 'undefined') {
            new Swiper('.testimonials-slider', {
                slidesPerView: 1,
                spaceBetween: 24,
                loop: true,
                autoplay: {
                    delay: 5000,
                    disableOnInteraction: false,
                },
                pagination: {
                    el: '.swiper-pagination',
                    clickable: true,
                },
                navigation: {
                    nextEl: '.swiper-button-next',
                    prevEl: '.swiper-button-prev',
                },
                breakpoints: {
                    640: { slidesPerView: 1 },
                    768: { slidesPerView: 2 },
                    1024: { slidesPerView: 3 },
                },
                lazy: true,
                watchOverflow: true
            });

            new Swiper('.blog-slider', {
                slidesPerView: 1,
                spaceBetween: 24,
                loop: true,
                autoplay: {
                    delay: 4000,
                },
                pagination: {
                    el: '.swiper-pagination',
                    clickable: true,
                },
                breakpoints: {
                    640: { slidesPerView: 1 },
                    768: { slidesPerView: 2 },
                    1024: { slidesPerView: 3 },
                },
                watchOverflow: true
            });
        }

        // === Set Active Nav Link ===
        var currentPage = window.location.pathname.split('/').pop() || 'index.html';
        document.querySelectorAll('.navbar-nav .nav-link').forEach(function(link) {
            var href = link.getAttribute('href');
            if (href === currentPage || (currentPage === '' && href === 'index.html')) {
                link.classList.add('active');
            }
        });

        // === Smooth Scroll for Anchor Links ===
        document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
            anchor.addEventListener('click', function(e) {
                var href = this.getAttribute('href');
                if (href === '#') return;
                var target = document.querySelector(href);
                if (target) {
                    e.preventDefault();
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });

        // === Blog Filter (handled by blog.js for dynamic pages) ===

        // === Lazy Load Images ===
        if ('IntersectionObserver' in window) {
            var imageObserver = new IntersectionObserver(function(entries) {
                entries.forEach(function(entry) {
                    if (entry.isIntersecting) {
                        var img = entry.target;
                        if (img.dataset.src) {
                            img.src = img.dataset.src;
                            img.removeAttribute('data-src');
                        }
                        imageObserver.unobserve(img);
                    }
                });
            }, { rootMargin: '200px 0px' });

            document.querySelectorAll('img[data-src]').forEach(function(img) {
                imageObserver.observe(img);
            });
        }

    });

    // === AOS Re-init for Dynamic Content ===
    window.AosInit = function(elements) {
        if (!elements) return;
        if ('IntersectionObserver' in window) {
            var observer = new IntersectionObserver(function(entries) {
                entries.forEach(function(entry) {
                    if (entry.isIntersecting) {
                        var el = entry.target;
                        var delay = parseInt(el.getAttribute('data-aos-delay') || '0');
                        setTimeout(function() {
                            el.classList.add('aos-animate');
                        }, delay || 0);
                        observer.unobserve(el);
                    }
                });
            }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });
            elements.forEach(function(el) { observer.observe(el); });
        } else {
            elements.forEach(function(el) { el.classList.add('aos-animate'); });
        }
    };

    // === Global Toast Function ===
    window.showToast = function(message) {
        var existingToast = document.querySelector('.toast');
        if (existingToast) existingToast.remove();

        var toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = '<i class="fas fa-check-circle"></i><span>' + message + '</span>';
        document.body.appendChild(toast);

        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                toast.classList.add('show');
            });
        });

        setTimeout(function() {
            toast.classList.remove('show');
            setTimeout(function() {
                toast.remove();
            }, 300);
        }, 3500);
    };

})();
