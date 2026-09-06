/* ============================================
   Cryptova - RSS Feed Fetcher
   Fetches crypto & tech news from RSS feeds
   and saves them as blog posts in Arabic
   ============================================ */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const POSTS_FILE = path.join(DATA_DIR, 'posts.json');

// === RSS Feed Sources ===
const RSS_FEEDS = [
    {
        url: 'https://cointelegraph.com/rss',
        source: 'CoinTelegraph',
        category: 'crypto',
    },
    {
        url: 'https://www.coindesk.com/arc/outboundfeeds/rss/',
        source: 'CoinDesk',
        category: 'crypto',
    },
    {
        url: 'https://cryptonews.com/news/feed/',
        source: 'CryptoNews',
        category: 'crypto',
    },
    {
        url: 'https://coingape.com/feed/',
        source: 'CoinGape',
        category: 'crypto',
    },
    {
        url: 'https://www.newsbtc.com/feed/',
        source: 'NewsBTC',
        category: 'crypto',
    },
    {
        url: 'https://beincrypto.com/feed/',
        source: 'BeInCrypto',
        category: 'crypto',
    },
    {
        url: 'https://cryptopotato.com/feed/',
        source: 'CryptoPotato',
        category: 'crypto',
    },
    {
        url: 'https://www.theverge.com/rss/index.xml',
        source: 'The Verge',
        category: 'tech',
    },
    {
        url: 'https://techcrunch.com/feed/',
        source: 'TechCrunch',
        category: 'tech',
    },
    {
        url: 'https://www.wired.com/feed/tag/ai/latest/rss',
        source: 'Wired AI',
        category: 'tech',
    },
];

// === Arabic Translation Keywords ===
const CATEGORY_KEYWORDS = {
    crypto: [
        'bitcoin', 'btc', 'ethereum', 'eth', 'crypto', 'blockchain', 'defi',
        'nft', 'token', 'coin', 'mining', 'wallet', 'exchange', 'trading',
        'altcoin', 'solana', 'xrp', 'ripple', 'binance', 'coinbase',
        'stablecoin', 'usdt', 'usdc', 'web3', 'dao', 'stake', 'yield',
    ],
    tech: [
        'ai', 'artificial intelligence', 'machine learning', 'software',
        'hardware', 'apple', 'google', 'microsoft', 'meta', 'amazon',
        'startup', 'app', 'developer', 'programming', 'code', 'data',
        'cloud', 'cyber', 'security', 'chip', 'semiconductor', 'robot',
    ],
    news: [
        'market', 'price', 'bull', 'bear', 'rally', 'crash', 'regulation',
        'SEC', 'ban', 'adopt', 'institution', 'etf', 'forecast', 'analysis',
    ],
    tips: [
        'guide', 'how to', 'tutorial', 'tips', 'best', 'beginner',
        'start', 'learn', 'understand', 'explain', 'review', 'compare',
    ],
};

const { dbModule } = require('./db');

// === Utility Functions ===

async function loadPosts() {
    return dbModule.loadPosts();
}

async function savePosts(posts) {
    return dbModule.savePosts(posts);
}

function generateSlug(title) {
    return title
        .toLowerCase()
        .replace(/[^\w\s\u0600-\u06FF-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 100);
}

function detectCategory(title, description) {
    const text = (title + ' ' + description).toLowerCase();
    const scores = { crypto: 0, tech: 0, news: 0, tips: 0 };

    for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        for (const kw of keywords) {
            if (text.includes(kw)) scores[cat]++;
        }
    }

    let best = 'crypto';
    let bestScore = 0;
    for (const [cat, score] of Object.entries(scores)) {
        if (score > bestScore) {
            bestScore = score;
            best = cat;
        }
    }
    return best;
}

function estimateReadTime(text) {
    if (!text) return 3;
    const words = text.split(/\s+/).length;
    return Math.max(2, Math.ceil(words / 200));
}

function isDuplicate(url, title, existingPosts) {
    if (url) {
        const urlExists = existingPosts.some(p => p.sourceUrl === url);
        if (urlExists) return true;
    }
    if (title) {
        const normalTitle = title.toLowerCase().trim();
        const titleExists = existingPosts.some(p => {
            const existing = (p.title || '').toLowerCase().trim();
            return existing === normalTitle ||
                   (existing.length > 20 && normalTitle.length > 20 &&
                    existing.slice(0, 40) === normalTitle.slice(0, 40));
        });
        if (titleExists) return true;
    }
    return false;
}

// === Smart filtering: decide whether a news item is worth publishing ===
// Avoids low-quality / noise / price-tick articles to keep the blog meaningful.

// Keywords indicating important / "exciting" news
const IMPORTANT_KEYWORDS = [
    // regulatory / institutional
    'sec', 'regulator', 'ban', 'lawsuit', 'sue', 'approve', 'etf', 'court',
    'central bank', 'regulation', 'adopt', 'partnership', 'acquisition', 'merger',
    // major launches / breakthroughs
    'launch', 'mainnet', 'upgrade', 'fork', 'halving', 'breakthrough', 'patent',
    'record', 'milestone', 'all-time', 'ipo', 'listing', 'airdrop',
    // security / incidents
    'hack', 'breach', 'exploit', 'attack', 'vulnerability', 'scam', 'arrest',
    'seizure', 'freeze',
    // market-moving
    'crash', 'rally', 'surge', 'plunge', 'correction', 'inflow', 'outflow',
    'coinbase', 'binance', 'blackrock', 'jpmorgan', 'ethereum', 'bitcoin',
];

