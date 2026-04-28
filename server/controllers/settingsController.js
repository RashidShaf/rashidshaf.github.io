const prisma = require('../config/database');

const PUBLIC_KEYS = [
  'shippingThreshold',
  'shippingCost',
  'storeName',
  'storeNameAr',
  'storeEmail',
  'storePhone',
  'storeAddress',
  'storeAddressAr',
  'instagram',
  'whatsapp',
  'facebook',
  'tiktok',
  'twitter',
  'linkedin',
  'pinterest',
  // Editable footer + content blocks (admin manages copy without code changes)
  'footerTagline',
  'footerTaglineAr',
  'newsletterDescription',
  'newsletterDescriptionAr',
  'returnPolicy',
  'returnPolicyAr',
];

exports.getAll = async (req, res, next) => {
  try {
    const settings = await prisma.setting.findMany();
    const result = {};
    settings.forEach((s) => {
      result[s.key] = s.value;
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const entries = Object.entries(req.body);
    for (const [key, value] of entries) {
      await prisma.setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      });
    }

    const settings = await prisma.setting.findMany();
    const result = {};
    settings.forEach((s) => {
      result[s.key] = s.value;
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.getPublic = async (req, res, next) => {
  try {
    const settings = await prisma.setting.findMany({
      where: { key: { in: PUBLIC_KEYS } },
    });
    const result = {};
    settings.forEach((s) => {
      result[s.key] = s.value;
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
};
