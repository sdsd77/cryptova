require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const { fetchAllFeeds, loadPosts, savePosts } = require('./rss-fetcher');
const { BlogScheduler } = require('./scheduler');
const { setupContentRoutes } = require('./content-api');
const { initDB, seedFromFiles, dbModule, isDBOk } = require('./db');
const exchange = require('./exchange-rates');
const analytics = require('./analytics');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// === Behind a reverse proxy (Nginx/Caddy), trust X-Forwarded-* so rate limiting
// === sees the real client IP instead of the proxy's local IP ===
if (process.env.TRUST_PROXY === '1') {
    app.set('trust proxy', true);
}

// === Durable storage: PostgreSQL on Render, JSON files locally (via db.js) ===
const DATA_DIR = path.join(__dirname, 'data');

async function loadContacts() {
    return dbModule.loadContacts();
}

async function saveContacts(contacts) {
    return dbModule.saveContacts(contacts);
}

app.locals.contacts = [];

// === Admin credentials (changeable via dashboard, stored hashed in DB or JSON file) ===
const ADMIN_FILE = path.join(DATA_DIR, 'admin.json');

function hashPassword(password, salt) {
    const s = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(String(password), s, 64).toString('hex');
    return { salt: s, hash: hash };
}

function verifyPassword(password, stored) {
    if (!stored || !stored.salt || !stored.hash) return false;
    try {
        const h = crypto.scryptSync(String(password), stored.salt, 64);
        const expected = Buffer.from(stored.hash, 'hex');
        return h.length === expected.length && crypto.timingSafeEqual(h, expected);
    } catch (e) {
        return false;
    }
}

async function saveAdminCreds(username, password) {
    const user = String(username || '').trim();
    const passHash = hashPassword(password || '');
    await dbModule.saveAdmin(user, passHash);
    adminCreds.username = user;
    adminCreds.passwordHash = passHash;
    return { username: user, passwordHash: passHash };
}

async function loadOrInitAdminCreds() {
    // Try DB first (Render), then the JSON file, then environment.
    const fromDB = await dbModule.getAdmin();
    if (fromDB && fromDB.username && fromDB.passwordHash && fromDB.passwordHash.salt) {
        return { username: fromDB.username, passwordHash: fromDB.passwordHash };
    }
    try {
        if (fs.existsSync(ADMIN_FILE)) {
            const c = JSON.parse(fs.readFileSync(ADMIN_FILE, 'utf8'));
            if (c.username && c.passwordHash && c.passwordHash.salt) {
                return { username: c.username, passwordHash: c.passwordHash };
            }
        }
    } catch (e) { /* fall through to env init */ }
    // Initialize from environment (one-time migration into a persistent hashed store)
    const user = (process.env.ADMIN_USER || 'admin').trim();
    const pass = process.env.ADMIN_PASSWORD || '';
    const data = { username: user, passwordHash: hashPassword(pass) };
    try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
        fs.writeFileSync(ADMIN_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) { /* best-effort */ }
    await dbModule.saveAdmin(user, data.passwordHash);
    return data;
}

let adminCreds = {};

// === Async state init (DB-ready) ===
async function initState() {
    const ok = await initDB();
    if (ok) await seedFromFiles();
    adminCreds = await loadOrInitAdminCreds();
    app.locals.contacts = await loadContacts();
    return ok;
}

app.disable('x-powered-by');

// === Security Headers ===
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    res.setHeader('Content-Security-Policy',
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; " +
        "font-src 'self' data: https://fonts.gstatic.com; " +
        "img-src 'self' data: https:; " +
        "connect-src 'self' https://api.coingecko.com https://api.binance.com https://cointelegraph.com https://www.coindesk.com https://cryptonews.com https://techcrunch.com https://www.theverge.com https://www.axios.com; " +
        "frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
    if (process.env.HTTPS === '1') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
});

// === Body Parsing ===
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));

// === Protect server code and dotfiles from static exposure ===
const ROOT_DIR = path.join(__dirname, '..');
const BLOCKED_PREFIXES = ['/backend', '/node_modules', '/.git', '/.env'];

function getDecodedPath(pathname) {
    try {
        return decodeURIComponent(pathname);
    } catch (err) {
        return pathname;
    }
}

app.use((req, res, next) => {
    const rawPath = req.path;
    const decodedPath = getDecodedPath(rawPath);
    const blocked = BLOCKED_PREFIXES.some((p) =>
        rawPath === p ||
        rawPath.startsWith(p + '/') ||
        decodedPath === p ||
        decodedPath.startsWith(p + '/'));
    if (blocked) {
        return res.status(403).send('Forbidden');
    }
    next();
});

