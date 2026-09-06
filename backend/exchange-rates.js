/* ============================================
   Cryptova - Yemeni Riyal (YER) multi-currency exchange rates

   Sources (priority order):
     1) naqdilive.com  -> local buy/sell per region (Sanaa & Aden) for:
        USD, SAR, AED, OMR, KWD, EUR
     2) open.er-api.com -> international USD mid-rates, derive TRY & CNY
        (and any missing local currency) by scaling the local USD rate
     3) Stored persisted values, then built-in constants

   Admin can override manually (mode: 'auto' | 'manual').
   TTL: 30 minutes (fresh check), respects 'manual' mode.
   Shape: { source, updatedAt, sanaa: { code: {buy,sell}, ... }, aden: {...} }
   ============================================ */

const { dbModule } = require('./db');

const REGIONS = ['sanaa', 'aden'];

// usdValue = approximate USD value of one unit (used to derive currencies
// that are not locally quoted, and as a final fallback).
const CURRENCIES = {
  usd: { name: 'دولار أمريكي', usdValue: 1 },
  sar: { name: 'ريال سعودي', usdValue: 1 / 3.75 },
  aed: { name: 'درهم إماراتي', usdValue: 1 / 3.6725 },
  omr: { name: 'ريال عماني', usdValue: 2.6 },
  kwd: { name: 'دينار كويتي', usdValue: 3.26 },
  eur: { name: 'يورو', usdValue: 1.09 },
  try: { name: 'ليرة تركية', usdValue: 1 / 48 },
  cny: { name: 'يوان صيني', usdValue: 1 / 6.8 },
};

const LOCAL_SOURCE_CODES = ['usd', 'sar', 'aed', 'omr', 'kwd', 'eur'];
const INTL_SOURCE_CODES = ['try', 'cny'];

const NAME_MAP = {
  'دولار أمريكي': 'usd',
  'ريال سعودي': 'sar',
  'درهم إماراتي': 'aed',
  'ريال عماني': 'omr',
  'دينار كويتي': 'kwd',
  'يورو': 'eur',
};

const DEFAULT_USD = {
  sanaa: { buy: 533, sell: 536 },
  aden: { buy: 1554, sell: 1562 },
};

const TTL_MS = 30 * 60 * 1000;
const FETCH_TIMEOUT_MS = 12000;

const NAQ_URL = (region) => `https://naqdilive.com/currencies/${region}`;
const INTL_URL = 'https://open.er-api.com/v6/latest/USD';

let refreshTimer = null;
let cache = null;

function defaultRates() {
  const build = (regionUsd) => {
    const region = {};
    for (const code of Object.keys(CURRENCIES)) {
      const v = CURRENCIES[code].usdValue;
      region[code] = {
        buy: Math.round(regionUsd.buy * v * 100) / 100,
        sell: Math.round(regionUsd.sell * v * 100) / 100,
      };
    }
    return region;
  };
  return {
    source: 'auto',
    updatedAt: null,
    sanaa: build(DEFAULT_USD.sanaa),
    aden: build(DEFAULT_USD.aden),
  };
}

function parseNumbers(str) {
  const digits = String(str || '').replace(/,/g, '').replace(/[^\d.]/g, '');
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

// naqdilive.com uses a card per currency: name (text-lg) then شراء/بيع values.
function parseNaq(html) {
  const cards = {};
  const re = /<div class="font-bold text-gray-900 dark:text-white text-lg">([^<]+)<\/div>[\s\S]*?شراء<\/span>\s*<span[^>]*>([\d,]+(?:\.\d+)?)<\/span>\s*<\/div>\s*<div>\s*<span[^>]*>بيع<\/span>\s*<span[^>]*>([\d,]+(?:\.\d+)?)<\/span>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const code = NAME_MAP[m[1].trim()];
    if (!code) continue;
    const buy = parseNumbers(m[2]);
    const sell = parseNumbers(m[3]);
    if (buy && sell) cards[code] = { buy, sell };
  }
  return cards;
}

// Prefer live international rates; fall back to our constant usdValue table.
async function fetchIntlUsdValues() {
  try {
    const body = await fetchWithTimeout(INTL_URL);
    const data = JSON.parse(body);
    const rates = data && data.rates;
    if (!rates) throw new Error('No rates in intl payload');
    const out = {};
    for (const code of INTL_SOURCE_CODES) {
      const perUsd = rates[code.toUpperCase()];
      if (Number.isFinite(perUsd) && perUsd > 0) out[code] = 1 / perUsd;
    }
    return out;
  } catch (err) {
    console.error('exchange-rates: intl fetch failed (falling back to constants):', err.message);
    const out = {};
    for (const code of INTL_SOURCE_CODES) out[code] = CURRENCIES[code].usdValue;
    return out;
  }
}

// Mirror the region's local USD spread onto a derived pair.
function derivePairFromUsd(usdPair, usdValue) {
  return {
    buy: Math.round(usdPair.buy * usdValue * 100) / 100,
    sell: Math.round(usdPair.sell * usdValue * 100) / 100,
  };
}

