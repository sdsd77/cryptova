/* ============================================
   SHIFT_YE - Internationalization (AR / EN)
   data-i18n="key"      → element innerHTML
   data-i18n-text="key" → element textContent
   data-i18n-ph="key"   → input placeholder
   data-i18n-alt="key"  → alt attribute
   data-i18n-aria="key" → aria-label attribute
   ============================================ */

(function (window) {
    'use strict';

    var LS_KEY = 'shift_lang';
    var currentLang = localStorage.getItem(LS_KEY) || 'ar';

    var DICT = {
        // ─── Navigation ───
        'nav.home': { ar: 'الرئيسية', en: 'Home' },
        'nav.crypto': { ar: 'الخدمات الرقمية', en: 'Digital Services' },
        'nav.tech': { ar: 'الخدمات التقنية', en: 'Tech Services' },
        'nav.calc': { ar: 'الحاسبة', en: 'Calculator' },
        'nav.prices': { ar: 'الأسعار', en: 'Prices' },
        'nav.blog': { ar: 'المدونة', en: 'Blog' },
        'nav.faq': { ar: 'الأسئلة الشائعة', en: 'FAQ' },
        'nav.contact': { ar: 'تواصل معنا', en: 'Contact Us' },
        'nav.cta': { ar: 'ابدأ الآن', en: 'Start Now' },
        'nav.brand_html': { ar: 'SHIFT<span class="gold">_YE</span>', en: 'SHIFT<span class="gold">_YE</span>' },
        'nav_menu': { ar: 'القائمة', en: 'Menu' },
        'nav.top': { ar: 'العودة للأعلى', en: 'Back to top' },
        'social.facebook': { ar: 'فيسبوك', en: 'Facebook' },
        'social.twitter': { ar: 'تويتر', en: 'Twitter' },
        'social.instagram': { ar: 'انستغرام', en: 'Instagram' },
        'social.telegram': { ar: 'تيليجرام', en: 'Telegram' },
        'social.youtube': { ar: 'يوتيوب', en: 'YouTube' },

        // ─── Language switcher ───
        'lang.ar': { ar: 'العربية', en: 'Arabic' },
        'lang.en': { ar: 'الإنجليزية', en: 'English' },

        // ─── Hero ───
        'hero.lead': {
            ar: '<span class="hero-lead-highlight">كل ما تحتاجه، في مكان واحد.</span><br>نقدم خدمات تحويل وإيداع العملات الرقمية، وتصميم وتطوير المواقع وتطبيقات الموبايل، وتصميم واجهات وتجارب المستخدم، بالإضافة إلى البطاقات الرقمية وخدمات الألعاب',
            en: '<span class="hero-lead-highlight">Everything you need in one place.</span><br>We provide crypto transfer and deposit services, website and mobile app design and development, UI/UX design, plus digital cards and gaming services.'
        },
        'hero.explore': { ar: 'استكشف خدماتنا', en: 'Explore Our Services' },
        'hero.contact': { ar: 'تواصل معنا', en: 'Contact Us' },
        'hero.identity': { ar: 'هوية SHIFT_YE', en: 'SHIFT_YE identity' },

        // ─── Section headers ───
        'sec.services': { ar: 'خدماتنا', en: 'Our Services' },
        'sec.services_title_part1': { ar: 'حلول', en: 'Integrated' },
        'sec.services_title_part2': { ar: 'متكاملة', en: 'Solutions' },
        'sec.services_sub': { ar: 'نقدم مجموعة شاملة من الخدمات المخصصة لتلبية احتياجاتك في عالم العملات الرقمية والتقنية', en: 'We offer a comprehensive range of tailored services to meet your needs in crypto and technology.' },
        'sec.whyus': { ar: 'لماذا نحن', en: 'Why Us' },
        'sec.whyus_title_part1': { ar: 'المزايا التي', en: 'The Advantages That' },
        'sec.whyus_title_part2': { ar: 'تميزنا', en: 'Set Us Apart' },
        'sec.whyus_sub': { ar: 'نلتزم بأعلى معايير الجودة والأمان لضمان أفضل تجربة لعملائنا', en: 'We uphold the highest quality and security standards to guarantee the best experience for our clients.' },
        'sec.prices': { ar: 'أسعار العملات', en: 'Crypto Prices' },
        'sec.prices_title_part1': { ar: 'أسعار العملات', en: 'Crypto' },
        'sec.prices_title_part2': { ar: 'الرقمية', en: 'Prices' },
        'sec.prices_sub': { ar: 'أسعار مباشرة من الأسواق العالمية تتحدث بشكل فوري', en: 'Live prices from global markets, updating instantly.' },
        'prices.live': { ar: 'أسعار محدثة مباشرة', en: 'Live updated prices' },
        'prices.updating': { ar: 'جاري التحديث...', en: 'Updating...' },
        'prices.updated': { ar: 'آخر تحديث:', en: 'Last updated:' },
        'prices.retry': { ar: 'تعذر الاتصال - إعادة المحاولة...', en: 'Connection failed - retrying...' },
        'prices.all': { ar: 'عرض جدول الأسعار الكامل', en: 'View Full Price Table' },
        'prices.buy_now': { ar: 'اشترِ الآن', en: 'Buy Now' },

        // table headers
        'tbl.currency': { ar: 'العملة', en: 'Currency' },
        'tbl.price': { ar: 'السعر', en: 'Price' },
        'tbl.change': { ar: 'التغيير', en: 'Change' },
        'tbl.action': { ar: 'إجراء', en: 'Action' },
        'tbl.min': { ar: 'الحد الأدنى', en: 'Minimum' },
        'tbl.fee': { ar: 'نسبة العمولة', en: 'Commission' },
        'tbl.speed': { ar: 'سرعة التنفيذ', en: 'Speed' },
        'tbl.buy': { ar: 'شراء', en: 'Buy' },
        'tbl.sell': { ar: 'بيع', en: 'Sell' },

        // ─── Services cards (home) ───
        'svc.buy_sell.title': { ar: 'شراء وبيع العملات الرقمية', en: 'Buy & Sell Cryptocurrencies' },
        'svc.buy_sell.desc': { ar: 'تنفيذ فوري وآمن لعمليات شراء وبيع العملات الرقمية الرئيسية مثل USDT، Bitcoin، Ethereum بأسعار تنافسية', en: 'Instant, secure buying and selling of major cryptocurrencies like USDT, Bitcoin and Ethereum at competitive rates.' },
        'svc.liquidity.title': { ar: 'توفير السيولة للمحافظ', en: 'Wallet Liquidity' },
        'svc.liquidity.desc': { ar: 'تحويل العملات الرقمية من وإلى المحافظ الإلكترونية بسهولة وأمان، مع ضمان سرعة المعالجة', en: 'Move crypto in and out of e-wallets easily and safely, with fast processing guaranteed.' },
        'svc.webdev.title': { ar: 'تطوير المواقع والتطبيقات', en: 'Web & App Development' },
        'svc.webdev.desc': { ar: 'تطوير مواقع ويب وتطبيقات هواتف ذكية بأحدث التقنيات وبتصميم عصري يجذب الزوار', en: 'Building modern, engaging websites and mobile apps with the latest technologies.' },
        'svc.systems.title': { ar: 'أنظمة إدارة متكاملة', en: 'Integrated Management Systems' },
        'svc.systems.desc': { ar: 'تطوير أنظمة ERP وCRM مخصصة لتلبية احتياجات شركتك مع دعم فني مستمر وتحديثات دورية', en: 'Custom ERP and CRM systems for your company with ongoing support and regular updates.' },
        'svc.convert.title': { ar: 'تحويل العملات الرقمية', en: 'Crypto Conversion' },
        'svc.convert.desc': { ar: 'تحويل العملات الرقمية إلى عملات محلية (ريال يمني، دولار) والعكس بأسعار تحديث لحظي', en: 'Convert crypto into local currency (Yemeni Rial, USD) and back with live rates.' },
        'svc.consult.title': { ar: 'استشارات تقنية', en: 'Tech Consulting' },
        'svc.consult.desc': { ar: 'استشارات متخصصة في الحلول الرقمية والتحول الرقمي لمساعدتك في بناء استراتيجية تقنية ناجحة', en: 'Expert consulting on digital solutions and digital transformation to build a winning tech strategy.' },
        'svc.more': { ar: 'اعرف المزيد', en: 'Learn More' },
        'svc.readMore': { ar: 'اقرأ المزيد', en: 'Read More' },
        'svc.request': { ar: 'اطلب الخدمة', en: 'Request Service' },
        'svc.order': { ar: 'طلب الباقة', en: 'Order Package' },

        // ─── Stats ───
        'stat.happy': { ar: 'عميل سعيد', en: 'Happy Clients' },
        'stat.years': { ar: 'سنوات خبرة', en: 'Years of Experience' },
        'stat.projects': { ar: 'مشروع منجز', en: 'Completed Projects' },
        'stat.satisfaction': { ar: 'نسبة الرضا %', en: 'Satisfaction Rate %' },

        // ─── Advantages ───
        'adv.secure.title': { ar: 'أمان وموثوقية', en: 'Secure & Trustworthy' },
        'adv.secure.desc': { ar: 'معاملات رقمية موثوقة، وإجراءات واضحة تضمن لك تجربة آمنة واطمئنانًا في كل تعامل', en: 'Reliable digital transactions and clear procedures for a safe, worry-free experience.' },
        'adv.fast.title': { ar: 'سرعة التنفيذ', en: 'Fast Execution' },
        'adv.fast.desc': { ar: 'نلتزم بسرعة معالجة جميع الطلبات والمعاملات. فريقنا يعمل على مدار الساعة لتلبية احتياجاتك', en: 'We process all requests fast. Our team works around the clock to serve you.' },
        'adv.price.title': { ar: 'أسعار تنافسية', en: 'Competitive Prices' },
        'adv.price.desc': { ar: 'نقدم أفضل الأسعار في السوق مع عمولات منخفضة وشفافية كاملة في جميع المعاملات', en: 'Best market prices with low commissions and full transparency on all transactions.' },
        'adv.support.title': { ar: 'دعم فني متواصل', en: 'Ongoing Support' },
        'adv.support.desc': { ar: 'فريق دعم فني متخصص متاح على مدار الساعة للإجابة على استفساراتكم ومساعدتكم', en: 'A dedicated support team available around the clock for your questions and help.' },
        'adv.exp.title': { ar: 'خبرة واسعة', en: 'Broad Expertise' },
        'adv.exp.desc': { ar: 'فريق من المتخصصين ذوي الخبرة في مجال العملات الرقمية والبرمجة والتقنية', en: 'A team of specialists experienced in crypto, programming and technology.' },
        'adv.custom.title': { ar: 'حلول مخصصة', en: 'Custom Solutions' },
        'adv.custom.desc': { ar: 'نقدم حلولاً تقنية مخصصة تتناسب مع احتياجات كل عميل ومشروعه بطريقة فريدة', en: 'Tailored technical solutions that fit each client and project in a unique way.' },

        // ─── CTA ───
        'cta.title_part1': { ar: 'أنجز معاملاتك الرقمية', en: 'Complete Your Transactions' },
        'cta.title_part2': { ar: 'بكل سهولة', en: 'With Ease' },
        'cta.sub': { ar: 'تواصل معنا لتنفيذ عمليات البيع والشراء والتحويل، أو للاستفسار عن خدمات توفير السيولة', en: 'Contact us for buying, selling and conversion, or to ask about liquidity services.' },
        'cta.free_consult': { ar: 'احصل على استشارة مجانية', en: 'Get a Free Consultation' },
        'cta.whatsapp': { ar: 'تواصل عبر واتساب', en: 'Chat on WhatsApp' },
        'cta.quote': { ar: 'احصل على عرض سعر', en: 'Get a Quote' },
        'cta.free_quote': { ar: 'اطلب عرض سعر مجاني', en: 'Request a Free Quote' },
        'cta.start_now': { ar: 'ابدأ معاملتك الآن', en: 'Start Your Transaction Now' },
        'cta.trade': { ar: 'هل تريد <span class="gold">تنفيذ عملية</span> تداول؟', en: 'Want to <span class="gold">execute a trade</span>?' },
        'cta.trade_sub': { ar: 'تواصل معنا الآن ونوفر لك أفضل سعر وتكلفة تنفيذ', en: 'Contact us now and we\'ll give you the best price and execution cost.' },
        'cta.quote_main': { ar: 'هل تحتاج <span class="gold">عرض سعر</span> مخصص؟', en: 'Need a custom <span class="gold">quote</span>?' },
        'cta.quote_sub': { ar: 'تواصل معنا وسنقدم لك عرضاً مخصصاً يناسب ميزانيتك واحتياجاتك', en: 'Contact us and we\'ll provide a custom quote for your budget and needs.' },
        'cta.idea': { ar: 'هل لديك <span class="gold">مشروع</span> في ذهنك؟', en: 'Have a <span class="gold">project</span> in mind?' },
        'cta.idea_sub': { ar: 'دعنا نساعدك في تحويل فكرتك إلى واقع. تواصل معنا الآن للحصول على عرض سعر مجاني', en: 'Let us turn your idea into reality. Contact us now for a free quote.' },
        'cta.question': { ar: 'لم تجد <span class="gold">إجابتك</span>؟', en: 'Didn\'t find <span class="gold">your answer</span>?' },
        'cta.question_sub': { ar: 'تواصل معنا مباشرة وسنكون سعداء بالإجابة على جميع استفساراتك', en: 'Contact us directly and we\'ll be happy to answer all your questions.' },
        'cta.send_msg': { ar: 'أرسل رسالة', en: 'Send a Message' },
        'cta.subscribe_part1': { ar: 'اشترك في', en: 'Subscribe to Our' },
        'cta.subscribe_part2': { ar: 'نشرتنا البريدية', en: 'Newsletter' },
        'cta.subscribe_sub': { ar: 'احصل على آخر الأخبار والمقالات مباشرة في بريدك', en: 'Get the latest news and articles straight to your inbox.' },
        'cta.subscribe_btn': { ar: 'اشترك', en: 'Subscribe' },
        'cta.subscribe_ph': { ar: 'أدخل بريدك الإلكتروني', en: 'Enter your email' },
        'cta.subscribe_done': { ar: 'تم الاشتراك بنجاح!', en: 'Subscribed successfully!' },

        // ─── Footer ───
        'footer.about.home': { ar: 'نقدم لك حلولاً متكاملة في عالم العملات الرقمية والتقنية.', en: 'We provide complete solutions in the world of crypto and technology.' },
        'footer.about.index': { ar: 'نقدم لك حلولاً متكاملة في عالم العملات الرقمية والتقنية، بخبرة تمتد لسنوات في السوق اليمني والعربي. نلتزم بأعلى معايير الجودة والأمان.', en: 'We deliver end-to-end crypto and tech solutions, with years of experience in the Yemeni and Arab markets. We uphold the highest quality and security standards.' },
        'footer.quick': { ar: 'روابط سريعة', en: 'Quick Links' },
        'footer.services': { ar: 'خدماتنا', en: 'Our Services' },
        'footer.contact': { ar: 'تواصل معنا', en: 'Contact Us' },
        'footer.follow': { ar: 'تابعنا على', en: 'Follow Us On' },
        'footer.location': { ar: 'صنعاء، اليمن', en: 'Sana\'a, Yemen' },
        'footer.rights': { ar: 'جميع الحقوق محفوظة.', en: 'All rights reserved.' },
        'footer.made': { ar: 'صُنع بـ <i class="fas fa-heart" style="color: var(--accent-gold);"></i> في اليمن', en: 'Made with <i class="fas fa-heart" style="color: var(--accent-gold);"></i> in Yemen' },
        'footer.buy_sell': { ar: 'شراء وبيع العملات', en: 'Buy & Sell Crypto' },
        'footer.convert': { ar: 'تحويل العملات الرقمية', en: 'Crypto Conversion' },
        'footer.webdev': { ar: 'تطوير المواقع', en: 'Web Development' },
        'footer.appdev': { ar: 'تطوير التطبيقات', en: 'App Development' },
        'footer.systems': { ar: 'أنظمة إدارة', en: 'Management Systems' },
        'footer.consult': { ar: 'استشارات تقنية', en: 'Tech Consulting' },

        // ─── Page header / breadcrumb ───
        'page.contact.title_part1': { ar: 'تواصل', en: 'Contact' },
        'page.contact.title_part2': { ar: 'معنا', en: 'Us' },
        'page.calc.title_part1': { ar: 'حاسبة', en: 'Currency' },
        'page.calc.title_part2': { ar: 'العملات', en: 'Calculator' },
        'page.crypto.title_part1': { ar: 'الخدمات', en: 'Digital' },
        'page.crypto.title_part2': { ar: 'الرقمية', en: 'Services' },
        'page.tech.title_part1': { ar: 'الخدمات', en: 'Tech' },
        'page.tech.title_part2': { ar: 'التقنية', en: 'Services' },
        'page.pricing.title_part1': { ar: 'الأسعار', en: 'Prices' },
        'page.pricing.title_part2': { ar: 'والباقات', en: '& Packages' },
        'page.faq.title_part1': { ar: 'الأسئلة', en: 'Frequently Asked' },
        'page.faq.title_part2': { ar: 'الشائعة', en: 'Questions' },
        'page.blog.title_part1': { ar: 'المدونة', en: 'Blog' },
        'page.blog.title_part2': { ar: 'والأخبار', en: '& News' },
        'page.bg': { ar: 'خلفية', en: 'Background' },

        // ─── Contact page ───
        'contact.title': { ar: 'أرسل لنا رسالة', en: 'Send Us a Message' },
        'contact.sub': { ar: 'سنرد عليك في أقرب وقت ممكن', en: 'We\'ll reply as soon as possible.' },
        'contact.name': { ar: 'الاسم الكامل', en: 'Full Name' },
        'contact.name_ph': { ar: 'أدخل اسمك', en: 'Enter your name' },
        'contact.email': { ar: 'البريد الإلكتروني', en: 'Email Address' },
        'contact.email_ph': { ar: 'أدخل بريدك الإلكتروني', en: 'Enter your email' },
        'contact.phone': { ar: 'رقم الهاتف', en: 'Phone Number' },
        'contact.service': { ar: 'نوع الخدمة', en: 'Service Type' },
        'contact.choose': { ar: 'اختر الخدمة', en: 'Choose a service' },
        'contact.opt.buy_sell': { ar: 'شراء وبيع العملات الرقمية', en: 'Buy & Sell cryptocurrencies' },
        'contact.opt.convert': { ar: 'تحويل العملات الرقمية', en: 'Crypto conversion' },
        'contact.opt.webdev': { ar: 'تطوير مواقع الويب', en: 'Website development' },
        'contact.opt.appdev': { ar: 'تطوير تطبيقات الهاتف', en: 'Mobile app development' },
        'contact.opt.erp': { ar: 'أنظمة ERP / CRM', en: 'ERP / CRM systems' },
        'contact.opt.consult': { ar: 'استشارات تقنية', en: 'Tech consulting' },
        'contact.opt.other': { ar: 'أخرى', en: 'Other' },
        'contact.message': { ar: 'الرسالة', en: 'Message' },
        'contact.message_ph': { ar: 'اكتب رسالتك هنا...', en: 'Write your message here...' },
        'contact.send': { ar: 'إرسال الرسالة', en: 'Send Message' },
        'contact.phone_label': { ar: 'الهاتف', en: 'Phone' },
        'contact.whatsapp_label': { ar: 'واتساب', en: 'WhatsApp' },
        'contact.email_label': { ar: 'البريد الإلكتروني', en: 'Email' },
        'contact.location': { ar: 'الموقع', en: 'Location' },
        'contact.hours': { ar: 'ساعات العمل', en: 'Working Hours' },
        'contact.hours_val': { ar: '24 ساعة / 7 أيام', en: '24 hours / 7 days' },
        'contact.map': { ar: 'خريطة الموقع', en: 'Site Map' },
        'contact.map_sub': { ar: 'يمكنك إضافة خريطة Google Maps هنا', en: 'You can add a Google Maps embed here.' },

        // ─── Services pages ───
        'svcp.crypto.badge': { ar: 'العملات الرقمية والمعاملات', en: 'Crypto & Transactions' },
        'svcp.crypto.title_part1': { ar: 'حلول متكاملة', en: 'Complete Solutions' },
        'svcp.crypto.title_part2': { ar: 'للمعاملات الرقمية', en: 'for Digital Transactions' },
        'svcp.crypto.sub': { ar: 'نقدم مجموعة شاملة من خدمات العملات الرقمية والمعاملات المالية لتلبية جميع احتياجاتك', en: 'We offer a full range of crypto and financial transaction services to meet all your needs.' },
        'svcp.tech.badge': { ar: 'تطوير البرمجيات والحلول التقنية', en: 'Software Development & Tech Solutions' },
        'svcp.tech.title_part1': { ar: 'حلول تقنية', en: 'Tech Solutions' },
        'svcp.tech.title_part2': { ar: 'تبني مستقبلك', en: 'That Build Your Future' },
        'svcp.tech.sub': { ar: 'فريق من المبرمجين المحترفين لتحويل أفكارك إلى واقع رقمي', en: 'A team of professional developers turning your ideas into digital reality.' },
        'svcp.how': { ar: 'كيف نعمل', en: 'How We Work' },
        'svcp.steps_part1': { ar: 'خطوات', en: 'Simple &' },
        'svcp.steps_part2': { ar: 'بسيطة وسريعة', en: 'Fast Steps' },
        'svcp.techsteps_part1': { ar: 'رحلتك معنا', en: 'Your Journey' },
        'svcp.techsteps_part2': { ar: 'في 4 خطوات', en: 'in 4 Steps' },
        'svcp.step1.title': { ar: 'تواصل معنا', en: 'Contact Us' },
        'svcp.step1.crypto': { ar: 'راسلنا عبر واتساب أو نموذج التواصل وحدد معاملتك', en: 'Message us via WhatsApp or the contact form and specify your transaction.' },
        'svcp.step1.tech': { ar: 'أخبرنا بفكرتك ومتطلبات مشروعك عبر واتساب أو النموذج', en: 'Tell us your idea and project requirements via WhatsApp or the form.' },
        'svcp.step2.title': { ar: 'تأكيد السعر', en: 'Price Confirmation' },
        'svcp.step2.crypto': { ar: 'نؤكد لك السعر الحالي وطريقة التنفيذ بوضوح وشفافية', en: 'We confirm the current price and execution method clearly and transparently.' },
        'svcp.step2.tech': { ar: 'استشارة وعرض سعر', en: 'Consultation & Quote' },
        'svcp.step2.techdesc': { ar: 'نناقش الحل التقني المناسب ونقدم لك عرض سعر مجاناً', en: 'We discuss the right technical solution and provide a free quote.' },
        'svcp.step3.title': { ar: 'تنفيذ المعاملة', en: 'Transaction Execution' },
        'svcp.step3.crypto': { ar: 'ننفذ المعاملة بسرعة وأمان حتى تكتمل العملية', en: 'We execute your transaction quickly and safely until it\'s complete.' },
        'svcp.step3.tech': { ar: 'تطوير وتنفيذ', en: 'Development & Execution' },
        'svcp.step3.techdesc': { ar: 'نطوّر مشروعك مع متابعة مستمرة وضمان للجودة', en: 'We develop your project with ongoing follow-up and quality assurance.' },
        'svcp.step4.title': { ar: 'دعم ومتابعة', en: 'Support & Follow-up' },
        'svcp.step4.crypto': { ar: 'فريقنا متاح دائماً لمساعدتك ومتابعة معاملتك', en: 'Our team is always available to help and follow up on your transaction.' },
        'svcp.step4.tech': { ar: 'تسليم ودعم', en: 'Delivery & Support' },
        'svcp.step4.techdesc': { ar: 'نُسلّم مشروعك جاهزاً مع دعم وصيانة مستمرة', en: 'We deliver your project ready, with ongoing support and maintenance.' },
        'svcp.crypto_cta.title_part1': { ar: 'أنجز معاملاتك الرقمية', en: 'Complete Your Transactions' },
        'svcp.crypto_cta.title_part2': { ar: 'بكل سهولة', en: 'With Ease' },
        'svcp.crypto_cta.sub': { ar: 'تواصل معنا لتنفيذ عمليات البيع والشراء والتحويل بأسعار تنافسية وتنفيذ فوري', en: 'Contact us for buying, selling and conversion with competitive rates and instant execution.' },
        'svcp.loading': { ar: 'جاري تحميل الخدمات...', en: 'Loading services...' },

        // ─── Pricing page ───
        'price.crypto_badge': { ar: 'أسعار العملات الرقمية', en: 'Crypto Rates' },
        'price.title_part1': { ar: 'عمولات', en: 'Crypto' },
        'price.title_part2': { ar: 'العملات الرقمية', en: 'Fees' },
        'price.sub': { ar: 'نقدم أسعاراً تنافسية وشفافة لجميع خدماتنا', en: 'We offer competitive, transparent rates for all our services.' },
        'price.change_note': { ar: 'الأسعار قابلة للتغيير حسب شروط السوق. تواصل معنا للحصول على أحدث الأسعار.', en: 'Prices may change with market conditions. Contact us for the latest rates.' },
        'price.calc_title': { ar: 'احسب معاملتك بسهولة', en: 'Calculate Your Transaction Easily' },
        'price.calc_sub': { ar: 'حوّل بين 11 عملة حسب سعر الصرف في صنعاء وعدن — أسعار مباشرة تحدث تلقائياً كل 30 دقيقة.', en: 'Convert between 11 currencies at exchange rates for Sana\'a and Aden — live rates that refresh automatically every 30 minutes.' },
        'price.open_calc': { ar: 'فتح حاسبة العملات', en: 'Open Currency Calculator' },
        'price.packages_badge': { ar: 'باقات البرمجة', en: 'Development Packages' },
        'price.packages_title_part1': { ar: 'باقات', en: 'Project' },
        'price.packages_title_part2': { ar: 'تطوير المشاريع', en: 'Development Packages' },
        'price.packages_sub': { ar: 'اختر الباقة المناسبة لاحتياجاتك وميزانيتك', en: 'Choose the right package for your needs and budget.' },
        'price.packages_loading': { ar: 'جاري تحميل الباقات...', en: 'Loading packages...' },
        'price.approx_note': { ar: 'جميع الأسعار تقريبية. يرجى التواصل معنا للحصول على عرض سعر مخصص يناسب احتياجاتك.', en: 'All prices are approximate. Please contact us for a custom quote tailored to your needs.' },

        // ─── FAQ page ───
        'faq.crypto_badge': { ar: 'العملات الرقمية', en: 'Cryptocurrencies' },
        'faq.crypto_title_part1': { ar: 'أسئلة عن', en: 'Crypto' },
        'faq.crypto_title_part2': { ar: 'العملات الرقمية', en: 'Questions' },
        'faq.tech_badge': { ar: 'البرمجة والمشاريع', en: 'Development & Projects' },
        'faq.tech_title_part1': { ar: 'أسئلة عن', en: 'Tech' },
        'faq.tech_title_part2': { ar: 'الخدمات التقنية', en: 'Service Questions' },
        'faq.general_badge': { ar: 'عام', en: 'General' },
        'faq.general_title_part1': { ar: 'أسئلة', en: 'General' },
        'faq.general_title_part2': { ar: 'عامة', en: 'Questions' },

        // ─── Calculator ───
        'calc.badge': { ar: 'أداة التحويل', en: 'Conversion Tool' },
        'calc.title_part1': { ar: 'حوّل بين', en: 'Convert Between' },
        'calc.title_part2': { ar: '11 عملة', en: '11 Currencies' },
        'calc.title_part3': { ar: 'في ثوانٍ', en: 'in Seconds' },
        'calc.sub': { ar: 'أسعار محدثة تلقائياً لصنعاء وعدن مع إمكانية التحويل بين العملات الرقمية والعربية والعالمية', en: 'Auto-updated rates for Sana\'a and Aden with conversion between crypto, Arab and world currencies.' },
        'calc.convert': { ar: 'تحويل العملات', en: 'Currency Conversion' },
        'calc.region_label': { ar: 'سعر الصرف', en: 'Exchange Rate' },
        'calc.sanaa': { ar: 'صنعاء والشمال', en: 'Sana\'a & North' },
        'calc.aden': { ar: 'عدن والجنوب', en: 'Aden & South' },
        'calc.sanaa_short': { ar: 'صنعاء', en: 'Sana\'a' },
        'calc.aden_short': { ar: 'عدن', en: 'Aden' },
        'calc.amount': { ar: 'المبلغ', en: 'Amount' },
        'calc.send': { ar: 'أنا أرسل', en: 'I Send' },
        'calc.receive': { ar: 'أستلم', en: 'I Receive' },
        'calc.grp_crypto': { ar: 'عملات رقمية', en: 'Crypto' },
        'calc.grp_arab': { ar: 'العملات العربية', en: 'Arab Currencies' },
        'calc.grp_world': { ar: 'عملات عالمية', en: 'World Currencies' },
        'calc.yer': { ar: 'ريال يمني', en: 'Yemeni Rial' },
        'calc.sar': { ar: 'ريال سعودي', en: 'Saudi Riyal' },
        'calc.omr': { ar: 'ريال عماني', en: 'Omani Rial' },
        'calc.kwd': { ar: 'دينار كويتي', en: 'Kuwaiti Dinar' },
        'calc.aed': { ar: 'درهم إماراتي', en: 'Emirati Dirham' },
        'calc.egp': { ar: 'جنيه مصري', en: 'Egyptian Pound' },
        'calc.jod': { ar: 'دينار أردني', en: 'Jordanian Dinar' },
        'calc.usd': { ar: 'دولار أمريكي', en: 'US Dollar' },
        'calc.eur': { ar: 'يورو', en: 'Euro' },
        'calc.try': { ar: 'ليرة تركية', en: 'Turkish Lira' },
        'calc.cny': { ar: 'يوان صيني', en: 'Chinese Yuan' },
        'calc.swap': { ar: 'عكس الوجهة', en: 'Swap Direction' },
        'calc.rate_note': { ar: 'جاري تحميل سعر الصرف...', en: 'Loading exchange rate...' },
        'calc.submit': { ar: 'احسب المبلغ', en: 'Calculate Amount' },
        'calc.result': { ar: 'المبلغ المحول', en: 'Converted Amount' },
        'calc.market_prices': { ar: 'أسعار السوق المباشرة', en: 'Live Market Prices' },
        'calc.live': { ar: 'مباشر', en: 'Live' },
        'calc.loading': { ar: 'جاري تحميل الأسعار', en: 'Loading rates' },
        'rate.cny': { ar: 'يوان صيني', en: 'Chinese Yuan' },
        'rate.try': { ar: 'ليرة تركية', en: 'Turkish Lira' },
        // Unit footnote line
        'calc.footnote_hint': { ar: 'السعر الذي تحصل عليه عند بيعك', en: 'the price you get when selling' },
        'calc.footnote_hint2': { ar: 'السعر الذي تدفعه عند شرائك', en: 'the price you pay when buying' },
        'calc.footnote_note': { ar: 'تُحدَّث الأسعار تلقائياً كل 30 دقيقة حسب السوق في كل منطقة.', en: 'Rates update automatically every 30 minutes based on the market in each region.' },
        // Currency code → full localized name for rates table
        'rate.name.usd': { ar: 'دولار أمريكي', en: 'US Dollar' },
        'rate.name.sar': { ar: 'ريال سعودي', en: 'Saudi Riyal' },
        'rate.name.aed': { ar: 'درهم إماراتي', en: 'UAE Dirham' },
        'rate.name.omr': { ar: 'ريال عماني', en: 'Omani Rial' },
        'rate.name.kwd': { ar: 'دينار كويتي', en: 'Kuwaiti Dinar' },
        'rate.name.jod': { ar: 'دينار أردني', en: 'Jordanian Dinar' },
        'rate.name.egp': { ar: 'جنيه مصري', en: 'Egyptian Pound' },
        'rate.name.eur': { ar: 'يورو', en: 'Euro' },
        'rate.name.try': { ar: 'ليرة تركية', en: 'Turkish Lira' },
        'rate.name.cny': { ar: 'يوان صيني', en: 'Chinese Yuan' },
        'calc.market_price': { ar: 'سعر السوق', en: 'Market Price' },
        'calc.loading_rates': { ar: 'جاري تحميل الأسعار', en: 'Loading rates' },
        'calc.invalid_amount': { ar: 'الرجاء إدخال مبلغ صحيح', en: 'Please enter a valid amount.' },
        'calc.yer_unit': { ar: 'ر.ي', en: 'YER' },
        'rate.name.usd': { ar: 'دولار أمريكي', en: 'US Dollar' },
        'rate.name.sar': { ar: 'ريال سعودي', en: 'Saudi Riyal' },
        'rate.name.aed': { ar: 'درهم إماراتي', en: 'UAE Dirham' },
        'rate.name.omr': { ar: 'ريال عماني', en: 'Omani Rial' },
        'rate.name.kwd': { ar: 'دينار كويتي', en: 'Kuwaiti Dinar' },
        'rate.name.jod': { ar: 'دينار أردني', en: 'Jordanian Dinar' },
        'rate.name.egp': { ar: 'جنيه مصري', en: 'Egyptian Pound' },
        'rate.name.eur': { ar: 'يورو', en: 'Euro' },
        'rate.name.try': { ar: 'ليرة تركية', en: 'Turkish Lira' },
        'rate.name.cny': { ar: 'يوان صيني', en: 'Chinese Yuan' },
        'rate.market': { ar: 'سعر السوق العالمي', en: 'Global Market Price' },
        'rate.market2': { ar: 'سعر السوق', en: 'Market Price' },

        // ─── Blog ───
        'blog.filter.all': { ar: 'الكل', en: 'All' },
        'blog.filter.crypto': { ar: 'العملات الرقمية', en: 'Crypto' },
        'blog.filter.tech': { ar: 'التقنية', en: 'Tech' },
        'blog.filter.tips': { ar: 'نصائح', en: 'Tips' },
        'blog.filter.news': { ar: 'أخبار السوق', en: 'Market News' },
        'blog.filter.general': { ar: 'عام', en: 'General' },
        'blog.date_unknown': { ar: 'تاريخ غير محدد', en: 'Unknown date' },
        'blog.time.now': { ar: 'الآن', en: 'now' },
        'blog.loading': { ar: 'جاري تحميل المقالات...', en: 'Loading articles...' },
        'blog.empty': { ar: 'لا توجد مقالات في هذا التصنيف حالياً.', en: 'No articles in this category right now.' },
        'blog.err': { ar: 'تعذر تحميل المقالات. يرجى المحاولة لاحقاً.', en: 'Failed to load articles. Please try again later.' },
        'blog.category.general': { ar: 'عام', en: 'General' },
        'blog.back': { ar: 'عودة إلى المدونة', en: 'Back to Blog' },
        'blog.loading_post': { ar: 'جاري تحميل المقال...', en: 'Loading article...' },
        'blog.notfound_title': { ar: 'المقال غير موجود', en: 'Article Not Found' },
        'blog.notfound_desc': { ar: 'عذراً، لم نتمكن من العثور على هذا المقال.', en: 'Sorry, we couldn\'t find this article.' },
        'blog.back_btn': { ar: 'العودة إلى المدونة', en: 'Back to Blog' },
        'blog.source_label': { ar: 'المصدر الأصلي:', en: 'Original Source:' },
        'blog.view_original': { ar: 'عرض المقال الأصلي', en: 'View Original Article' },
        'blog.more_posts': { ar: 'المزيد من المقالات', en: 'More Articles' },
        'blog.related_part1': { ar: 'مقالات', en: 'Related' },
        'blog.related_part2': { ar: 'ذات صلة', en: 'Articles' },

        // ─── Contact/email placeholders ───
        'email.sending': { ar: 'جاري تجهيز الرسالة...', en: 'Preparing message...' },
        'email.toast': { ar: 'تم فتح برنامج بريدك — اضغط "إرسال" هناك، ويُحفظ نسخة احتياطية من رسالتك هنا', en: 'Your email app opened — press "Send" there; a backup copy is saved here.' },
        'email.subject': { ar: 'رسالة جديدة من موقع SHIFT_YE', en: 'New message from SHIFT_YE website' },
        'email.name': { ar: 'الاسم:', en: 'Name:' },
        'email.email': { ar: 'البريد الإلكتروني:', en: 'Email:' },
        'email.phone': { ar: 'رقم الهاتف:', en: 'Phone:' },
        'email.service': { ar: 'الخدمة المطلوبة:', en: 'Requested service:' },

        // ─── Dynamic: notifications / rates labels ───
        'rate.sanaa_area': { ar: 'صنعاء والمحافظات الشمالية', en: 'Sana\'a & northern governorates' },
        'rate.aden_area': { ar: 'عدن والمحافظات الجنوبية', en: 'Aden & southern governorates' },
        'rate.manual': { ar: 'تعديل يدوي', en: 'manual edit' },
        'rate.live': { ar: 'سعر السوق', en: 'market price' },
        'rate.approx': { ar: 'سعر تقريبي', en: 'approximate rate' },
        'rate.usd_of': { ar: 'دولار', en: 'USD' },
        'rate.loading': { ar: 'جاري تحميل سعر الصرف...', en: 'Loading exchange rate...' },
        'xmr': { ar: ' (XMR)', en: ' (XMR)' },

        // ─── Rate names (calculator/o calculator tables) ───
        'rate.name.usd': { ar: 'دولار أمريكي', en: 'US Dollar' },
        'rate.name.sar': { ar: 'ريال سعودي', en: 'Saudi Riyal' },
        'rate.name.aed': { ar: 'درهم إماراتي', en: 'UAE Dirham' },
        'rate.name.omr': { ar: 'ريال عماني', en: 'Omani Rial' },
        'rate.name.kwd': { ar: 'دينار كويتي', en: 'Kuwaiti Dinar' },
        'rate.name.jod': { ar: 'دينار أردني', en: 'Jordanian Dinar' },
        'rate.name.egp': { ar: 'جنيه مصري', en: 'Egyptian Pound' },
        'rate.name.eur': { ar: 'يورو', en: 'Euro' },
        'rate.name.try': { ar: 'ليرة تركية', en: 'Turkish Lira' },
        'rate.name.cny': { ar: 'يوان صيني', en: 'Chinese Yuan' },
        'rate.cname': { ar: 'سعر السوق العالمي', en: 'Global Market Price' },
        'rate.grp_crypto': { ar: 'عملات رقمية', en: 'Crypto' },
        'rate.grp_arab': { ar: 'العملات العربية', en: 'Arab Currencies' },
        'rate.grp_world': { ar: 'عملات عالمية', en: 'World Currencies' },

        // ─── Crypto services page (extra static) ───
        'svcp.crypto.intro_badge': { ar: 'العملات الرقمية والمعاملات', en: 'Crypto & Transactions' },
        'svcp.crypto.intro_part1': { ar: 'حلول متكاملة', en: 'Complete Solutions' },
        'svcp.crypto.intro_part2': { ar: 'للمعاملات الرقمية', en: 'for Digital Transactions' },
        'svcp.crypto.title_html': { ar: 'حلول متكاملة <span class="gold">للمعاملات الرقمية</span>', en: 'Complete Solutions <span class="gold">for Digital Transactions</span>' },
        'svcp.crypto.sub': { ar: 'نقدم مجموعة شاملة من خدمات العملات الرقمية والمعاملات المالية لتلبية جميع احتياجاتك', en: 'We offer a full range of crypto and financial services to meet all your needs.' },
        'svcp.crypto.loading': { ar: 'جاري تحميل الخدمات...', en: 'Loading services...' },
        'svcp.tech.intro_badge': { ar: 'تطوير البرمجيات والحلول التقنية', en: 'Software & Tech Solutions' },
        'svcp.tech.intro_part1': { ar: 'حلول تقنية', en: 'Tech Solutions' },
        'svcp.tech.intro_part2': { ar: 'تبني مستقبلك', en: 'That Build Your Future' },
        'svcp.tech.sub': { ar: 'فريق من المبرمجين المحترفين لتحويل أفكارك إلى واقع رقمي', en: 'A team of professional developers turning your ideas into reality.' },
        'svcp.tech.loading': { ar: 'جاري تحميل الخدمات...', en: 'Loading services...' },
        // ─── Process steps (services pages) ───
        'svcp.proc_title_part1': { ar: 'خطوات', en: 'Simple &' },
        'svcp.proc_title_part2': { ar: 'بسيطة وسريعة', en: 'Fast Steps' },
        'svcp.proc_step1.t': { ar: 'تواصل معنا', en: 'Contact Us' },
        'svcp.proc_step1.p': { ar: 'راسلنا عبر واتساب أو نموذج التواصل وحدد معاملتك', en: 'Reach us via WhatsApp or the contact form and specify your transaction.' },
        'svcp.proc_step2.t': { ar: 'تأكيد السعر', en: 'Price Confirmation' },
        'svcp.proc_step2.p': { ar: 'نؤكد لك السعر الحالي وطريقة التنفيذ بوضوح وشفافية', en: 'We confirm the current price and execution method clearly and transparently.' },
        'svcp.proc_step3.t': { ar: 'تنفيذ المعاملة', en: 'Transaction Execution' },
        'svcp.proc_step3.p': { ar: 'ننفذ المعاملة بسرعة وأمان حتى تكتمل العملية', en: 'We execute the transaction quickly and safely until completion.' },
        'svcp.proc_step4.t': { ar: 'دعم ومتابعة', en: 'Support & Follow-up' },
        'svcp.proc_step4.p': { ar: 'فريقنا متاح دائماً لمساعدتك ومتابعة معاملتك', en: 'Our team is always available to help and follow up.' },
        // ─── Tech services page: how we work (different steps) ───
        'svcp.tech.proc_step1.t': { ar: 'تواصل معنا', en: 'Contact Us' },
        'svcp.tech.proc2.t': { ar: 'استشارة وعرض سعر', en: 'Consultation & Quote' },
        'svcp.tech.proc3.t': { ar: 'تطوير وتنفيذ', en: 'Development & Execution' },
        'svcp.tech.proc4.t': { ar: 'تسليم ودعم', en: 'Delivery & Support' },
        'svcp.tech.wh_title_part1': { ar: 'رحلتك معنا', en: 'Your Journey' },
        'svcp.tech.wh_title_part2': { ar: 'في 4 خطوات', en: 'in 4 Steps' },
        'svcp.steps.step': { ar: 'خطوة', en: 'Step' },
        'footer.quick_links': { ar: 'روابط سريعة', en: 'Quick Links' },
        'footer.contact_title': { ar: 'تواصل معنا', en: 'Contact Us' },
    };

    var DEFAULT_DIRS = { ar: 'rtl', en: 'ltr' };

    function getValue(key) {
        var entry = DICT[key];
        if (!entry) return null;
        return currentLang === 'en' ? entry.en : entry.ar;
    }

    function applyToNode(root) {
        root = root || document;

        // innerHTML-based (allows nested gold spans)
        var els = root.querySelectorAll('[data-i18n]');
        for (var i = 0; i < els.length; i++) {
            var el = els[i];
            var key = el.getAttribute('data-i18n');
            var val = getValue(key);
            if (val !== null && el.innerHTML !== val) el.innerHTML = val;
        }

        // textContent-based
        var texts = root.querySelectorAll('[data-i18n-text]');
        for (var j = 0; j < texts.length; j++) {
            var tel = texts[j];
            var tkey = tel.getAttribute('data-i18n-text');
            var tval = getValue(tkey);
            if (tval !== null && tel.textContent !== tval) tel.textContent = tval;
        }

        // placeholders
        var phs = root.querySelectorAll('[data-i18n-ph]');
        for (var k = 0; k < phs.length; k++) {
            var pel = phs[k];
            var pkey = pel.getAttribute('data-i18n-ph');
            var pval = getValue(pkey);
            if (pval !== null && pel.getAttribute('placeholder') !== pval) pel.setAttribute('placeholder', pval);
        }

        // alt
        var alts = root.querySelectorAll('[data-i18n-alt]');
        for (var m = 0; m < alts.length; m++) {
            var ael = alts[m];
            var akey = ael.getAttribute('data-i18n-alt');
            var aval = getValue(akey);
            if (aval !== null && ael.getAttribute('alt') !== aval) ael.setAttribute('alt', aval);
        }

        // aria-label
        var arias = root.querySelectorAll('[data-i18n-aria]');
        for (var n = 0; n < arias.length; n++) {
            var nel = arias[n];
            var nkey = nel.getAttribute('data-i18n-aria');
            var nval = getValue(nkey);
            if (nval !== null && nel.getAttribute('aria-label') !== nval) nel.setAttribute('aria-label', nval);
        }

        // title attribute
        var titles = root.querySelectorAll('[data-i18n-title]');
        for (var o = 0; o < titles.length; o++) {
            var tel0 = titles[o];
            var tkey0 = tel0.getAttribute('data-i18n-title');
            var tval0 = getValue(tkey0);
            if (tval0 !== null && tel0.getAttribute('title') !== tval0) tel0.setAttribute('title', tval0);
        }

        // label attribute (optgroup etc.)
        var labels = root.querySelectorAll('[data-i18n-label]');
        for (var p = 0; p < labels.length; p++) {
            var lel = labels[p];
            var lkey = lel.getAttribute('data-i18n-label');
            var lval = getValue(lkey);
            if (lval !== null && lel.getAttribute('label') !== lval) lel.setAttribute('label', lval);
        }
    }

    function applyAll() {
        applyToNode(document);
        window.dispatchEvent(new CustomEvent('shift:i18n', { detail: { lang: currentLang } }));
    }

    function setLang(lang) {
        if (lang !== 'ar' && lang !== 'en') lang = 'ar';
        currentLang = lang;
        try { localStorage.setItem(LS_KEY, lang); } catch (e) {}
        document.documentElement.setAttribute('lang', lang);
        document.documentElement.setAttribute('dir', DEFAULT_DIRS[lang]);
        syncToggle();
        applyAll();
    }

    function getLang() { return currentLang; }

    function t(key) {
        var val = getValue(key);
        return val === null ? key : val;
    }

    // ─── Language toggle button ───
    function toggleLang() {
        setLang(currentLang === 'ar' ? 'en' : 'ar');
    }

    function syncToggle() {
        var btn = document.getElementById('langToggle');
        if (!btn) return;
        var label = currentLang === 'ar' ? 'EN' : 'عربي';
        btn.textContent = label;
        btn.setAttribute('aria-label', getLang() === 'ar' ? t('nav_menu') : 'Switch language');
    }

    function injectToggle() {
        var actions = document.querySelector('.navbar-actions');
        if (!actions) return;
        var btn = document.createElement('button');
        btn.id = 'langToggle';
        btn.type = 'button';
        btn.className = 'lang-toggle';
        btn.setAttribute('aria-label', 'Switch language');
        btn.addEventListener('click', toggleLang);
        actions.insertBefore(btn, actions.firstChild);
        syncToggle();
    }

    // ─── Init ───
    function init() {
        document.documentElement.setAttribute('lang', currentLang);
        document.documentElement.setAttribute('dir', DEFAULT_DIRS[currentLang]);
        injectToggle();
        applyAll();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.I18N = {
        t: t,
        getLang: getLang,
        setLang: setLang,
        toggle: toggleLang,
        apply: applyAll,
        applyToNode: applyToNode,
        dict: DICT,
    };
})(window);