// Keywords indicating noise / trivial / to-be-avoided
const NOISE_KEYWORDS = [
    'price analysis', 'update on', 'weekly roundup', 'this week in',
    'price of', 'how much is', 'worth', 'top gainers', 'losers',
    'community reacts', 'social media reacts', 'says',
];

function isWorthPublishing(title, description) {
    const text = ((title || '') + ' ' + (description || '')).toLowerCase();

    // 1. Too short = likely not a real article
    const wordCount = text.split(/\s+/).filter(w => w.length > 1).length;
    if (wordCount < 5) return false;

    // 2. Contains noise keywords -> skip
    for (const kw of NOISE_KEYWORDS) {
        if (text.includes(kw)) return false;
    }

    // 3. Has at least one "important" signal -> publish
    let signalCount = 0;
    for (const kw of IMPORTANT_KEYWORDS) {
        // match as whole word
        const re = new RegExp('\\b' + kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
        if (re.test(text)) signalCount++;
    }

    // Publish if it has a strong signal, otherwise still accept but with lower priority
    return signalCount >= 0;
}

function scoreImportance(title, description) {
    const text = ((title || '') + ' ' + (description || '')).toLowerCase();
    let score = 0;
    for (const kw of IMPORTANT_KEYWORDS) {
        const re = new RegExp('\\b' + kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
        if (re.test(text)) score++;
    }
    // Longer articles are usually more substantive
    const wordCount = text.split(/\s+/).length;
    if (wordCount > 60) score += 1;
    return score;
}

// === Real machine translation via Google Translate (free, no API key) ===

// Cache translations to avoid re-calling the service for identical text
const translationCache = new Map();
async function translateText(text, targetLang) {
    try {
        const cacheKey = text + '|' + targetLang;
        if (translationCache.has(cacheKey)) {
            return translationCache.get(cacheKey);
        }

        const url = 'https://translate.googleapis.com/translate_a/single' +
            '?client=gtx&sl=auto&tl=' + encodeURIComponent(targetLang) +
            '&dt=t&q=' + encodeURIComponent(text);
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15000);
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timer);

        if (!response.ok) throw new Error('HTTP ' + response.status);
        const data = await response.json();

        let result = '';
        const segments = data && data[0] ? data[0] : [];
        for (const seg of segments) {
            if (seg && seg[0]) result += seg[0];
        }

        const final = result || text;
        translationCache.set(cacheKey, final);
        return final;
    } catch (err) {
        console.error(`Translation failed for "${text.slice(0, 40)}...": ${err.message}`);
        return null; // signal failure so caller can use fallback
    }
}

// === RSS XML Parser (minimal, no dependencies) ===

function parseRSSItems(xml) {
    const items = [];
    const itemMatches = xml.match(/<item[^>]*>([\s\S]*?)<\/item>/gi) ||
                        xml.match(/<entry[^>]*>([\s\S]*?)<\/entry>/gi) || [];

    for (const itemXml of itemMatches) {
        const item = {};

        // Extract title
        const titleMatch = itemXml.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
        item.title = titleMatch ? titleMatch[1].trim().replace(/<[^>]*>/g, '') : '';

        // Extract link
        const linkMatch = itemXml.match(/<link[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i) ||
                         itemXml.match(/<link[^>]*href="([^"]*)"/i);
        item.link = linkMatch ? (linkMatch[1] || '').trim() : '';

        // Extract description
        const descMatch = itemXml.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i) ||
                         itemXml.match(/<content[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content>/i) ||
                         itemXml.match(/<summary[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/summary>/i);
        item.description = descMatch ? descMatch[1].trim().replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim() : '';

        // Extract pubDate
        const dateMatch = itemXml.match(/<pubDate[^>]*>([^<]*)<\/pubDate>/i) ||
                         itemXml.match(/<updated[^>]*>([^<]*)<\/updated>/i) ||
                         itemXml.match(/<published[^>]*>([^<]*)<\/published>/i);
        item.pubDate = dateMatch ? dateMatch[1].trim() : '';

        // Extract image (only keep local/relative images — external images from RSS
        // feeds are frequently broken/truncated and cause console errors, so we
        // drop them and rely on the styled gradient placeholder instead)
        const imgMatch = itemXml.match(/<media:content[^>]*url="([^"]*)"/i) ||
                        itemXml.match(/<enclosure[^>]*url="([^"]*)"[^>]*type="image/i) ||
                        itemXml.match(/<img[^>]*src="([^"]*)"/i);
        const rawImage = imgMatch ? imgMatch[1] : '';
        item.image = (rawImage && !/^https?:\/\//i.test(rawImage)) ? rawImage : '';

        if (item.title) {
            items.push(item);
        }
    }

    return items;
}

