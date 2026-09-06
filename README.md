# Cryptova — موقع شركة كريبتوفا

موقع عربي (RTL) بتصميم داكن (كحلي + ذهبي) يعرض أسعار العملات الرقمية مباشرة ويوفر
نموذج تواصل، مع لوحة تحكم خاصة لحفظ الرسائل.

## المميزات
- أسعار كل العملات (BTC/ETH/BNB/SOL/XRP/USDT) معروضة مباشرة من CoinGecko ثم Binance (احتياطي).
- حاسبة التحويل USD → YER بسعر ثابت 530.
- نموذج تواصل يعتمد **Mailto** (يفتح بريد الزائر مباشرة) مع نسخة احتياطية تُحفظ محلياً
  — لا يحتاج سيرفر بريد ولا App Password.
- لوحة تحكم محمية بكلمة مرور، جلسات بمهلة انتهاء، سجلات رسائل دائمة.
- **مدونة تلقائية** تجلب أخبار العملات الرقمية والتقنية من RSS feeds يومياً (3-5 مقالات)
  - مقالات محفوظة في `backend/data/posts.json`
  - تصنيف تلقائي (عملات/تقنية/نصائح/أخبار السوق)
  - ترجمة الكلمات المفتاحية للعربية + اكتشاف التكرار تلقائياً
  - صفحة تفاصيل لكل مقال (`pages/blog-post.html`)
  - فلترة + ترقيم صفحات من الخادم (`/api/blog/posts`)

## المتطلبات
- Node.js **18+** (يُفضَّل 20/22) — `npm install` في مجلد `backend`.

## التشغيل

```bash
cd backend
npm install
cp .env.example .env   # عدّل الملف وضع ADMIN_PASSWORD قوية
npm start              # أو: node server.js
```

افتح `http://localhost:3000`. لوحة التحكم (المسار السري): `http://localhost:3000/control-7hIphN4syS_u` (يُحدد عبر `ADMIN_PATH` في `.env`).

> **مهم:** بدون `ADMIN_PASSWORD` لن يعمل تسجيل الدخول للوحة التحكم أبداً (الأمان افتراضياً صارم).

## النشر على Render.com (مجاني — جميع المزايا تعمل)

يستخدم المشروع **PostgreSQL مجانيًا من Render** لحفظ كل شيء (الرسائل، المحتوى، المقالات،
حسابات المدير) بشكل دائم حتى بعد إعادة النشر. محليًا (بدون `DATABASE_URL`) يرجع تلقائيًا
للملفات JSON الأصلية.

### الخطوات

1. **أنشئ مستودع GitHub خاص** وارفعه المشروع (يوجد `.gitignore` يحذف `.env` والملفات الحساسة).
2. في [render.com](https://render.com) → **New** → **Blueprint** → اختر المستودع.
   - البلوبريت `render.yaml` ينشئ تلقائيًا: **Web Service** + **PostgreSQL مجاني** ويربط `DATABASE_URL`.
3. بعد الإنشاء، افتح **Environment Variables** للـ Web Service وأضف:
   - `ADMIN_USER=admin`
   - `ADMIN_PASSWORD=<كلمة مرور قوية>`
   - `ADMIN_PATH=/control-حروف-سرية`
4. اضغط **Manual Deploy** → **Deploy latest commit**.
5. افتح الرابط `https://cryptova.onrender.com` (الاسم حسب اختيارك).

> ملاحظات حول الخطة المجانية:
> - السيرفر "ينام" بعد 15 دقيقة بدون زيارات ويعود خلال ~60 ثانية عند أول طلب.
> - المدونة تجلب الأخبار عند **زيارة صفحة المدونة** (كل 30 دقيقة على الأقل) بدل جدولة
>   24/7 على الخطة المجانية — المقالات تبقى محفوظة في قاعدة البيانات.
> - أول 750 ساعة تشغيل شهريًا مجانية (تستيقظ وتنام، لذا عمليًا لا تُستهلك).

## النشر على استضافة رسمية (VPS / Nginx)

1) ارفع المشروع (باستثناء `node_modules`، `backend/.env`، `backend/data` — فهي تُنشأ على الخادم).
2) على الخادم: `cd backend && npm install --omit=dev`.
3) أنشئ `.env` (يفضل أن تنسخ `.env.example` وتعالج القيم):
   - `ADMIN_PASSWORD=` — كلمة مرور لوحة التحكم (إلزامي).
   - `PORT=3000` و `HOST=0.0.0.0`.
   - إذا كان السيرفر خلف Nginx/Caddy مع SSL:
     `HTTPS=1` و `TRUST_PROXY=1`.