// === Static Files: serve ONLY public directories (backend/node_modules never exposed) ===
// === Visitor tracking: count HTML page views (excludes /api, assets, bots) ===
app.use((req, res, next) => {
    if (req.path !== SECRET_PATHS.admin && analytics.isPage(req)) analytics.trackVisit(req);
    next();
});

// === Optional HTTP request logging (enabled with LOG_REQUESTS=1) — for debugging ===
if (process.env.LOG_REQUESTS === '1') {
    app.use((req, res, next) => {
        res.on('finish', () => {
            const code = res.statusCode;
            if (code >= 400) {
                console.error(`[REQ] ${code} ${req.method} ${req.originalUrl} ip=${req.ip}`);
            }
        });
        next();
    });
}
const PUBLIC_SUBDIRS = ['css', 'js', 'images'];
PUBLIC_SUBDIRS.forEach((dir) => {
    app.use('/' + dir, express.static(path.join(ROOT_DIR, dir), {
        setHeaders(res, filePath) {
            if (/\.(css|js|png|jpe?g|gif|svg|webp|ico|woff2?|ttf|eot)$/i.test(filePath)) {
                res.setHeader('Cache-Control', 'public, max-age=604800');
            } else {
                res.setHeader('Cache-Control', 'no-cache');
            }
        },
    }));
});
app.get(['/', '/index.html'], (req, res) => {
    res.sendFile(path.join(ROOT_DIR, 'index.html'));
});

// === Secret page routes (unguessable tokens, no /pages/ or .html exposure) ===
// The dashboard lives ONLY behind the ADMIN_PATH token (configurable via .env).
// normalizePath ensures the value always starts with "/" (env may omit it).
function normalizePath(p, fallback) {
    const v = String(p || '').trim().replace(/\/+$/, '');
    const base = v || fallback;
    return base.charAt(0) === '/' ? base : '/' + base;
}
const SECRET_PATHS = {
    admin:   normalizePath(process.env.ADMIN_PATH, '/control-7hIphN4syS_u'),
    digital: '/svc-lI_e2m2Zgoqo',
    tech:    '/tech-Y-6Ob_UUKZ9g',
    pricing: '/price-uaLfoLjpibrD',
    calc:    '/calc-cRYxT3jlWq5Z',
    blog:    '/blog-hBgYoFVGcYLJ',
    post:    '/post-Jy7vgl0_4QjK',
    faq:     '/faq-7puDJr3muiiJ',
    contact: '/contact-Rb1jI0TUQy-s',
};
const PAGE_FILES = {
    digital: 'crypto-services.html',
    tech:    'tech-services.html',
    pricing: 'pricing.html',
    calc:    'calculator.html',
    blog:    'blog.html',
    faq:     'faq.html',
    contact: 'contact.html',
};
function servePage(file) {
    return (req, res) => res.sendFile(path.join(ROOT_DIR, 'pages', file));
}
app.get(SECRET_PATHS.digital, servePage(PAGE_FILES.digital));
app.get(SECRET_PATHS.tech, servePage(PAGE_FILES.tech));
app.get(SECRET_PATHS.pricing, servePage(PAGE_FILES.pricing));
app.get(SECRET_PATHS.calc, servePage(PAGE_FILES.calc));
app.get(SECRET_PATHS.blog, servePage(PAGE_FILES.blog));
app.get(SECRET_PATHS.faq, servePage(PAGE_FILES.faq));
app.get(SECRET_PATHS.contact, servePage(PAGE_FILES.contact));
// Blog post: /post-TOKEN/:slug
app.get(SECRET_PATHS.post + '/:slug', servePage('blog-post.html'));
// Dashboard: only reachable via the secret token
app.get(SECRET_PATHS.admin, (req, res) => res.sendFile(path.join(ROOT_DIR, 'dashboard', 'index.html')));

// === Legacy public paths are retired: make them 404 so nothing leaks via them ===
['/pages', '/dashboard'].forEach((legacy) => {
    app.use(legacy, (req, res) => res.status(404).end());
});

// === Simple in-memory rate limiter ===
const rateBuckets = new Map();
function rateLimit(req, res, next) {
    const ip = req.ip || 'unknown';
    const now = Date.now();
    const WINDOW_MS = 60000;
    const MAX = 10;
    let bucket = rateBuckets.get(ip);
    if (!bucket || now - bucket.start > WINDOW_MS) {
        bucket = { start: now, count: 0 };
    }
    bucket.count += 1;
    rateBuckets.set(ip, bucket);
    if (bucket.count > MAX) {
        return res.status(429).json({ success: false, message: 'لقد أرسلت الكثير من الرسائل، حاول مرة أخرى بعد دقيقة' });
    }
    next();
}