// === Fetch and Parse RSS Feed ===

async function fetchFeed(feed) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    try {
        const response = await fetch(feed.url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'CryptovaBot/1.0 (https://cryptova.ye)',
                'Accept': 'application/rss+xml, application/xml, text/xml, */*',
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const xml = await response.text();
        const items = parseRSSItems(xml);

        return items.map(item => ({
            ...item,
            source: feed.source,
            feedCategory: feed.category,
        }));
    } catch (err) {
        console.error(`Failed to fetch ${feed.source}: ${err.message}`);
        return [];
    } finally {
        clearTimeout(timer);
    }
}

// === Main Fetch Function ===

async function fetchAllFeeds(maxPosts = 5) {
    console.log('📰 Starting RSS feed fetch...');
    const existingPosts = await loadPosts();
    const newPosts = [];
    const today = new Date().toISOString().split('T')[0];

    // Fetch from all feeds concurrently
    const feedPromises = RSS_FEEDS.map(feed => fetchFeed(feed));
    const feedResults = await Promise.allSettled(feedPromises);

    let allItems = [];
    for (const result of feedResults) {
        if (result.status === 'fulfilled') {
            allItems = allItems.concat(result.value);
        }
    }

    console.log(`   Found ${allItems.length} total items from feeds`);

    // Sort by date (newest first)
    allItems.sort((a, b) => {
        const dateA = new Date(a.pubDate || 0);
        const dateB = new Date(b.pubDate || 0);
        return dateB - dateA;
    });

    // Filter out noise/inconsequential items first (cheap, avoids translating junk)
    const meaningfulItems = allItems.filter(item =>
        isWorthPublishing(item.title, item.description)
    );
    console.log(`   Filtered ${allItems.length - meaningfulItems.length} noise items, ${meaningfulItems.length} remain`);

    // Process items with real translation, ranking by importance
    const processed = [];
    for (const item of meaningfulItems) {
        if (processed.length >= maxPosts * 2) break;

        if (isDuplicate(item.link, item.title, existingPosts)) {
            continue;
        }

        const importance = scoreImportance(item.title, item.description);

        // Real Arabic translation with graceful fallback to keyword mapping
        let title = await translateText(item.title, 'ar');
        let description = await translateText(item.description || item.title, 'ar');

        // Fallback: if translation failed, strip HTML of English text
        if (!title || title === item.title) {
            const plain = (item.title || '').replace(/<[^>]*>/g, '').trim();
            title = title || plain;
        }
        if (!description) {
            description = item.description || title;
        }

        if (!title || title.length < 10) continue;

        const category = detectCategory((item.title || '') + ' ' + (item.description || ''));
        const slug = generateSlug(title) + '-' + Date.now().toString(36);

        processed.push({
            post: {
                id: 'auto-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
                title: title.slice(0, 200),
                slug: slug,
                excerpt: description.slice(0, 300) || title,
                content: description || title,
                category: category,
                source: item.source,
                sourceUrl: item.link || '',
                image: item.image || '',
                date: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
                readTime: estimateReadTime(description),
                isManual: false,
                importance: importance,
            },
            importance: importance,
        });
    }

    // Sort by importance (highest first), then take the top maxPosts
    processed.sort((a, b) => b.importance - a.importance);
    const selected = processed.slice(0, maxPosts);

    newPosts.push(...selected.map(p => {
        const { importance, ...post } = p.post;
        return post;
    }));

    if (newPosts.length > 0) {
        const allPosts = [...existingPosts, ...newPosts];
        // Sort all posts by date
        allPosts.sort((a, b) => new Date(b.date) - new Date(a.date));
        await savePosts(allPosts);
        console.log(`   ✅ Added ${newPosts.length} new posts`);
    } else {
        console.log('   ℹ️ No new posts to add (all duplicates or no items)');
    }

    // Cleanup: keep max 500 posts (remove oldest auto posts)
    const allAfter = await loadPosts();
    if (allAfter.length > 500) {
        const manualPosts = allAfter.filter(p => p.isManual);
        const autoPosts = allAfter.filter(p => !p.isManual)
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 500 - manualPosts.length);
        await savePosts([...manualPosts, ...autoPosts]);
        console.log(`   🧹 Cleaned up: kept ${manualPosts.length + autoPosts.length} posts`);
    }

    const totalPosts = (await loadPosts()).length;
    console.log(`📰 RSS fetch complete. Total posts: ${totalPosts}`);
    return newPosts;
}

// === Export for use by server.js and scheduler ===
module.exports = { fetchAllFeeds, loadPosts, savePosts };

// === Run directly if called from command line ===
if (require.main === module) {
    const maxArg = parseInt(process.argv[2], 10);
    const max = isNaN(maxArg) || maxArg < 1 ? 5 : Math.min(maxArg, 20);

    fetchAllFeeds(max)
        .then(posts => {
            if (posts.length > 0) {
                posts.forEach(p => {
                    console.log(`  📝 ${p.title.slice(0, 60)}... [${p.category}]`);
                });
            }
            process.exit(0);
        })
        .catch(err => {
            console.error('Fatal error:', err);
            process.exit(1);
        });
}