4) إدارة العملية — PM2 (موصى به):

```bash
npm i -g pm2
cd backend
pm2 start ecosystem.config.js
pm2 save && pm2 startup   # ليعمل بعد إعادة تشغيل الخادم
```

5) إعداد Nginx كوكيل عكسي:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

6) شهادة SSL عبر `certbot --nginx` (ستعمل تلقائياً مع `HTTPS=1`).

## الأمان المضمّن
- رفض الوصول لـ `/backend` و `/node_modules` و `/.git` و `/.env` (بما فيها عناوين URL المشفّرة).
- خدمة الملفات الثابتة عبر قائمة بيضاء فقط (`css/js/images`).
- CSP + حماية من النقر + منع التضمين (X-Frame-Options) + HSTS اختياري.
- تقييد الطلبات: 10 رسائل/دقيقة للزائر، 5 محاولات/دقيقة لتسجيل الدخول.
- تعقيم كامل لإدخالات النموذج وترميز XSS في لوحة التحكم، حد 50KB للجسم.
- الرموز ممتدة عشوائياً، الجلسة تنتهي بالوقت، وزر تسجيل خروج يبطلها فعلياً.

## بنية المشروع
```
index.html               الصفحة الرئيسية
css/                     التصميم + fontawesome (نسخة محلية)
js/main.js               الأسعار الحية، الحاسبة، نموذج التواصل
js/blog.js               تحميل المقالات ديناميكياً (توصيل المدونة بالـ API)
pages/                   الصفحات الفرعية (خدمات، تواصل، مدونة، تفاصيل مقال...)
dashboard/               لوحة تحكم الرسائل
backend/
  server.js              خادم Express (أمان، واجهات برمجة، حفظ الرسائل، مدونة)
  rss-fetcher.js         محرك جلب أخبار RSS وتصنيفها وترجمتها
  scheduler.js           مجدول تشغيل الجلب تلقائياً
  ecosystem.config.js    إعداد PM2 (سيرفر + مجدول المدونة)
  .env                   إعداداتك (لا ترفعه! والمجلد data/ أيضاً مستثنى)
  data/contacts.json     الرسائل المخزنة (لا تُرفع — تُنشأ تلقائياً)
  data/posts.json        مقالات المدونة (الـ 6 اليدوية الأولى + التلقائية)
```

## المدونة التلقائية
- **المصادر:** CoinTelegraph، CoinDesk، CryptoNews، CoinGape، BeInCrypto، CryptoPotato، TechCrunch، The Verge، Wired.
- **الجدولة:** يبدأ الجلب فور تشغيل السيرفر، ثم كل 24 ساعة (قابل للتخصيص عبر `BLOG_FETCH_INTERVAL_HOURS`).
- **العدد:** 3-5 مقالات جديدة في كل جولة (`BLOG_POSTS_PER_RUN`).
- **مفاتيح التخصيص في `.env`:**
  - `BLOG_FETCH_INTERVAL_HOURS=24` — الفاصل الزمني بالساعات.
  - `BLOG_POSTS_PER_RUN=5` — عدد المقالات لكل جولة.
  - `BLOG_SCHEDULER=0` — لإيقاف الجدولة (الجمع فقط يدوياً عند الحاجة).
- **جلب يدوي:** `POST /api/blog/fetch` (محمي بتسجيل دخول المدير) يعمل في الخلفية دون تعليق الاتصال.
- **الواجهات الأمامية:** صفحة التفاصيل تعمل بالـ slug، والترقيم والفلترة تعمل عبر الخادم.

## بيانات حساسة لا تُرفع للاستضافة
- `backend/.env` (كلمات المرور)
- `backend/data/` (رسائل العملاء + مقالات المدونة)
- `node_modules/` (تُثبَّت على الخادم بـ npm install)