// === Comprehensive anti brute-force protection for admin login ===
// Tracks failed attempts per IP, per username, and per combination, applies
// escalating lockouts, uses constant-time password comparison, and delays every
// attempt to slow automated guessing. Stale entries are evicted over time.
const LOGIN_MAX_ATTEMPTS = parseInt(process.env.LOGIN_MAX_ATTEMPTS, 10) || 5;
const LOGIN_WINDOW_MS = 60 * 1000;
const LOGIN_DELAY_MS = parseInt(process.env.LOGIN_DELAY_MS, 10) || 500;
// Escalating lockout durations: 1 min, 5 min, 15 min, 1 hour, then permanent-ish (24h)
const AUTH_LOCKOUTS = [60 * 1000, 5 * 60 * 1000, 15 * 60 * 1000, 60 * 60 * 1000];

const authFailures = new Map(); // key -> { count, lockedUntil, lastFail }

function authIpKey(ip) { return 'ip|' + (ip || 'unknown'); }
function authUserKey(username) { return 'usr|' + String(username || '').toLowerCase(); }
function authCombinedKey(ip, username) { return 'combo|' + (ip || 'unknown') + '|' + String(username || '').toLowerCase(); }

function authCheck(key) {
    const rec = authFailures.get(key);
    if (!rec) return false;
    const now = Date.now();
    if (rec.lockedUntil > now) return true;
    if (now - rec.lastFail > LOGIN_WINDOW_MS) { authFailures.delete(key); return false; }
    return false;
}

function authLocked(ip, username) {
    return authCheck(authIpKey(ip)) || authCheck(authUserKey(username)) || authCheck(authCombinedKey(ip, username));
}

function recordAuthFailure(ip, username) {
    const now = Date.now();
    [authIpKey(ip), authUserKey(username), authCombinedKey(ip, username)].forEach(function (key) {
        let rec = authFailures.get(key);
        if (!rec || now - rec.lastFail > LOGIN_WINDOW_MS) {
            rec = { count: 0, lockedUntil: 0, lastFail: now };
        }
        rec.count += 1;
        rec.lastFail = now;
        if (rec.count > LOGIN_MAX_ATTEMPTS) {
            const level = Math.min(Math.floor(rec.count / LOGIN_MAX_ATTEMPTS) - 1, AUTH_LOCKOUTS.length - 1);
            rec.lockedUntil = now + AUTH_LOCKOUTS[level];
        }
        authFailures.set(key, rec);
    });
}

function clearAuthFailures(ip, username) {
    authFailures.delete(authIpKey(ip));
    authFailures.delete(authUserKey(username));
    authFailures.delete(authCombinedKey(ip, username));
}

// Periodic cleanup so memory doesn't grow unbounded
setInterval(function () {
    const now = Date.now();
    for (const [key, rec] of authFailures) {
        if (now - rec.lastFail > 24 * 60 * 60 * 1000) authFailures.delete(key);
    }
}, 60 * 60 * 1000).unref();

// Constant-time string comparison (resists timing side-channel attacks)
function safeEqual(a, b) {
    const ba = Buffer.from(String(a));
    const bb = Buffer.from(String(b));
    if (ba.length !== bb.length) return false;
    return crypto.timingSafeEqual(ba, bb);
}

// Small artificial delay on every login attempt to slow automated guessing
function authDelay() {
    return new Promise(function (resolve) { setTimeout(resolve, LOGIN_DELAY_MS); });
}

// === Admin Sessions (token -> expiry timestamp) ===
const SESSION_TTL_MS = (parseInt(process.env.ADMIN_SESSION_HOURS, 10) || 12) * 60 * 60 * 1000;
const adminSessions = new Map();

function pruneSessions() {
    const now = Date.now();
    adminSessions.forEach((exp, token) => {
        if (exp <= now) adminSessions.delete(token);
    });
}

function requireAdmin(req, res, next) {
    pruneSessions();
    const header = req.headers['authorization'] || req.headers['x-admin-token'] || '';
    const token = header.replace(/^Bearer\s+/i, '').trim();
    if (token && adminSessions.has(token) && adminSessions.get(token) > Date.now()) {
        return next();
    }
    return res.status(401).json({ success: false, message: 'غير مصرح، الرجاء تسجيل الدخول' });
}

