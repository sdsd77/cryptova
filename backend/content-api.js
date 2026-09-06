const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { dbModule } = require('./db');

const DATA_DIR = path.join(__dirname, 'data');
const CONTENT_FILE = path.join(DATA_DIR, 'content.json');

const DEFAULT_CONTENT = {
  services: [],
  pricing: { cryptoRates: [], packages: [] },
  faq: [],
};

async function loadContent() {
  const c = await dbModule.getContent();
  return {
    services: Array.isArray(c.services) ? c.services : [],
    pricing: c.pricing || { cryptoRates: [], packages: [] },
    faq: Array.isArray(c.faq) ? c.faq : [],
  };
}

async function saveContent(content) {
  await dbModule.saveContent(content);
}

function genId(prefix) {
  return prefix + '-' + crypto.randomBytes(4).toString('hex');
}

function escHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[ch]);
}

function setupContentRoutes(app, requireAdmin, upload) {

  // ─── PUBLIC READ ───

  app.get('/api/content/services', async (req, res) => {
    try {
      const content = await loadContent();
      const category = req.query.category;
      let services = content.services.filter(s => s.visible !== false);
      if (category) services = services.filter(s => s.category === category);
      services.sort((a, b) => (a.order || 999) - (b.order || 999));
      res.json({ success: true, data: services });
    } catch (err) {
      res.status(500).json({ success: false, message: 'خطأ في تحميل الخدمات' });
    }
  });

  app.get('/api/content/pricing', async (req, res) => {
    try {
      const content = await loadContent();
      res.json({ success: true, data: content.pricing });
    } catch (err) {
      res.status(500).json({ success: false, message: 'خطأ في تحميل الأسعار' });
    }
  });

  app.get('/api/content/faq', async (req, res) => {
    try {
      const content = await loadContent();
      let faq = content.faq;
      const category = req.query.category;
      if (category) faq = faq.filter(f => f.category === category);
      faq.sort((a, b) => (a.order || 999) - (b.order || 999));
      res.json({ success: true, data: faq });
    } catch (err) {
      res.status(500).json({ success: false, message: 'خطأ في تحميل الأسئلة' });
    }
  });

  app.get('/api/content/all', async (req, res) => {
    try {
      const content = await loadContent();
      content.services.sort((a, b) => (a.order || 999) - (b.order || 999));
      content.faq.sort((a, b) => (a.order || 999) - (b.order || 999));
      res.json({ success: true, data: content });
    } catch (err) {
      res.status(500).json({ success: false, message: 'خطأ في تحميل المحتوى' });
    }
  });

  // ─── IMAGE UPLOAD ───

  app.post('/api/content/upload', requireAdmin, (req, res, next) => {
    upload.single('image')(req, res, (err) => {
      if (err) {
        return res.status(400).json({ success: false, message: err.message || 'خطأ في رفع الملف' });
      }
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'لم يتم اختيار ملف' });
      }
      const url = '/images/' + req.file.filename;
      res.json({ success: true, url, filename: req.file.filename });
    });
  });

  app.get('/api/content/images', requireAdmin, (req, res) => {
    try {
      const imagesDir = path.join(__dirname, '..', 'images');
      if (!fs.existsSync(imagesDir)) return res.json({ success: true, data: [] });
      const files = fs.readdirSync(imagesDir).filter(f => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f));
      const images = files.map(f => ({
        name: f,
        url: '/images/' + f,
        size: fs.statSync(path.join(imagesDir, f)).size,
      }));
      res.json({ success: true, data: images });
    } catch (err) {
      res.status(500).json({ success: false, message: 'خطأ في تحميل الصور' });
    }
  });

  // ─── SERVICES CRUD ───

  app.get('/api/content/services/all', requireAdmin, async (req, res) => {
    try {
      const content = await loadContent();
      content.services.sort((a, b) => (a.order || 999) - (b.order || 999));
      res.json({ success: true, data: content.services });
    } catch (err) {
      res.status(500).json({ success: false, message: 'خطأ' });
    }
  });

  app.post('/api/content/services', requireAdmin, async (req, res) => {
    try {
      const body = req.body || {};
      const id = genId(body.category === 'tech' ? 'tech' : 'crypto');
      const service = {
        id,
        category: ['crypto', 'tech'].includes(body.category) ? body.category : 'crypto',
        title: String(body.title || '').trim().slice(0, 150),
        description: String(body.description || '').trim().slice(0, 1000),
        features: Array.isArray(body.features) ? body.features.map(f => String(f).trim().slice(0, 100)).filter(Boolean) : [],
        icon: String(body.icon || 'fa-star').trim().slice(0, 50),
        image: String(body.image || '').trim(),
        order: parseInt(body.order, 10) || 999,
        visible: body.visible !== false,
      };
      if (!service.title) return res.status(400).json({ success: false, message: 'العنوان مطلوب' });
      const content = await loadContent();
      content.services.push(service);
      await saveContent(content);
      res.json({ success: true, data: service });
    } catch (err) {
      res.status(500).json({ success: false, message: 'خطأ في إضافة الخدمة' });
    }
  });

  app.put('/api/content/services/reorder', requireAdmin, async (req, res) => {
    try {
      const body = req.body || {};
      const ids = Array.isArray(body.ids) ? body.ids : [];
      if (ids.length === 0) return res.status(400).json({ success: false, message: 'قائمة فارغة' });
      const content = await loadContent();
      const svcMap = new Map(content.services.map(s => [s.id, s]));
      ids.forEach((id, i) => {
        const svc = svcMap.get(id);
        if (svc) svc.order = i + 1;
      });
      content.services.sort((a, b) => (a.order || 0) - (b.order || 0));
      await saveContent(content);
      res.json({ success: true, data: content.services });
    } catch (err) {
      res.status(500).json({ success: false, message: 'خطأ في إعادة الترتيب' });
    }
  });

  app.put('/api/content/services/:id', requireAdmin, async (req, res) => {
    try {
      const content = await loadContent();
      const idx = content.services.findIndex(s => s.id === req.params.id);
      if (idx === -1) return res.status(404).json({ success: false, message: 'الخدمة غير موجودة' });
      const body = req.body || {};
      const svc = content.services[idx];
      if (body.title !== undefined) svc.title = String(body.title).trim().slice(0, 150);
      if (body.description !== undefined) svc.description = String(body.description).trim().slice(0, 1000);
      if (body.features !== undefined) svc.features = Array.isArray(body.features) ? body.features.map(f => String(f).trim().slice(0, 100)).filter(Boolean) : svc.features;
      if (body.icon !== undefined) svc.icon = String(body.icon).trim().slice(0, 50);
      if (body.image !== undefined) svc.image = String(body.image).trim();
      if (body.order !== undefined) svc.order = parseInt(body.order, 10) || 0;
      if (body.visible !== undefined) svc.visible = !!body.visible;
      if (body.category !== undefined && ['crypto', 'tech'].includes(body.category)) svc.category = body.category;
      content.services[idx] = svc;
      await saveContent(content);
      res.json({ success: true, data: svc });
    } catch (err) {
      res.status(500).json({ success: false, message: 'خطأ في تعديل الخدمة' });
    }
  });

  app.delete('/api/content/services/:id', requireAdmin, async (req, res) => {
    try {
      const content = await loadContent();
      const idx = content.services.findIndex(s => s.id === req.params.id);
      if (idx === -1) return res.status(404).json({ success: false, message: 'الخدمة غير موجودة' });
      content.services.splice(idx, 1);
      await saveContent(content);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, message: 'خطأ في حذف الخدمة' });
    }
  });

  // ─── PRICING CRUD ───

  app.put('/api/content/pricing/rates', requireAdmin, async (req, res) => {
    try {
      const body = req.body || {};
      if (!Array.isArray(body.rates)) return res.status(400).json({ success: false, message: 'بيانات غير صالحة' });
      const content = await loadContent();
      content.pricing.cryptoRates = body.rates.map(r => ({
        currency: String(r.currency || '').trim(),
        fullName: String(r.fullName || '').trim(),
        symbol: String(r.symbol || '').trim(),
        color: String(r.color || '#d4a843').trim(),
        min: String(r.min || '').trim(),
        fee: String(r.fee || '').trim(),
        speed: String(r.speed || '').trim(),
      })).filter(r => r.currency);
      await saveContent(content);
      res.json({ success: true, data: content.pricing.cryptoRates });
    } catch (err) {
      res.status(500).json({ success: false, message: 'خطأ' });
    }
  });

  app.put('/api/content/pricing/packages', requireAdmin, async (req, res) => {
    try {
      const body = req.body || {};
      if (!Array.isArray(body.packages)) return res.status(400).json({ success: false, message: 'بيانات غير صالحة' });
      const content = await loadContent();
      content.pricing.packages = body.packages.map(p => ({
        id: String(p.id || genId('pkg')).trim(),
        name: String(p.name || '').trim().slice(0, 100),
        icon: String(p.icon || 'fa-star').trim().slice(0, 50),
        subtitle: String(p.subtitle || '').trim().slice(0, 200),
        price: String(p.price || '').trim().slice(0, 30),
        priceNote: String(p.priceNote || '').trim().slice(0, 50),
        features: Array.isArray(p.features) ? p.features.map(f => String(f).trim().slice(0, 100)).filter(Boolean) : [],
        featured: !!p.featured,
      })).filter(p => p.name);
      await saveContent(content);
      res.json({ success: true, data: content.pricing.packages });
    } catch (err) {
      res.status(500).json({ success: false, message: 'خطأ' });
    }
  });

  // ─── FAQ CRUD ───

  app.get('/api/content/faq/all', requireAdmin, async (req, res) => {
    try {
      const content = await loadContent();
      content.faq.sort((a, b) => (a.order || 999) - (b.order || 999));
      res.json({ success: true, data: content.faq });
    } catch (err) {
      res.status(500).json({ success: false, message: 'خطأ' });
    }
  });

  app.post('/api/content/faq', requireAdmin, async (req, res) => {
    try {
      const body = req.body || {};
      const id = genId('faq');
      const item = {
        id,
        category: ['crypto', 'tech', 'general'].includes(body.category) ? body.category : 'general',
        question: String(body.question || '').trim().slice(0, 300),
        answer: String(body.answer || '').trim().slice(0, 3000),
        order: parseInt(body.order, 10) || 999,
      };
      if (!item.question) return res.status(400).json({ success: false, message: 'السؤال مطلوب' });
      const content = await loadContent();
      content.faq.push(item);
      await saveContent(content);
      res.json({ success: true, data: item });
    } catch (err) {
      res.status(500).json({ success: false, message: 'خطأ' });
    }
  });

  app.put('/api/content/faq/:id', requireAdmin, async (req, res) => {
    try {
      const content = await loadContent();
      const idx = content.faq.findIndex(f => f.id === req.params.id);
      if (idx === -1) return res.status(404).json({ success: false, message: 'غير موجود' });
      const body = req.body || {};
      const item = content.faq[idx];
      if (body.question !== undefined) item.question = String(body.question).trim().slice(0, 300);
      if (body.answer !== undefined) item.answer = String(body.answer).trim().slice(0, 3000);
      if (body.category !== undefined && ['crypto', 'tech', 'general'].includes(body.category)) item.category = body.category;
      if (body.order !== undefined) item.order = parseInt(body.order, 10) || 0;
      content.faq[idx] = item;
      await saveContent(content);
      res.json({ success: true, data: item });
    } catch (err) {
      res.status(500).json({ success: false, message: 'خطأ' });
    }
  });

  app.delete('/api/content/faq/:id', requireAdmin, async (req, res) => {
    try {
      const content = await loadContent();
      const idx = content.faq.findIndex(f => f.id === req.params.id);
      if (idx === -1) return res.status(404).json({ success: false, message: 'غير موجود' });
      content.faq.splice(idx, 1);
      await saveContent(content);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, message: 'خطأ' });
    }
  });
}

module.exports = { loadContent, saveContent, setupContentRoutes };