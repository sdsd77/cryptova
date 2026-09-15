/* ============================================
   Cryptova - Blog Dynamic Loader
   Fetches blog posts from /api/blog/posts and renders them
   Handles filtering, pagination, and single post view
   ============================================ */

(function () {
    'use strict';

    function tr(key, fallback) {
        try { return (window.I18N && window.I18N.t) ? window.I18N.t(key) : (fallback || key); } catch (e) { return fallback || key; }
    }

    function isEn() {
        try { return window.I18N && window.I18N.getLang() === 'en'; } catch (e) { return false; }
    }

    const CATEGORY_LABELS = {
        crypto: 'العملات الرقمية',
        tech: 'التقنية',
        tips: 'نصائح',
        news: 'أخبار السوق',
    };

    function categoryLabel(category) {
        const key = 'blog.filter.' + (category || 'general');
        return tr(key, CATEGORY_LABELS[category] || 'عام');
    }

    const CATEGORY_ICONS = {
        crypto: 'fa-coins',
        tech: 'fa-code',
        tips: 'fa-lightbulb',
        news: 'fa-chart-line',
    };

    const GRADIENTS = [
        'linear-gradient(135deg, #1a3a5c, #0f2042)',
        'linear-gradient(135deg, #1e3a5f, #0d1f3c)',
        'linear-gradient(135deg, #142847, #0b1a2e)',
        'linear-gradient(135deg, #1b3654, #0e2240)',
    ];

    function formatDate(dateStr) {
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return tr('blog.date_unknown', 'تاريخ غير محدد');
            const locale = isEn() ? 'en-US' : 'ar-EG';
            return date.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });
        } catch (e) {
            return tr('blog.date_unknown', 'تاريخ غير محدد');
        }
    }

    function timeAgo(dateStr) {
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return tr('blog.date_unknown', 'تاريخ غير محدد');
            const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
            if (seconds < 60) return tr('blog.time.now', 'الآن');
            const fmt = isEn()
                ? function (n, unit) { return n + ' ' + unit + (n === 1 ? '' : 's') + ' ago'; }
                : function (n, unit) {
                    const arabicPlural = { minute: ['دقيقة', 'دقيقتين', 'دقائق'], hour: ['ساعة', 'ساعتين', 'ساعات'], day: ['يوم', 'يومين', 'أيام'] }[unit];
                    return 'قبل ' + n + ' ' + (n === 1 ? arabicPlural[0] : n === 2 ? arabicPlural[1] : n <= 10 ? arabicPlural[2] : arabicPlural[0]);
                };
            const minutes = Math.floor(seconds / 60);
            if (minutes < 60) return fmt(minutes, 'minute');
            const hours = Math.floor(minutes / 60);
            if (hours < 24) return fmt(hours, 'hour');
            const days = Math.floor(hours / 24);
            if (days < 30) return fmt(days, 'day');
            return formatDate(dateStr);
        } catch (e) {
            return tr('blog.date_unknown', 'تاريخ غير محدد');
        }
    }

    function escapeHtml(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function buildCard(post, index) {
        const label = categoryLabel(post.category);
        const icon = CATEGORY_ICONS[post.category] || 'fa-newspaper';
        const gradient = GRADIENTS[index % GRADIENTS.length];
        const imgSrc = post.image ? (/^https?:\/\//.test(post.image) ? escapeHtml(post.image) : `../images/${escapeHtml(post.image)}`) : '';

        let imageHtml;
        if (imgSrc) {
            imageHtml = `<img src="${imgSrc}" alt="${escapeHtml(post.title)}" class="blog-img" onerror="this.parentNode.innerHTML='<div class=\\'blog-image\\' style=\\'background:${gradient}\\'><i class=\\'fas ${icon}\\'></i></div>'">`;
        } else {
            imageHtml = `<div class="blog-image" style="background:${gradient}"><i class="fas ${icon}"></i></div>`;
        }

        return `
            <div class="blog-card" data-category="${post.category}" data-aos="fade-up" data-aos-delay="${(index % 3) * 100}">
                ${imageHtml}
                <div class="blog-content">
                    <div class="blog-meta">
                        <span class="blog-tag" data-i18n-text="blog.filter.${post.category}">${label}</span>
                        <span><i class="far fa-calendar"></i> ${formatDate(post.date)}</span>
                        <span class="blog-time-ago"><i class="far fa-clock"></i> ${timeAgo(post.date)}</span>
                    </div>
                    <h3>${escapeHtml(post.title)}</h3>
                    <p>${escapeHtml(post.excerpt)}</p>
                    <a href="/post-Jy7vgl0_4QjK/${encodeURIComponent(post.slug)}" class="service-link" data-i18n-text="svc.readMore">${tr('svc.readMore')} <i class="fas fa-arrow-left"></i></a>
                </div>
            </div>`;
    }

    // === Blog List Page Logic ===
    function initBlogList() {
        const grid = document.getElementById('blogGrid');
        const loading = document.getElementById('blogLoading');
        const empty = document.getElementById('blogEmpty');
        const pagination = document.getElementById('blogPagination');
        const filters = document.querySelectorAll('#blogFilters .blog-filter-btn');

        if (!grid || !loading) return;

        let currentPage = 1;
        let currentCategory = 'all';
        let totalPages = 1;

        function renderPagination(pages) {
            if (!pagination) return;
            totalPages = pages;
            if (pages <= 1) {
                pagination.style.display = 'none';
                pagination.innerHTML = '';
                return;
            }

            pagination.style.display = 'flex';

            let html = `
                <button class="pagination-btn" data-page="${currentPage - 1}" ${currentPage <= 1 ? 'disabled' : ''}>
                    <i class="fas fa-chevron-right"></i>
                </button>`;

            for (let i = 1; i <= pages; i++) {
                if (pages > 7 && i > 1 && i < pages - 1 && Math.abs(i - currentPage) > 2) {
                    if (Math.abs(i - currentPage - 1) > 2 || i === 2) {
                        if (i === 2) html += `<span class="pagination-btn" style="opacity:0.5;pointer-events:none;">...</span>`;
                    }
                    continue;
                }
                html += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
            }

            html += `
                <button class="pagination-btn" data-page="${currentPage + 1}" ${currentPage >= pages ? 'disabled' : ''}>
                    <i class="fas fa-chevron-left"></i>
                </button>`;

            pagination.innerHTML = html;

            pagination.querySelectorAll('.pagination-btn[data-page]').forEach(function (btn) {
                if (btn.disabled) return;
                btn.addEventListener('click', function () {
                    const page = parseInt(this.getAttribute('data-page'), 10);
                    if (!isNaN(page) && page >= 1 && page <= totalPages) {
                        currentPage = page;
                        loadPosts();
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                });
            });
        }

        function loadPosts() {
            grid.style.display = 'grid';
            loading.style.display = 'block';
            if (empty) empty.style.display = 'none';

            const params = new URLSearchParams({
                page: currentPage,
                limit: 6,
            });
            if (currentCategory && currentCategory !== 'all') {
                params.set('category', currentCategory);
            }

            fetch('/api/blog/posts?' + params.toString())
                .then(function (res) {
                    if (!res.ok) throw new Error('Failed to load posts');
                    return res.json();
                })
                .then(function (data) {
                    loading.style.display = 'none';

                    if (!data.data || data.data.length === 0) {
                        grid.innerHTML = '';
                        grid.style.display = 'none';
                        if (empty) empty.style.display = 'block';
                        renderPagination(0);
                        return;
                    }

                    grid.innerHTML = data.data.map(buildCard).join('');
                    grid.style.display = 'grid';

                    // Re-trigger AOS animations
                    if (window.AosInit) {
                        window.AosInit(grid.querySelectorAll('[data-aos]'));
                    }

                    if (empty) empty.style.display = 'none';
                    renderPagination(data.pagination.totalPages || 1);
                })
                .catch(function () {
                    loading.style.display = 'none';
                    grid.innerHTML = '<div class="post-loading"><p>' + tr('blog.err') + '</p></div>';
                    if (pagination) pagination.style.display = 'none';
                });
        }

        filters.forEach(function (btn) {
            btn.addEventListener('click', function () {
                filters.forEach(function (b) { b.classList.remove('active'); });
                this.classList.add('active');

                currentCategory = this.getAttribute('data-filter') || 'all';
                currentPage = 1;
                loadPosts();
            });
        });

        loadPosts();

        document.addEventListener('shift:i18n', function () {
            loadPosts();
        });

        // On visit, ask server to refresh from sources if enough time has passed.
        // Silent (non-blocking) so the page always shows existing articles quickly.
        fetch('/api/blog/refresh', { method: 'POST' })
            .then(function (res) { return res.json().catch(function () { return null; }); })
            .then(function (data) {
                if (data && !data.error) {
                    // Allow a moment for the background fetch to persist, then reload list
                    setTimeout(function () {
                        loadPosts();
                    }, 1500);
                }
            })
            .catch(function () { /* ignore refresh errors — content already shown */ });
    }

    // === Blog Post Page Logic ===
    function initBlogPost() {
        const container = document.getElementById('postContainer');
        if (!container) return;

        const loading = document.getElementById('postLoading');
        const notFound = document.getElementById('postNotFound');
        const content = document.getElementById('postContent');

        if (!loading || !notFound || !content) return;

        const pathParts = window.location.pathname.split('/').filter(Boolean);
        const slug = pathParts.length ? decodeURIComponent(pathParts[pathParts.length - 1]) : '';

        if (!slug) {
            loading.style.display = 'none';
            notFound.style.display = 'block';
            return;
        }

        fetch('/api/blog/posts/' + encodeURIComponent(slug))
            .then(function (res) {
                if (res.status === 404) {
                    throw new Error('Not found');
                }
                if (!res.ok) throw new Error('Failed');
                return res.json();
            })
            .then(function (data) {
                const post = data.data;
                loading.style.display = 'none';
                notFound.style.display = 'none';

                content.style.display = 'block';

                const label = categoryLabel(post.category);
                const icon = CATEGORY_ICONS[post.category] || 'fa-newspaper';
                const gradient = GRADIENTS[0];

                document.getElementById('postTag').textContent = label;
                document.getElementById('postTitle').textContent = post.title;
                document.getElementById('postDate').textContent = formatDate(post.date);
                document.getElementById('postReadTime').textContent = timeAgo(post.date);
                document.getElementById('postSource').textContent = post.source || 'SHIFT_YE';
                document.getElementById('postBodyContent').textContent = post.content || post.excerpt || '';

                // Hero image
                const heroImage = document.getElementById('postHeroImage');
                if (post.image) {
                    const imgSrc = /^https?:\/\//.test(post.image) ? escapeHtml(post.image) : `../images/${escapeHtml(post.image)}`;
                    heroImage.innerHTML = `<img src="${imgSrc}" alt="${escapeHtml(post.title)}" class="blog-post-hero-img" onerror="this.parentNode.innerHTML='<div class=\\'blog-post-hero-icon\\' style=\\'background:${gradient}\\'><i class=\\'fas ${icon}\\'></i></div>'">`;
                } else {
                    heroImage.innerHTML = `<div class="blog-post-hero-icon" style="background:${gradient}"><i class="fas ${icon}"></i></div>`;
                }

                // Source link
                const sourceLink = document.getElementById('postSourceLink');
                const originalLink = document.getElementById('postOriginalLink');
                if (post.sourceUrl && /^https?:\/\//i.test(post.sourceUrl)) {
                    sourceLink.style.display = 'flex';
                    originalLink.href = post.sourceUrl;
                } else {
                    sourceLink.style.display = 'none';
                }

                // Update page title
                document.title = post.title + ' | SHIFT_YE';

                // Load related posts
                loadRelatedPosts(post);
            })
            .catch(function () {
                loading.style.display = 'none';
                content.style.display = 'none';
                notFound.style.display = 'block';
            });
    }

    function loadRelatedPosts(currentPost) {
        const section = document.getElementById('relatedSection');
        const grid = document.getElementById('relatedGrid');
        if (!section || !grid) return;

        const params = new URLSearchParams({ page: 1, limit: 6 });

        fetch('/api/blog/posts?' + params.toString())
            .then(function (res) { return res.json(); })
            .then(function (data) {
                const related = (data.data || [])
                    .filter(function (p) { return p.slug !== currentPost.slug; })
                    .slice(0, 3);

                if (related.length === 0) {
                    section.style.display = 'none';
                    return;
                }

                grid.innerHTML = related.map(function (p) {
                    return buildCard(p, 0);
                }).join('');

                section.style.display = 'block';
            })
            .catch(function () {
                section.style.display = 'none';
            });
    }

    // === Init based on page ===
    document.addEventListener('DOMContentLoaded', function () {
        if (document.getElementById('blogGrid')) {
            initBlogList();
        }
        if (document.getElementById('postContainer')) {
            initBlogPost();
        }
    });
})();