app.post('/api/admin/login', async (req, res) => {
    // Artificial delay on every attempt to slow automated guessing
    await authDelay();

    const ip = req.ip || 'unknown';
    const username = String((req.body && req.body.username) || '').trim();
    const password = String((req.body && req.body.password) || '');
    const expectedUser = adminCreds.username;

    // If this IP / username combo is currently locked out, refuse without checking creds
    if (authLocked(ip, username)) {
        return res.status(429).json({ success: false, message: 'محاولات كثيرة جداً، انتظر قليلاً ثم حاول لاحقاً' });
    }

    const userOk = username.length > 0 && safeEqual(username, expectedUser);
    const passOk = password.length > 0 && verifyPassword(password, adminCreds.passwordHash);

    if (userOk && passOk) {
        pruneSessions();
        clearAuthFailures(ip, username);
        const token = crypto.randomBytes(32).toString('hex');
        adminSessions.set(token, Date.now() + SESSION_TTL_MS);
        return res.json({ success: true, token, expiresIn: Math.round(SESSION_TTL_MS / 3600000) });
    }

    // Record the failure; generic message (doesn't reveal which field is wrong)
    recordAuthFailure(ip, username);
    return res.status(401).json({ success: false, message: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
});

app.post('/api/admin/logout', requireAdmin, (req, res) => {
    const header = req.headers['authorization'] || req.headers['x-admin-token'] || '';
    adminSessions.delete(header.replace(/^Bearer\s+/i, '').trim());
    res.json({ success: true });
});

// Change admin username / password (requires current credentials for security).
// Requires an active admin session. On success, keeps the current session but
// invalidates all other sessions so old passwords/users can no longer be used.
app.post('/api/admin/change-credentials', requireAdmin, async (req, res) => {
    const body = req.body || {};
    const currentPassword = String(body.currentPassword || '');
    const newUsername = String(body.newUsername || '').trim();
    const newPassword = String(body.newPassword || '');

    await authDelay();

    if (!currentPassword) {
        return res.status(400).json({ success: false, message: 'أدخل كلمة المرور الحالية للتأكيد' });
    }

    // Verify the current password before allowing any change
    if (!verifyPassword(currentPassword, adminCreds.passwordHash)) {
        return res.status(401).json({ success: false, message: 'كلمة المرور الحالية غير صحيحة' });
    }

    if (!newUsername || newUsername.length < 3) {
        return res.status(400).json({ success: false, message: 'اسم المستخدم يجب أن يكون ٣ أحرف على الأقل' });
    }

    if (!newPassword) {
        return res.status(400).json({ success: false, message: 'أدخل كلمة مرور جديدة' });
    }
    if (newPassword.length < 6) {
        return res.status(400).json({ success: false, message: 'كلمة المرور يجب أن تكون ٦ أحرف على الأقل' });
    }

    saveAdminCreds(newUsername, newPassword);

    // Invalidate every other session so only the current one stays valid
    const currentHeader = req.headers['authorization'] || req.headers['x-admin-token'] || '';
    const currentToken = currentHeader.replace(/^Bearer\s+/i, '').trim();
    for (const token of Array.from(adminSessions.keys())) {
        if (token !== currentToken) adminSessions.delete(token);
    }

    return res.json({ success: true, message: 'تم تحديث بيانات الدخول بنجاح' });
});

// === Helpers ===
function escHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (ch) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
    })[ch]);
}

const SERVICE_NAMES = {
    'buy-sell': 'شراء وبيع العملات الرقمية',
    'convert': 'تحويل العملات الرقمية',
    'web-dev': 'تطوير مواقع الويب',
    'app-dev': 'تطبيقات الهاتف',
    'erp-crm': 'أنظمة ERP / CRM',
    'consulting': 'استشارات تقنية',
    'other': 'أخرى',
};

