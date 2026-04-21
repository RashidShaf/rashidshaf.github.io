const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { errorHandler } = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/auth');
const bookRoutes = require('./routes/books');
const categoryRoutes = require('./routes/categories');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/orders');
const reviewRoutes = require('./routes/reviews');
const wishlistRoutes = require('./routes/wishlist');
const readingListRoutes = require('./routes/readingLists');
const adminBookRoutes = require('./routes/admin/books');
const adminCategoryRoutes = require('./routes/admin/categories');
const adminOrderRoutes = require('./routes/admin/orders');
const adminUserRoutes = require('./routes/admin/users');
const adminInventoryRoutes = require('./routes/admin/inventory');
const adminDashboardRoutes = require('./routes/admin/dashboard');
const adminReportRoutes = require('./routes/admin/reports');
const adminReviewRoutes = require('./routes/admin/reviews');
const adminSettingsRoutes = require('./routes/admin/settings');
const adminNotificationRoutes = require('./routes/admin/notifications');
const adminBannerRoutes = require('./routes/admin/banners');
const adminDataRoutes = require('./routes/admin/data');
const adminHomeRoutes = require('./routes/admin/home');
const bannerRoutes = require('./routes/banners');
const settingsRoutes = require('./routes/settings');
const homeRoutes = require('./routes/home');
const sitemapRoutes = require('./routes/sitemap');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;

// CORS
app.use(cors({
  origin: function (origin, callback) {
    const allowed = [process.env.CLIENT_URL, process.env.ADMIN_URL].filter(Boolean);
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    // Allow exact matches
    if (allowed.includes(origin)) return callback(null, true);
    // Allow Vercel preview URLs
    if (origin.endsWith('.vercel.app')) return callback(null, true);
    callback(null, false);
  },
  credentials: true,
}));

// Body parsing (raise limit for bulk CSV import which POSTs the whole validated array)
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// SEO — sitemap.xml served at root (Nginx must route /sitemap.xml to API)
app.use('/', sitemapRoutes);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/reading-lists', readingListRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/home', homeRoutes);

// Admin Routes
app.use('/api/admin/books', adminBookRoutes);
app.use('/api/admin/categories', adminCategoryRoutes);
app.use('/api/admin/orders', adminOrderRoutes);
app.use('/api/admin/users', adminUserRoutes);
app.use('/api/admin/inventory', adminInventoryRoutes);
app.use('/api/admin/dashboard', adminDashboardRoutes);
app.use('/api/admin/reports', adminReportRoutes);
app.use('/api/admin/reviews', adminReviewRoutes);
app.use('/api/admin/settings', adminSettingsRoutes);
app.use('/api/admin/notifications', adminNotificationRoutes);
app.use('/api/admin/banners', adminBannerRoutes);
app.use('/api/admin/data', adminDataRoutes);
app.use('/api/admin/home', adminHomeRoutes);
app.use('/api/settings', settingsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Arkaan Bookstore API running on port ${PORT}`);

  // Clean up expired refresh tokens on startup and every 24h
  const prisma = require('./config/database');
  const cleanExpiredTokens = async () => {
    try {
      const { count } = await prisma.refreshToken.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });
      if (count > 0) console.log(`Cleaned ${count} expired refresh tokens`);
    } catch {}
  };
  cleanExpiredTokens();
  const cleanupInterval = setInterval(cleanExpiredTokens, 24 * 60 * 60 * 1000);
  cleanupInterval.unref();
});

module.exports = app;
