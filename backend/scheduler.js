/* ============================================
   Cryptova - Blog Scheduler
   Runs RSS fetcher on a schedule
   Can run standalone or be required by server.js
   ============================================ */

const { fetchAllFeeds } = require('./rss-fetcher');

const DEFAULT_INTERVAL_HOURS = 6;
const DEFAULT_POSTS_PER_RUN = 5;

class BlogScheduler {
    constructor(options = {}) {
        this.intervalHours = options.intervalHours || DEFAULT_INTERVAL_HOURS;
        this.postsPerRun = options.postsPerRun || DEFAULT_POSTS_PER_RUN;
        this.intervalId = null;
        this.isRunning = false;
        this.lastRun = null;
        this.runCount = 0;
        this.totalPostsAdded = 0;
    }

    async runOnce() {
        if (this.isRunning) {
            console.log('⏭️  RSS fetch already in progress, skipping...');
            return [];
        }

        this.isRunning = true;
        const startTime = Date.now();

        try {
            console.log(`\n🕐 [Scheduler] Running scheduled RSS fetch (#${this.runCount + 1})...`);
            const posts = await fetchAllFeeds(this.postsPerRun);
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

            this.lastRun = new Date().toISOString();
            this.runCount++;
            this.totalPostsAdded += posts.length;

            console.log(`🕐 [Scheduler] Completed in ${elapsed}s — ${posts.length} new posts`);
            return posts;
        } catch (err) {
            console.error('🕐 [Scheduler] Error during fetch:', err.message);
            return [];
        } finally {
            this.isRunning = false;
        }
    }

    // Fetch only if more than minMinutes have passed since the last run.
    // Used on blog page visits to keep content fresh without spamming sources.
    async fetchIfStale(minMinutes) {
        const threshold = minMinutes * 60 * 1000;
        if (this.lastRun && (Date.now() - new Date(this.lastRun).getTime()) < threshold) {
            return []; // too soon — skip
        }
        return this.runOnce();
    }

    getLastRun() {
        return this.lastRun;
    }

    start() {
        if (this.intervalId) {
            console.log('🕐 [Scheduler] Already running');
            return;
        }

        const intervalMs = this.intervalHours * 60 * 60 * 1000;
        console.log(`🕐 [Scheduler] Starting — will fetch every ${this.intervalHours}h`);

        // Run immediately on start
        this.runOnce();

        // Then schedule recurring runs
        this.intervalId = setInterval(() => {
            this.runOnce();
        }, intervalMs);

        // Handle graceful shutdown
        const shutdown = () => {
            this.stop();
            process.exit(0);
        };
        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log('🕐 [Scheduler] Stopped');
        }
    }

    getStatus() {
        return {
            running: this.intervalId !== null,
            fetching: this.isRunning,
            intervalHours: this.intervalHours,
            lastRun: this.lastRun,
            runCount: this.runCount,
            totalPostsAdded: this.totalPostsAdded,
        };
    }
}

// === Export for use by server.js ===
module.exports = { BlogScheduler };

// === Run standalone if called directly ===
if (require.main === module) {
    const hoursArg = parseInt(process.argv[2], 10);
    const hours = isNaN(hoursArg) || hoursArg < 1 ? DEFAULT_INTERVAL_HOURS : hoursArg;

    const scheduler = new BlogScheduler({
        intervalHours: hours,
        postsPerRun: DEFAULT_POSTS_PER_RUN,
    });

    console.log('🚀 Cryptova Blog Scheduler (standalone mode)');
    console.log(`   Interval: every ${hours} hours`);
    console.log(`   Posts per run: ${DEFAULT_POSTS_PER_RUN}`);
    console.log('   Press Ctrl+C to stop\n');

    scheduler.start();
}