// === API: Contact Form ===
app.post('/api/contact', rateLimit, async (req, res) => {
    const raw = req.body || {};
    const name = String(raw.name || '').trim().slice(0, 100);
    const email = String(raw.email || '').trim().slice(0, 200);
    const phone = String(raw.phone || '').trim().slice(0, 30);
    const service = SERVICE_NAMES[raw.service] ? raw.service : '';
    const message = String(raw.message || '').trim().slice(0, 5000);

    if (!name || !email || !message) {
        return res.status(400).json({ success: false, message: 'الرجاء ملء جميع الحقول المطلوبة' });
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        return res.status(400).json({ success: false, message: 'البريد الإلكتروني غير صالح' });
    }

    const subjectName = name.replace(/[\r\n]+/g, ' ').slice(0, 60);
    const serviceLabel = SERVICE_NAMES[service] || 'غير محدد';

    if (!app.locals.contacts) app.locals.contacts = [];
    const contact = {
        name, email, phone, service, message,
        date: new Date().toISOString(),
        read: false,
    };
    const saved = await dbModule.addContact(contact);
    app.locals.contacts.push(saved);
    // Re-sync indexes (contacts are re-ordered by insertion order)
    app.locals.contacts = await loadContacts();

    try {
        if (process.env.SMTP_USER && process.env.SMTP_PASS) {
            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST || 'smtp.gmail.com',
                port: parseInt(process.env.SMTP_PORT || '587', 10),
                secure: false,
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
            });
            await transporter.sendMail({
                from: process.env.SMTP_USER || 'cryptovaye@gmail.com',
                to: process.env.EMAIL_TO || 'cryptovaye@gmail.com',
                subject: `رسالة جديدة من ${subjectName} - ${serviceLabel}`,
                html: `
                    <div dir="rtl" style="font-family: Cairo, Arial, sans-serif; padding: 20px;">
                        <h2 style="color: #d4a843;">رسالة جديدة من الموقع</h2>
                        <hr style="border-color: #d4a843;">
                        <p><strong>الاسم:</strong> ${escHtml(name)}</p>
                        <p><strong>البريد الإلكتروني:</strong> ${escHtml(email)}</p>
                        <p><strong>رقم الهاتف:</strong> ${escHtml(phone) || 'غير محدد'}</p>
                        <p><strong>نوع الخدمة:</strong> ${escHtml(serviceLabel)}</p>
                        <p><strong>الرسالة:</strong></p>
                        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; white-space: pre-wrap;">
                            ${escHtml(message)}
                        </div>
                        <hr style="border-color: #ddd;">
                        <p style="color: #999; font-size: 12px;">تم الإرسال من نموذج الاتصال في موقع Cryptova</p>
                    </div>
                `,
            });
        }
    } catch (error) {
        console.error('Contact form error:', error.message);
    }

    res.json({ success: true, message: 'تم استلام رسالتك! سنتواصل معك قريباً.' });
});

// === Admin API (all require login) ===
app.get('/api/contacts', requireAdmin, async (req, res) => {
    try {
        const contacts = await loadContacts();
        app.locals.contacts = contacts;
        res.json({ success: true, data: contacts });
    } catch (err) {
        res.status(500).json({ success: false, message: 'خطأ في تحميل الرسائل' });
    }
});

app.put('/api/contacts/:index/read', requireAdmin, async (req, res) => {
    try {
        const index = parseInt(req.params.index, 10);
        await dbModule.setContactRead(index, true);
        app.locals.contacts = await loadContacts();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: 'خطأ في تحديث الرسالة' });
    }
});

app.delete('/api/contacts/:index', requireAdmin, async (req, res) => {
    try {
        const index = parseInt(req.params.index, 10);
        await dbModule.deleteContact(index);
        app.locals.contacts = await loadContacts();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: 'خطأ في حذف الرسالة' });
    }
});

app.get('/api/stats', requireAdmin, async (req, res) => {
    try {
        const [contacts, posts, content] = await Promise.all([
            loadContacts(),
            loadPosts(),
            dbModule.getContent(),
        ]);
        app.locals.contacts = contacts;

        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const unread = contacts.filter((c) => !c.read);
        const todayMsgs = contacts.filter((c) => new Date(c.date).getTime() >= todayStart);

        const byCategory = {};
        let autoCount = 0;
        let manualCount = 0;
        (posts || []).forEach((p) => {
            const cat = p.category || 'غير مصنف';
            byCategory[cat] = (byCategory[cat] || 0) + 1;
            if (p.isManual) manualCount += 1;
            else autoCount += 1;
        });

        const recent = (posts || [])
            .slice()
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 4)
            .map((p) => ({
                title: p.title,
                slug: p.slug,
                category: p.category,
                source: p.source,
                date: p.date,
                isManual: !!p.isManual,
            }));

        const rates = await exchange.getRates();
        const cur = (fn) => fn || null;
        res.json({
            success: true,
            data: {
                messages: {
                    total: contacts.length,
                    unread: unread.length,
                    today: todayMsgs.length,
                },
                posts: {
                    total: (posts || []).length,
                    auto: autoCount,
                    manual: manualCount,
                    byCategory,
                    recent,
                },
                content: {
                    services: (content && content.services) ? content.services.length : 0,
                    cryptoRates: ((content && content.pricing && content.pricing.cryptoRates) || []).length,
                    packages: ((content && content.pricing && content.pricing.packages) || []).length,
                    faq: (content && content.faq) ? content.faq.length : 0,
                },
                exchange: {
                    source: rates.source,
                    updatedAt: rates.updatedAt,
                    note: rates.note,
                    sanaaUsd: cur(rates.sanaa && rates.sanaa.usd),
                    adenUsd: cur(rates.aden && rates.aden.usd),
                    sanaaSar: cur(rates.sanaa && rates.sanaa.sar),
                    adenSar: cur(rates.aden && rates.aden.sar),
                },
                visitors: analytics.getStats(),
                blog: (() => {
                    const s = blogScheduler.getStatus();
                    return {
                        running: s.running,
                        fetching: s.fetching,
                        intervalHours: s.intervalHours,
                        lastRun: s.lastRun,
                        runCount: s.runCount,
                        totalPostsAdded: s.totalPostsAdded,
                    };
                })(),
                system: {
                    uptimeSec: Math.floor(process.uptime()),
                    storage: (await isDBOk()) ? 'PostgreSQL' : 'ملفات JSON',
                    nodeVersion: process.version,
                },
                generatedAt: now.toISOString(),
            },
        });
    } catch (err) {
        console.error('Stats error:', err.message);
        res.status(500).json({ success: false, message: 'خطأ في تحميل الإحصائيات' });
    }
});

