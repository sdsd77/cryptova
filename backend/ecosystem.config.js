module.exports = {
    apps: [
        {
            name: 'cryptova',
            cwd: __dirname,
            script: 'server.js',
            env: {
                NODE_ENV: 'production',
            },
            max_memory_restart: '300M',
            autorestart: true,
            time: true,
        },
    ],
    // ملاحظة: جدولة جلب أخبار المدونة مدمجة داخل server.js
    // (يعمل تلقائياً عند تشغيل السيرفر، كل 24 ساعة افتراضياً).
    // لو أردت تشغيل المجدول كعملية مستقلة بدلاً من ذلك، فعّلها أدناه
    // وأوقِف الجدولة داخل السيرفر بجعل BLOG_SCHEDULER=0 في .env:
    //
    // {
    //     name: 'cryptova-blog-fetcher',
    //     cwd: __dirname,
    //     script: 'scheduler.js',
    //     args: '24',
    //     env: { NODE_ENV: 'production' },
    //     autorestart: true,
    //     time: true,
    // },
};
