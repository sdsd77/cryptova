/* ============================================
   Cryptova - Database layer
   On Render: uses PostgreSQL (DATABASE_URL) for durable storage.
   Locally / without DB: falls back to JSON files (original behavior).
   This keeps ALL features working in both environments.
   ============================================ */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { Pool } = require('pg');

const DATA_DIR = path.join(__dirname, 'data');
const DB_URL = process.env.DATABASE_URL || '';

// ─── JSON file paths (fallback / local) ───
const CONTACTS_FILE = path.join(DATA_DIR, 'contacts.json');
const ADMIN_FILE = path.join(DATA_DIR, 'admin.json');
const CONTENT_FILE = path.join(DATA_DIR, 'content.json');
const POSTS_FILE = path.join(DATA_DIR, 'posts.json');

let pool = null;

function getPool() {
    if (!DB_URL) return null;
    if (pool) return pool;
    pool = new Pool({
        connectionString: DB_URL,
        ssl: { rejectUnauthorized: false },
        max: 5,
        idleTimeoutMillis: 30000,
    });
    pool.on('error', (err) => {
        console.error('DB pool error:', err.message);
    });
    return pool;
}

async function isDBOk() {
    try {
        const p = getPool();
        if (!p) return false;
        await p.query('SELECT 1');
        return true;
    } catch (err) {
        console.error('Postgres unavailable, falling back to files:', err.message);
        return false;
    }
}

async function initDB() {
    if (!getPool()) return false;
    try {
        const sql = `
            CREATE TABLE IF NOT EXISTS contacts (
                _index SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                phone TEXT DEFAULT '',
                service TEXT DEFAULT '',
                message TEXT NOT NULL,
                date TIMESTAMPTZ DEFAULT now(),
                read BOOLEAN DEFAULT false
            );
            CREATE TABLE IF NOT EXISTS admin (
                id INTEGER PRIMARY KEY DEFAULT 1,
                username TEXT NOT NULL,
                password_salt TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                updated_at TIMESTAMPTZ DEFAULT now()
            );
            CREATE TABLE IF NOT EXISTS content (
                id INTEGER PRIMARY KEY DEFAULT 1,
                content JSONB NOT NULL
            );
            CREATE TABLE IF NOT EXISTS posts (
                id VARCHAR(64) PRIMARY KEY,
                title TEXT NOT NULL,
                slug TEXT UNIQUE NOT NULL,
                excerpt TEXT DEFAULT '',
                content TEXT DEFAULT '',
                category TEXT DEFAULT 'news',
                source TEXT DEFAULT 'Cryptova',
                source_url TEXT DEFAULT '',
                image TEXT DEFAULT '',
                date TIMESTAMPTZ DEFAULT now(),
                read_time INTEGER DEFAULT 5,
                is_manual BOOLEAN DEFAULT false
            );
        `;
        await getPool().query(sql);
        console.log('🔵 PostgreSQL storage ready');
        return true;
    } catch (err) {
        console.error('Failed to init DB:', err.message);
        return false;
    }
}

// ─── JSON file helpers ───
function readJSON(file, fallback) {
    try {
        if (!fs.existsSync(file)) return fallback;
        const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
        return parsed === undefined ? fallback : parsed;
    } catch {
        return fallback;
    }
}

function writeJSON(file, data) {
    try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
        fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
        console.error('Failed to write file:', file, err.message);
    }
}

// ─── CONTACTS ───