// === Content Management API (services / pricing / faq / images) ===
// File upload storage config (multer) — images saved into ../images
const IMAGES_DIR = path.join(__dirname, '..', 'images');
if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });

const ALLOWED_IMG = /\.(jpg|jpeg|png|gif|webp|svg)$/i;
const storage = multer.diskStorage({
    destination(req, file, cb) { cb(null, IMAGES_DIR); },
    filename(req, file, cb) {
        const ext = path.extname(file.originalname).toLowerCase();
        const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9\u0600-\u06FF-_]/g, '-').slice(0, 40) || 'img';
        cb(null, name + '-' + Date.now() + ext);
    },
});
const fileFilter = (req, file, cb) => {
    if (ALLOWED_IMG.test(file.originalname) && (file.mimetype.startsWith('image/'))) {
        return cb(null, true);
    }
    cb(new Error('صيغة الصورة غير مسموحة (jpeg, png, gif, webp, svg)'));
};
const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

setupContentRoutes(app, requireAdmin, upload);

// === Blog Scheduler ===
const blogScheduler = new BlogScheduler({
    intervalHours: parseInt(process.env.BLOG_FETCH_INTERVAL_HOURS, 10) || 6,
    postsPerRun: parseInt(process.env.BLOG_POSTS_PER_RUN, 10) || 5,
});

// === Blog API ===

// Public: Get blog posts with pagination and filtering
app.get('/api/blog/posts', async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 9));
        const category = req.query.category || '';

        let posts = await loadPosts();

        // Filter by category if specified
        if (category && category !== 'all') {
            posts = posts.filter(p => p.category === category);
        }

        // Sort by date (newest first)
        posts.sort((a, b) => new Date(b.date) - new Date(a.date));

        const total = posts.length;
        const totalPages = Math.ceil(total / limit);
        const start = (page - 1) * limit;
        const paginatedPosts = posts.slice(start, start + limit);

        // Return safe subset (no internal IDs exposed unnecessarily)
        const safePosts = paginatedPosts.map(p => ({
            id: p.id,
            title: p.title,
            slug: p.slug,
            excerpt: p.excerpt,
            category: p.category,
            source: p.source,
            image: p.image,
            date: p.date,
            readTime: p.readTime,
            isManual: p.isManual,
        }));

        res.json({
            success: true,
            data: safePosts,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1,
            },
        });
    } catch (err) {
        console.error('Blog posts error:', err.message);
        res.status(500).json({ success: false, message: 'خطأ في تحميل المقالات' });
    }
});

// Public: Get single post by slug
app.get('/api/blog/posts/:slug', async (req, res) => {
    try {
        const posts = await loadPosts();
        const post = posts.find(p => p.slug === req.params.slug);

        if (!post) {
            return res.status(404).json({ success: false, message: 'المقال غير موجود' });
        }

        res.json({ success: true, data: post });
    } catch (err) {
        console.error('Blog post error:', err.message);
        res.status(500).json({ success: false, message: 'خطأ في تحميل المقال' });
    }
});

// Admin: Manual trigger RSS fetch
app.post('/api/blog/fetch', requireAdmin, (req, res) => {
    const maxPosts = Math.min(20, Math.max(1, parseInt((req.body && req.body.maxPosts), 10) || 5));

    // Respond immediately, fetch in background so the HTTP connection never hangs
    res.json({ success: true, message: 'بدأ جلب الأخبار، ستظهر المقالات الجديدة قريباً' });

    fetchAllFeeds(maxPosts)
        .then(newPosts => {
            console.log(`Blog fetch completed: ${newPosts.length} new posts`);
        })
        .catch(err => {
            console.error('Blog fetch error:', err.message);
        });
});

