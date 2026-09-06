/* ============================================
   Cryptova - Lightweight visitor analytics
   Tracks HTML page views (total + per-day + unique IPs per day).
   Persists into content.json / Postgres (content.analytics) every 60s,
   keeping the last ~45 days of daily records.
   ============================================ */

const { dbModule } = require('./db');

const PERSIST_MS = 60 * 1000;
const KEEP_DAYS = 45;
const BOT_RE = /bot|crawler|spider|slurp|curl|wget|python-requests|headless|uptimerobot|pingdom|monitor/i;

let state = null;

function todayKey(now) {
  return now.toISOString().slice(0, 10);
}
function hourKey(now) {
  return now.toISOString().slice(0, 13);
}

function initState() {
  const now = new Date();
  const day = todayKey(now);
  state = {
    totalViews: 0,
    day,
    dayViews: 0,
    dayUniques: new Set(),
    clicks: {},       // lifetime social-link clicks per target
    dayClicks: {},    // today's social-link clicks per target
    history: [], // [{ date, views, uniques, clicks }] oldest -> newest, excludes today
  };
}

function rollover(now) {
  if (state.day === todayKey(now)) return;
  if (state.dayViews > 0 || state.dayUniques.size > 0 || Object.keys(state.dayClicks).length > 0) {
    state.history.push({
      date: state.day,
      views: state.dayViews,
      uniques: state.dayUniques.size,
      clicks: Object.assign({}, state.dayClicks),
    });
    if (state.history.length > KEEP_DAYS) state.history = state.history.slice(-KEEP_DAYS);
  }
  state.day = todayKey(now);
  state.dayViews = 0;
  state.dayUniques = new Set();
  state.dayClicks = {};
}

async function loadPersisted() {
  initState();
  try {
    const content = await dbModule.getContent();
    const a = content && content.analytics;
    if (!a || typeof a !== 'object') return;
    state.totalViews = Number(a.totalViews) || 0;
    state.clicks = (a.clicks && typeof a.clicks === 'object') ? a.clicks : {};
    const today = todayKey(new Date());
    if (Array.isArray(a.days)) {
      const rows = a.days.filter(d => d && d.date && Number.isFinite(Number(d.views)));
      const sorted = rows.slice(-KEEP_DAYS);
      const last = sorted[sorted.length - 1];
      if (last && last.date === today) {
        state.dayViews = Number(last.views) || 0;
        state.dayUniques = new Set(Array.isArray(last.uniques) ? last.uniques : []);
        state.dayClicks = (last.clicks && typeof last.clicks === 'object') ? last.clicks : {};
        state.history = sorted.slice(0, -1);
      } else {
        state.history = sorted;
      }
    }
  } catch (err) {
    console.error('analytics: loadPersisted error:', err.message);
  }
}

async function persist() {
  try {
    const now = new Date();
    rollover(now);
    const content = await dbModule.getContent();
    content.analytics = {
      totalViews: state.totalViews,
      clicks: Object.assign({}, state.clicks),
      days: state.history.concat([{
        date: state.day,
        views: state.dayViews,
        uniques: Array.from(state.dayUniques),
        clicks: Object.assign({}, state.dayClicks),
      }]).slice(-KEEP_DAYS),
    };
    await dbModule.saveContent(content);
  } catch (err) {
    console.error('analytics: persist error:', err.message);
  }
}

function clientIp(req) {
  const fwd = (req.headers && (req.headers['x-forwarded-for'] || '')) || '';
  if (fwd) return String(fwd).split(',')[0].trim();
  return (req.ip || '').replace(/^::ffff:/, '') || 'unknown';
}

function trackVisit(req) {
  if (!state) initState();
  const ua = (req.headers && req.headers['user-agent']) || '';
  if (BOT_RE.test(ua)) return;
  const now = new Date();
  rollover(now);
  state.totalViews += 1;
  state.dayViews += 1;
  state.dayUniques.add(clientIp(req));
}

function isPage(req) {
  const p = req.path || '/';
  if (req.method !== 'GET') return false;
  if (p.startsWith('/api') || p.startsWith('/.well-known')) return false;
  if (/\.[a-z0-9]{2,5}$/i.test(p)) return false; // static assets / files
  return true;
}

// Count a social-link click (target is a known alias like 'twitter', 'telegram'...)
function trackClick(target) {
  if (!state) initState();
  const now = new Date();
  rollover(now);
  state.clicks[target] = (state.clicks[target] || 0) + 1;
  state.dayClicks[target] = (state.dayClicks[target] || 0) + 1;
}

// Last N daily records (including today, oldest -> newest by calendar date).
function history(days = 7) {
  if (!state) initState();
  const now = new Date();
  rollover(now);
  return state.history.concat([{
    date: state.day,
    views: state.dayViews,
    uniques: state.dayUniques.size,
    clicks: Object.assign({}, state.dayClicks),
  }]).slice(-days);
}

function getStats() {
  if (!state) initState();
  const seven = history(7);
  return {
    totalViews: state.totalViews,
    todayViews: state.dayViews,
    todayUniques: state.dayUniques.size,
    history: seven,
    clicks: Object.assign({}, state.clicks),
    clicksToday: Object.assign({}, state.dayClicks),
    hourKey: hourKey(new Date()),
  };
}

function start() {
  loadPersisted().then(() => {
    const timer = setInterval(() => { persist().catch(() => {}); }, PERSIST_MS);
    timer.unref && timer.unref();
    const shutdown = () => { persist().catch(() => {}); };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  });
}

module.exports = { trackVisit, trackClick, isPage, getStats, start, persist };