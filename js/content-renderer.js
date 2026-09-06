/* Cryptova content renderer — fetches services/pricing/faq from the public API
   and renders them into page containers. Pages using this stay up-to-date with
   whatever the admin edits in the dashboard (no manual HTML editing needed). */

(function (window) {
    'use strict';

    function esc(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
        });
    }

    async function getJSON(url) {
        const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        return data.success ? data.data : [];
    }

    // ─── SERVICES ───
    async function renderServices(category, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        try {
            const services = await getJSON('/api/content/services?category=' + encodeURIComponent(category));
            container.innerHTML = services.filter(function (s) { return s.visible !== false; })
                .map(function (s, i) {
                    const img = s.image
                        ? '<img src="' + esc(s.image) + '" alt="' + esc(s.title) + '" class="service-card-img">'
                        : '';
                    const features = (s.features || []).map(function (f) {
                        return '<li><i class="fas fa-check-circle"></i> ' + esc(f) + '</li>';
                    }).join('');
                    return '<div class="service-card" data-aos="fade-up" data-aos-delay="' + (100 + (i % 3) * 100) + '">' +
                        img +
                        '<div class="service-icon"><i class="fas ' + esc(s.icon || 'fa-star') + '"></i></div>' +
                        '<h3>' + esc(s.title) + '</h3>' +
                        '<p>' + esc(s.description || '') + '</p>' +
                        '<ul class="service-detail-features">' + features + '</ul>' +
                        '<div class="service-cta">' +
                        '<a href="/contact-Rb1jI0TUQy-s" class="btn btn-gold btn-sm"><i class="fas fa-paper-plane"></i> اطلب الخدمة</a>' +
                        '</div>' +
                        '</div>';
                }).join('');
            if (window.AosInit) window.AosInit(container.querySelectorAll('[data-aos]'));
        } catch (e) {
            console.error('Failed to render services:', e);
        }
    }

    // ─── PRICING: crypto rates table ───
    async function renderCryptoRates(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        try {
            const pricing = await getJSON('/api/content/pricing');
            const rates = pricing.cryptoRates || [];
            container.innerHTML = rates.map(function (r) {
                return '<tr>' +
                    '<td data-label="العملة"><div class="crypto-name"><div class="crypto-icon" style="background:' + esc(r.color) + '20;color:' + esc(r.color) + '">' + esc(r.symbol) + '</div><div><strong>' + esc(r.currency) + '</strong><br><span style="color:var(--text-muted);font-size:0.85rem">' + esc(r.fullName) + '</span></div></div></td>' +
                    '<td data-label="الحد الأدنى">' + esc(r.min) + '</td>' +
                    '<td data-label="نسبة العمولة">' + esc(r.fee) + '</td>' +
                    '<td data-label="سرعة التنفيذ">' + esc(r.speed) + '</td>' +
                    '<td data-label="إجراء"><a href="/contact-Rb1jI0TUQy-s" class="btn btn-gold btn-sm">ابدأ الآن</a></td>' +
                    '</tr>';
            }).join('');
            if (window.AosInit) window.AosInit(container.querySelectorAll('[data-aos]'));
        } catch (e) {
            console.error('Failed to render rates:', e);
        }
    }

    // ─── PRICING: dev packages ───
    async function renderPackages(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        try {
            const pricing = await getJSON('/api/content/pricing');
            const packages = pricing.packages || [];
            container.innerHTML = packages.map(function (p, i) {
                const featuredClass = p.featured ? ' featured' : '';
                const btnClass = p.featured ? 'btn btn-gold' : 'btn btn-outline';
                const features = (p.features || []).map(function (f) {
                    return '<li><i class="fas fa-check-circle"></i> ' + esc(f) + '</li>';
                }).join('');
                return '<div class="pricing-card' + featuredClass + '" data-aos="fade-up" data-aos-delay="' + (100 + (i % 3) * 100) + '">' +
                    '<div class="pricing-icon"><i class="fas ' + esc(p.icon || 'fa-star') + '"></i></div>' +
                    '<h3>' + esc(p.name) + '</h3>' +
                    '<p style="color: var(--text-muted); font-size: 0.9rem;">' + esc(p.subtitle || '') + '</p>' +
                    '<div class="price">' + esc(p.price) + ' <small>' + esc(p.priceNote || '') + '</small></div>' +
                    '<ul class="pricing-features">' + features + '</ul>' +
                    '<a href="/contact-Rb1jI0TUQy-s" class="' + btnClass + '" style="width: 100%;">طلب الباقة</a>' +
                    '</div>';
            }).join('');
            if (window.AosInit) window.AosInit(container.querySelectorAll('[data-aos]'));
        } catch (e) {
            console.error('Failed to render packages:', e);
        }
    }

    // ─── FAQ ───
    function bindFaqAccordion(container) {
        var items = container.querySelectorAll('.faq-item');
        items.forEach(function (item) {
            var question = item.querySelector('.faq-question');
            var answer = item.querySelector('.faq-answer');
            var content = item.querySelector('.faq-answer-content');
            if (question && answer && content) {
                question.addEventListener('click', function () {
                    var isActive = item.classList.contains('active');
                    items.forEach(function (o) {
                        if (o !== item) {
                            o.classList.remove('active');
                            var oa = o.querySelector('.faq-answer');
                            if (oa) oa.style.maxHeight = '0';
                        }
                    });
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
    }

    async function renderFaq(category, containerId, makeFirstActive) {
        const container = document.getElementById(containerId);
        if (!container) return;
        try {
            const faq = await getJSON('/api/content/faq?category=' + encodeURIComponent(category));
            container.innerHTML = faq.map(function (f, i) {
                const activeClass = (i === 0 && makeFirstActive === false) ? '' : '';
                const style = (i === 0 && makeFirstActive !== false) ? ' style="max-height: 200px;"' : '';
                return '<div class="faq-item' + (i === 0 && makeFirstActive !== false ? ' active' : '') + '">' +
                    '<button class="faq-question">' + esc(f.question) + '<i class="fas fa-chevron-down"></i></button>' +
                    '<div class="faq-answer"' + style + '>' +
                    '<div class="faq-answer-content">' + esc(f.answer) + '</div>' +
                    '</div>' +
                    '</div>';
            }).join('');
            container.removeAttribute('data-aos');
            bindFaqAccordion(container);
            if (window.AosInit) window.AosInit(container.querySelectorAll('[data-aos]'));
        } catch (e) {
            console.error('Failed to render faq:', e);
        }
    }

    window.ContentRenderer = {
        renderServices: renderServices,
        renderCryptoRates: renderCryptoRates,
        renderPackages: renderPackages,
        renderFaq: renderFaq,
    };
})(window);