// Public: on-demand refresh when a visitor opens the blog page.
// Uses fetchIfStale so it won't hammer the sources (min. interval between refreshes).
const BLOG_REFRESH_MIN_MINUTES = parseInt(process.env.BLOG_REFRESH_MIN_MINUTES, 10) || 30;
app.post('/api/blog/refresh', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const last = blogScheduler.getLastRun();
    res.json({
        success: true,
        lastRun: last,
        refreshing: true,
        minIntervalMinutes: BLOG_REFRESH_MIN_MINUTES,
    });
    blogScheduler.fetchIfStale(BLOG_REFRESH_MIN_MINUTES).catch(() => {});
});

// Admin: Blog statistics
app.get('/api/blog/stats', requireAdmin, async (req, res) => {
    try {
        const posts = await loadPosts();
        const categories = {};
        let manualCount = 0;
        let autoCount = 0;

        posts.forEach(p => {
            categories[p.category] = (categories[p.category] || 0) + 1;
            if (p.isManual) manualCount++;
            else autoCount++;
        });

        res.json({
            success: true,
            data: {
                totalPosts: posts.length,
                manualPosts: manualCount,
                autoPosts: autoCount,
                categories,
                oldestPost: posts.length > 0 ? posts[posts.length - 1].date : null,
                newestPost: posts.length > 0 ? posts[0].date : null,
                schedulerStatus: blogScheduler ? blogScheduler.getStatus() : null,
            },
        });
    } catch (err) {
        console.error('Blog stats error:', err.message);
        res.status(500).json({ success: false, message: 'خطأ في الإحصائيات' });
    }
});

// === Live Crypto Prices Proxy ===
const CRYPTO_COIN_IDS = 'bitcoin,ethereum,tether,binancecoin,solana,ripple';
let cryptoPriceCache = { data: null, fetchedAt: 0 };
const CRYPTO_CACHE_TTL = 20000;

const cryptoCoinMap = { BTC: 'bitcoin', ETH: 'ethereum', BNB: 'binancecoin', SOL: 'solana', XRP: 'ripple' };

async function fetchCoinGeckoPrices() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
        const url = `https://api.coingecko.com/api/v3/simple/price?ids=${CRYPTO_COIN_IDS}&vs_currencies=usd&include_24hr_change=true`;
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error('CoinGecko request failed');
        const data = await response.json();
        return { source: 'coingecko', prices: data };
    } finally {
        clearTimeout(timer);
    }
}

async function fetchBinancePrices() {
    const symbols = JSON.stringify(['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT']);
    const url = 'https://api.binance.com/api/v3/ticker/24hr?symbols=' + encodeURIComponent(symbols);
    const response = await fetch(url);
    if (!response.ok) throw new Error('Binance request failed');
    const tickers = await response.json();
    const prices = { tether: { usd: 1, usd_24h_change: 0.01 } };
    tickers.forEach((t) => {
        const id = cryptoCoinMap[t.symbol.replace('USDT', '')];
        if (id) {
            prices[id] = {
                usd: parseFloat(t.lastPrice),
                usd_24h_change: parseFloat(t.priceChangePercent),
            };
        }
    });
    return { source: 'binance', prices };
}

app.get('/api/crypto-prices', async (req, res) => {
    if (cryptoPriceCache.data && Date.now() - cryptoPriceCache.fetchedAt < CRYPTO_CACHE_TTL) {
        return res.json({ ...cryptoPriceCache.data, cached: true, yer: await exchange.getRates() });
    }
    try {
        cryptoPriceCache.data = await fetchCoinGeckoPrices();
        cryptoPriceCache.fetchedAt = Date.now();
        res.json({ ...cryptoPriceCache.data, cached: false, yer: await exchange.getRates() });
    } catch (error) {
        try {
            cryptoPriceCache.data = await fetchBinancePrices();
            cryptoPriceCache.fetchedAt = Date.now();
            res.json({ ...cryptoPriceCache.data, cached: false, yer: await exchange.getRates() });
        } catch (binanceError) {
            if (cryptoPriceCache.data) {
                res.json({ ...cryptoPriceCache.data, cached: true, stale: true, yer: await exchange.getRates() });
            } else {
                res.status(502).json({ error: 'Failed to fetch crypto prices' });
            }
        }
    }
});

// === YER Exchange Rates (auto-fetch with manual admin override) ===
app.get('/api/exchange-rates', async (req, res) => {
    try {
        const rates = await exchange.getRates({ force: req.query.force === '1' });
        res.json({ success: true, data: rates });
    } catch (err) {
        res.status(500).json({ success: false, message: 'خطأ في أسعار الصرف' });
    }
});