const dbModule = {
    async loadContacts() {
        if (await isDBOk()) {
            try {
                const { rows } = await getPool().query(
                    'SELECT _index AS index, name, email, phone, service, message, date, read FROM contacts ORDER BY _index'
                );
                return rows.map(r => ({
                    index: r.index,
                    name: r.name, email: r.email, phone: r.phone || '',
                    service: r.service || '', message: r.message,
                    date: r.date ? new Date(r.date).toISOString() : new Date().toISOString(),
                    read: !!r.read,
                }));
            } catch (err) {
                console.error('DB loadContacts error, using file:', err.message);
                return readJSON(CONTACTS_FILE, []);
            }
        }
        const arr = readJSON(CONTACTS_FILE, []);
        return arr.map((c, i) => ({ index: i, ...c }));
    },

    async saveContacts(contacts) {
        if (await isDBOk()) {
            try {
                await getPool().query('DELETE FROM contacts');
                for (const c of contacts) {
                    await getPool().query(
                        `INSERT INTO contacts (name, email, phone, service, message, date, read)
                         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                        [c.name, c.email, c.phone || '', c.service || '', c.message,
                         c.date || new Date().toISOString(), !!c.read]
                    );
                }
                return;
            } catch (err) {
                console.error('DB saveContacts error, using file:', err.message);
            }
        }
        writeJSON(CONTACTS_FILE, contacts);
    },

    async addContact(c) {
        if (await isDBOk()) {
            try {
                const { rows } = await getPool().query(
                    `INSERT INTO contacts (name, email, phone, service, message) VALUES ($1,$2,$3,$4,$5) RETURNING _index AS index`,
                    [c.name, c.email, c.phone || '', c.service || '', c.message]
                );
                return { index: rows[0].index - 1, ...c, read: false };
            } catch (err) {
                console.error('DB addContact error, using file:', err.message);
            }
        }
        const list = readJSON(CONTACTS_FILE, []);
        list.push({ ...c, date: new Date().toISOString(), read: false });
        writeJSON(CONTACTS_FILE, list);
        return { index: list.length - 1, ...c, read: false };
    },

    async setContactRead(index, read) {
        if (await isDBOk()) {
            try {
                await getPool().query('UPDATE contacts SET read=$1 WHERE _index=$2', [!!read, index + 1]);
                return true;
            } catch (err) {
                console.error('DB setContactRead error:', err.message);
            }
        }
        const list = readJSON(CONTACTS_FILE, []);
        if (list[index]) { list[index].read = !!read; writeJSON(CONTACTS_FILE, list); }
        return true;
    },

    async deleteContact(index) {
        if (await isDBOk()) {
            try {
                await getPool().query('DELETE FROM contacts WHERE _index=$1', [index + 1]);
                return true;
            } catch (err) {
                console.error('DB deleteContact error:', err.message);
            }
        }
        const list = readJSON(CONTACTS_FILE, []);
        if (list[index]) { list.splice(index, 1); writeJSON(CONTACTS_FILE, list); }
        return true;
    },

    // ─── ADMIN ───

    async getAdmin() {
        if (await isDBOk()) {
            try {
                const { rows } = await getPool().query('SELECT username, password_salt AS salt, password_hash AS hash FROM admin WHERE id=1');
                if (rows[0] && rows[0].hash) return { username: rows[0].username, passwordHash: { salt: rows[0].salt, hash: rows[0].hash } };
            } catch (err) {
                console.error('DB getAdmin error, using file:', err.message);
            }
        }
        return readJSON(ADMIN_FILE, null);
    },

    async saveAdmin(username, passwordHash) {
        if (await isDBOk()) {
            try {
                await getPool().query(
                    `INSERT INTO admin (id, username, password_salt, password_hash)
                     VALUES (1, $1, $2, $3)
                     ON CONFLICT (id) DO UPDATE SET username=EXCLUDED.username, password_salt=EXCLUDED.password_salt, password_hash=EXCLUDED.password_hash, updated_at=now()`,
                    [username, passwordHash.salt, passwordHash.hash]
                );
                return;
            } catch (err) {
                console.error('DB saveAdmin error, using file:', err.message);
            }
        }
        writeJSON(ADMIN_FILE, { username, passwordHash });
    },

    // ─── CONTENT ───

    async getContent() {
        if (await isDBOk()) {
            try {
                const { rows } = await getPool().query('SELECT content FROM content WHERE id=1');
                if (rows[0] && rows[0].content) return rows[0].content;
            } catch (err) {
                console.error('DB getContent error, using file:', err.message);
            }
        }
        return readJSON(CONTENT_FILE, { services: [], pricing: { cryptoRates: [], packages: [] }, faq: [] });
    },

    async saveContent(content) {
        if (await isDBOk()) {
            try {
                await getPool().query(
                    `INSERT INTO content (id, content) VALUES (1, $1)
                     ON CONFLICT (id) DO UPDATE SET content=EXCLUDED.content`,
                    [JSON.stringify(content)]
                );
                return;
            } catch (err) {
                console.error('DB saveContent error, using file:', err.message);
            }
        }
        writeJSON(CONTENT_FILE, content);
    },

    // ─── POSTS ───

    async loadPosts() {
        if (await isDBOk()) {
            try {
                const { rows } = await getPool().query(
                    `SELECT id, title, slug, excerpt, content, category, source, source_url AS "sourceUrl", image, date, read_time AS "readTime", is_manual AS "isManual"
                     FROM posts ORDER BY date DESC`
                );
                return rows.map(r => ({
                    id: r.id, title: r.title, slug: r.slug, excerpt: r.excerpt || '',
                    content: r.content || '', category: r.category || 'news', source: r.source || 'Cryptova',
                    sourceUrl: r.sourceUrl || '', image: r.image || '',
                    date: r.date ? new Date(r.date).toISOString() : new Date().toISOString(),
                    readTime: r.readTime || 5, isManual: !!r.isManual,
                }));
            } catch (err) {
                console.error('DB loadPosts error, using file:', err.message);
                return readJSON(POSTS_FILE, []);
            }
        }
        return readJSON(POSTS_FILE, []);
    },

    async savePosts(posts) {
        if (await isDBOk()) {
            try {
                for (const p of posts) {
                    await getPool().query(
                        `INSERT INTO posts (id, title, slug, excerpt, content, category, source, source_url, image, date, read_time, is_manual)
                         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
                         ON CONFLICT (id) DO UPDATE SET
                            title=EXCLUDED.title, excerpt=EXCLUDED.excerpt, content=EXCLUDED.content,
                            category=EXCLUDED.category, source=EXCLUDED.source, source_url=EXCLUDED.source_url,
                            image=EXCLUDED.image, date=EXCLUDED.date, read_time=EXCLUDED.read_time, is_manual=EXCLUDED.is_manual`,
                        [p.id, p.title, p.slug, p.excerpt || '', p.content || '',
                         p.category || 'news', p.source || 'Cryptova', p.sourceUrl || '',
                         p.image || '', p.date || new Date().toISOString(), p.readTime || 5, !!p.isManual]
                    );
                }
                return;
            } catch (err) {
                console.error('DB savePosts error, using file:', err.message);
            }
        }
        writeJSON(POSTS_FILE, posts);
    },

    async clearDB() {
        if (await isDBOk()) {
            try {
                await getPool().query('DELETE FROM posts; DELETE FROM contacts; DELETE FROM content; DELETE FROM admin;');
                console.log('🗑️  Cleared all DB rows (init for fresh import)');
            } catch (err) {
                console.error('clearDB error:', err.message);
            }
        }
    },
};

async function seedFromFiles() {
    // Seeds DB from the committed JSON files on first startup (if DB empty).
    if (!(await isDBOk())) return;
    try {
        const content = dbModule.getContent ? null : null;
        const { rows } = await getPool().query('SELECT COUNT(*)::int AS c FROM content');
        if (rows[0].c === 0) {
            const c = readJSON(CONTENT_FILE, { services: [], pricing: { cryptoRates: [], packages: [] }, faq: [] });
            await getPool().query(`INSERT INTO content (id, content) VALUES (1,$1)`, [JSON.stringify(c)]);
            console.log('🌱 Seeded content.json into Postgres');
        }
        const { rows: pCount } = await getPool().query('SELECT COUNT(*)::int AS c FROM posts');
        if (pCount[0].c === 0) {
            const posts = readJSON(POSTS_FILE, []);
            if (posts.length) {
                for (const p of posts) {
                    await getPool().query(
                        `INSERT INTO posts (id, title, slug, excerpt, content, category, source, source_url, image, date, read_time, is_manual)
                         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT (id) DO NOTHING`,
                        [p.id, p.title, p.slug, p.excerpt || '', p.content || '',
                         p.category || 'news', p.source || 'Cryptova', p.sourceUrl || '',
                         p.image || '', p.date || new Date().toISOString(), p.readTime || 5, !!p.isManual]
                    );
                }
                console.log(`🌱 Seeded ${posts.length} posts into Postgres`);
            }
        }
    } catch (err) {
        console.error('Seed error:', err.message);
    }
}

module.exports = { initDB, isDBOk, seedFromFiles, dbModule };