function ensureAllCurrencies(region) {
  const usd = region.usd;
  for (const code of Object.keys(CURRENCIES)) {
    const r = region[code];
    if (!r || !(r.buy && r.sell)) {
      region[code] = derivePairFromUsd(usd, CURRENCIES[code].usdValue);
    }
  }
}

async function tryFetchOnline() {
  const [sanaaHtml, adenHtml] = await Promise.all([
    fetchWithTimeout(NAQ_URL('sanaa')),
    fetchWithTimeout(NAQ_URL('aden')),
  ]);
  const cards = {
    sanaa: parseNaq(sanaaHtml),
    aden: parseNaq(adenHtml),
  };

  const result = { sanaa: {}, aden: {} };
  for (const region of REGIONS) {
    const regionMap = cards[region];
    const usd = regionMap.usd || DEFAULT_USD[region];
    result[region].usd = usd;

    for (const code of LOCAL_SOURCE_CODES) {
      const pair = regionMap[code];
      if (pair && pair.buy && pair.sell) result[region][code] = pair;
      else result[region][code] = derivePairFromUsd(usd, CURRENCIES[code].usdValue);
    }
  }

  // TRY & CNY derived from international mid-rates (source of truth for those).
  const intl = await fetchIntlUsdValues();
  for (const region of REGIONS) {
    for (const code of INTL_SOURCE_CODES) {
      const v = intl[code] || CURRENCIES[code].usdValue;
      result[region][code] = derivePairFromUsd(result[region].usd, v);
    }
  }

  return result;
}

// --- Legacy migration -------------------------------------------------------
// Old shape was USD-only: { sanaa:{buy,sell}, aden:{buy,sell} }.
// New shape:             { sanaa:{ usd:{buy,sell}, sar:{...}, ... }, aden: {...} }.
function migrate(ex) {
  const out = { sanaa: {}, aden: {} };
  for (const region of REGIONS) {
    const r = ex && ex[region];
    if (!r) {
      out[region] = defaultRates()[region];
      continue;
    }
    if (typeof r.buy === 'number') {
      out[region].usd = { buy: r.buy, sell: r.sell };
    } else {
      out[region] = { ...r };
    }
    ensureAllCurrencies(out[region]);
  }
  return out;
}

async function loadPersisted() {
  try {
    const content = await dbModule.getContent();
    const ex = content && content.exchangeRates;
    if (ex && (ex.sanaa || ex.aden)) {
      cache = {
        source: ex.source === 'manual' ? 'manual' : 'auto',
        updatedAt: ex.updatedAt || null,
        ...migrate(ex),
      };
    }
  } catch (err) {
    console.error('exchange-rates: loadPersisted error:', err.message);
  }
  if (!cache) cache = defaultRates();
  return cache;
}

async function persist(rates) {
  try {
    const content = await dbModule.getContent();
    content.exchangeRates = {
      source: rates.source,
      updatedAt: rates.updatedAt,
      sanaa: rates.sanaa,
      aden: rates.aden,
    };
    await dbModule.saveContent(content);
  } catch (err) {
    console.error('exchange-rates: persist error:', err.message);
  }
}

async function refreshFromSource({ force } = {}) {
  await loadPersisted();
  if (cache.source === 'manual') return cache;
  if (!force && cache.updatedAt && Date.now() - new Date(cache.updatedAt).getTime() < TTL_MS) return cache;
  try {
    const fresh = await tryFetchOnline();
    cache.source = 'auto';
    cache.updatedAt = new Date().toISOString();
    cache.sanaa = fresh.sanaa;
    cache.aden = fresh.aden;
    await persist(cache);
    const u = cache.sanaa.usd;
    const a = cache.aden.usd;
    console.log(`🌙 Exchange rates refreshed: Sanaa USD ${u.buy}/${u.sell} · Aden USD ${a.buy}/${a.sell} (${Object.keys(cache.sanaa).length} currencies)`);
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

// { currencies: { usd: {sanaa:{buy,sell}, aden:{buy,sell}}, sar: {...}, ... } }
// Backward-compatible with the old { sanaa:{buy,sell}, aden:{buy,sell} } (USD).
async function setManualRates({ currencies }) {
  await loadPersisted();
  const map = currencies || {};
  let legacyUsd = null;
  if (map.sanaa && typeof map.sanaa.buy === 'number') {
    legacyUsd = { sanaa: map.sanaa, aden: (map.aden || {}).sell ? map.aden : null };
  }
  cache.source = 'manual';
  cache.updatedAt = new Date().toISOString();

  const apply = (code, pair) => {
    for (const region of REGIONS) {
      const r = pair && pair[region];
      const buy = r ? parseNumbers(r.buy) : null;
      const sell = r ? parseNumbers(r.sell) : null;
      if (buy && sell) cache[region][code] = { buy, sell };
    }
  };

  if (legacyUsd) {
    apply('usd', { sanaa: legacyUsd.sanaa, aden: legacyUsd.aden || cache.aden.usd });
  } else {
    for (const [code, pair] of Object.entries(map)) {
      if (!CURRENCIES[code] || !pair) continue;
      apply(code, pair);
    }
  }
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

module.exports = {
  getRates,
  setManualRates,
  setAutoMode,
  refreshFromSource,
  startSchedule,
  DEFAULT_RATES: defaultRates(),
};