app.put('/api/content/exchange', requireAdmin, async (req, res) => {
    try {
        const body = req.body || {};
        if (body.mode === 'auto') {
            await exchange.setAutoMode();
            const rates = await exchange.refreshFromSource();
            return res.json({ success: true, data: rates });
        }
        const num = v => Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : NaN;
        const currencies = body.currencies || {};
        // Backward-compatible with the old USD-only shape {sanaa, aden}.
        if (currencies.sanaa && typeof currencies.sanaa.buy === 'number') {
            currencies.__legacyUsd = true;
        }
        let valid = currencies.__legacyUsd
            ? [num(currencies.sanaa.buy), num(currencies.sanaa.sell), num(currencies.aden?.buy), num(currencies.aden?.sell)].every(Number.isFinite)
            : (() => {
                  let allOk = true;
                  let any = false;
                  for (const [code, pair] of Object.entries(currencies)) {
                      if (!pair || typeof pair !== 'object') continue;
                      for (const region of ['sanaa', 'aden']) {
                          const r = pair[region];
                          if (!r) continue;
                          any = true;
                          if (![num(r.buy), num(r.sell)].every(Number.isFinite)) { allOk = false; break; }
                      }
                      if (!allOk) break;
                  }
                  return allOk && any;
              })();
        if (!valid) {
            return res.status(400).json({ success: false, message: 'قيم غير صالحة' });
        }
        const rates = await exchange.setManualRates({ currencies });
        res.json({ success: true, data: rates });
    } catch (err) {
        res.status(500).json({ success: false, message: 'خطأ في حفظ أسعار الصرف' });
    }
});

// === API 404 (JSON, not HTML) ===
app.use('/api', (req, res) => {
    res.status(404).json({ success: false, message: 'الرابط غير موجود' });
});

// === Catch-all: serve index.html for SPA deep links only ===
app.get('*', (req, res) => {
    if (/\.(js|css|png|jpe?g|gif|svg|webp|ico|json|html|txt|map|woff2?|ttf|eot|pdf|zip|gz|xml|env)$/i.test(req.path)) {
        return res.status(404).send('Not Found');
    }
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// === Error handlers (no stack leaks) ===
app.use((err, req, res, next) => {
    if (err && err.type === 'entity.parse.failed') {
        return res.status(400).json({ success: false, message: 'بيانات غير صالحة' });
    }
    if (err && (err.type === 'entity.too.large' || err.status === 413)) {
        return res.status(413).json({ success: false, message: 'حجم البيانات كبير جداً' });
    }
    console.error('Server error:', err.message);
    res.status(500).json({ success: false, message: 'خطأ داخلي في الخادم' });
});

// === Boot & graceful error handling ===
async function boot() {
    await initState();
    if (!process.env.ADMIN_PASSWORD && !adminCreds.passwordHash) {
        console.warn('⚠️  لا توجد بيانات دخول للمدير — ضع ADMIN_USER/ADMIN_PASSWORD في بيئة Render أو غيّرها من اللوحة فوراً!');
    }
    if (process.env.HTTPS === '1' && process.env.TRUST_PROXY !== '1') {
        console.warn('ℹ️  HTTPS=1 مفعل عبر وسيط (proxy) — يُنصح بتفعيل TRUST_PROXY=1 ليصل تقييد الطلبات للزائر الحقيقي');
    }

    const server = app.listen(PORT, HOST);
    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`❌ المنفذ ${PORT} مشغول — يوجد نسخة أخرى من السيرفر تعمل؟`);
            console.error(`   تحقق:  pgrep -af "node server.js"`);
            console.error(`   ثم:    kill <PID>`);
        } else {
            console.error('Server error:', err.message);
        }
        process.exit(1);
    });
    server.on('listening', () => {
        const link = (HOST === '0.0.0.0' || HOST === '::') ? `http://localhost:${PORT}` : `http://${HOST}:${PORT}`;
        console.log(`\n🚀 Cryptova server running at ${link}`);
        console.log(`📊 Dashboard (secret): ${link}${SECRET_PATHS.admin}`);
        console.log(`🔐 Admin credentials stored in ${process.env.DATABASE_URL ? 'PostgreSQL' : 'backend/data/admin.json'}`);

        // Start blog scheduler (fetches RSS every 24h)
        if (process.env.BLOG_SCHEDULER !== '0') {
            blogScheduler.start();
        }

        // Start YER exchange-rate watcher (re-checks every 30 min)
        exchange.startSchedule();

        // Start visitor-analytics persistence (saves every 60s)
        analytics.start();

        console.log(`\nPress Ctrl+C to stop\n`);
    });

    process.on('SIGINT', () => server.close(() => process.exit(0)));
    process.on('SIGTERM', () => server.close(() => process.exit(0)));
}

boot().catch((err) => {
    console.error('Fatal boot error:', err);
    process.exit(1);
});