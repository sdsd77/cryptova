/* ============================================
   Cryptova - Yemeni Riyal (YER) exchange rates
   - Auto-fetches USD/YER buy & sell from ye-rial.com (Sanaa & Aden)
   - Falls back to stored values, then to sensible defaults
   - Admin can override manually (mode: 'auto' | 'manual')
   - TTL: 30 minutes (fresh check), respects 'manual' mode
   ============================================ */

const { dbModule } = require('./db');

const DEFAULT_RATES = {
  source: 'auto',
  updatedAt: null,
  sanaa: { buy: 533, sell: 536 },
  aden: { buy: 1554, sell: 1562 },
};

const TTL_MS = 30 * 60 * 1000;
const FETCH_TIMEOUT_MS = 10000;

let refreshTimer = null;
let cache = null;

function parseNumbers(str) {
  const digits = String(str || '').replace(/[^\d.]/g, '');
  const num = parseFloat(digits);
  return Number.isFinite(num) && num > 0 ? num : null;
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Cryptova exchange watcher)' },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error('Request failed: ' + response.status);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

function parseYeRial(html) {
  // Collect every table row that has at least 3 cells.
  const rows = [];
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let m;
  while ((m = rowRe.exec(html)) !== null) {
    const cells = [];
    const cellRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
    let cm;
    while ((cm = cellRe.exec(m[1])) !== null) {
      cells.push(cm[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim());
    }
    if (cells.length >= 3) rows.push(cells);
  }

  // Find USD rows: the one row whose first cell contains 'دولار'.
  const results = [];
  for (const cells of rows) {
    if (cells[0] && /دولار/i.test(cells[0])) {
      const buy = parseNumbers(cells[1]);
      const sell = parseNumbers(cells[2]);
      if (buy && sell) results.push({ buy, sell });
    }
  }

  // ye-rial.com main page: first table = Sanaa, second table = Aden.
  if (results.length >= 2) return { sanaa: results[0], aden: results[1] };
  if (results.length === 1) return { sanaa: results[0], aden: results[0] };
  throw new Error('No USD rows found');
}

async function loadPersisted() {
  try {
    const content = await dbModule.getContent();
    const ex = content && content.exchangeRates;
    if (ex && ex.sanaa && ex.aden) {
      cache = {
        source: ex.source === 'manual' ? 'manual' : 'auto',
        updatedAt: ex.updatedAt || null,
        sanaa: { buy: parseNumbers(ex.sanaa.buy) || DEFAULT_RATES.sanaa.buy, sell: parseNumbers(ex.sanaa.sell) || DEFAULT_RATES.sanaa.sell },
        aden: { buy: parseNumbers(ex.aden.buy) || DEFAULT_RATES.aden.buy, sell: parseNumbers(ex.aden.sell) || DEFAULT_RATES.aden.sell },
      };
    }
  } catch (err) {
    console.error('exchange-rates: loadPersisted error:', err.message);
  }
  if (!cache) cache = { ...DEFAULT_RATES, sanaa: { ...DEFAULT_RATES.sanaa }, aden: { ...DEFAULT_RATES.aden } };
  return cache;
}

async function persist(rates) {
  try {
    const content = await dbModule.getContent();
    content.exchangeRates = {
      source: rates.source,
      updatedAt: rates.updatedAt,
      sanaa: { buy: rates.sanaa.buy, sell: rates.sanaa.sell },
      aden: { buy: rates.aden.buy, sell: rates.aden.sell },
    };
    await dbModule.saveContent(content);
  } catch (err) {
    console.error('exchange-rates: persist error:', err.message);
  }
}

async function tryFetchOnline() {
  const html = await fetchWithTimeout('https://ye-rial.com/');
  return parseYeRial(html);
}

async function refreshFromSource({ force } = {}) {
  await loadPersisted();
  // Manual override always wins; force only refreshes the auto source.
  if (cache.source === 'manual') return cache;
  if (!force && cache.updatedAt && Date.now() - new Date(cache.updatedAt).getTime() < TTL_MS) return cache;
  try {
    const fresh = await tryFetchOnline();
    cache.source = 'auto';
    cache.updatedAt = new Date().toISOString();
    cache.sanaa = fresh.sanaa;
    cache.aden = fresh.aden;
    await persist(cache);
    console.log(`🌙 Exchange rates refreshed: Sanaa ${cache.sanaa.buy}/${cache.sanaa.sell} · Aden ${cache.aden.buy}/${cache.aden.sell}`);
  } catch (err) {
    console.error('exchange-rates: auto-fetch failed:', err.message);
    if (!cache.updatedAt) cache.updatedAt = new Date().toISOString();
  }
  return cache;
}

async function getRates({ force } = {}) {
  if (!cache) await loadPersisted();
  if (force) return refreshFromSource({ force });
  if (cache.source === 'manual') return cache;
  if (!cache.updatedAt || Date.now() - new Date(cache.updatedAt).getTime() >= TTL_MS) {
    await refreshFromSource();
  }
  return cache;
}

async function setManualRates({ sanaa, aden }) {
  await loadPersisted();
  cache.source = 'manual';
  cache.updatedAt = new Date().toISOString();
  cache.sanaa = {
    buy: parseNumbers(sanaa && sanaa.buy) || cache.sanaa.buy,
    sell: parseNumbers(sanaa && sanaa.sell) || cache.sanaa.sell,
  };
  cache.aden = {
    buy: parseNumbers(aden && aden.buy) || cache.aden.buy,
    sell: parseNumbers(aden && aden.sell) || cache.aden.sell,
  };
  await persist(cache);
  return cache;
}

async function setAutoMode() {
  await loadPersisted();
  cache.source = 'auto';
  cache.updatedAt = null;
  await persist(cache);
}

function startSchedule() {
  if (refreshTimer) return;
  refreshTimer = setInterval(() => {
    refreshFromSource().catch(() => {});
  }, TTL_MS);
  refreshTimer.unref && refreshTimer.unref();
}

module.exports = { getRates, setManualRates, setAutoMode, refreshFromSource, startSchedule, DEFAULT_RATES };