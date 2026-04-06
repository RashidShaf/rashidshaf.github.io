const prisma = require('../config/database');
const { generateSlug } = require('../utils/helpers');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');
const ExcelJS = require('exceljs');

// ==================== EXPORT ====================

// Export Products
exports.exportProducts = async (req, res, next) => {
  try {
    const format = req.query.format || 'csv';
    const books = await prisma.book.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        category: { select: { name: true, slug: true, parent: { select: { name: true, slug: true } } } },
      },
    });

    const rows = books.map((b) => ({
      title: b.title || '',
      titleAr: b.titleAr || '',
      author: b.author || '',
      authorAr: b.authorAr || '',
      isbn: b.isbn || '',
      barcode: b.sku || '',
      description: b.description || '',
      descriptionAr: b.descriptionAr || '',
      price: b.price?.toString() || '0',
      compareAtPrice: b.compareAtPrice?.toString() || '',
      publisher: b.publisher || '',
      publisherAr: b.publisherAr || '',
      language: b.language || 'en',
      pages: b.pages?.toString() || '',
      weight: b.weight?.toString() || '',
      dimensions: b.dimensions || '',
      brand: b.brand || '',
      color: b.color || '',
      material: b.material || '',
      ageRange: b.ageRange || '',
      stock: b.stock?.toString() || '0',
      lowStockThreshold: b.lowStockThreshold?.toString() || '5',
      category: b.category?.parent ? `${b.category.parent.name} > ${b.category.name}` : (b.category?.name || ''),
      categorySlug: b.category?.slug || '',
      tags: (b.tags || []).join(', '),
      isFeatured: b.isFeatured ? 'yes' : 'no',
      isBestseller: b.isBestseller ? 'yes' : 'no',
      isNewArrival: b.isNewArrival ? 'yes' : 'no',
      isTrending: b.isTrending ? 'yes' : 'no',
      isComingSoon: b.isComingSoon ? 'yes' : 'no',
      isOutOfStock: b.isOutOfStock ? 'yes' : 'no',
      isActive: b.isActive ? 'yes' : 'no',
      publishedDate: b.publishedDate ? b.publishedDate.toISOString().split('T')[0] : '',
    }));

    if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Products');
      if (rows.length > 0) {
        sheet.columns = Object.keys(rows[0]).map((key) => ({ header: key, key, width: 20 }));
        rows.forEach((row) => sheet.addRow(row));
        // Style header row
        sheet.getRow(1).font = { bold: true };
        sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
      }
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=products.xlsx');
      await workbook.xlsx.write(res);
      return res.end();
    }

    // CSV
    const csv = stringify(rows, { header: true });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=products.csv');
    res.send(csv);
  } catch (error) {
    next(error);
  }
};

// Export Customers
exports.exportCustomers = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        firstName: true, lastName: true, firstNameAr: true, lastNameAr: true,
        email: true, phone: true, address: true, city: true,
        role: true, isBlocked: true, createdAt: true, lastLoginAt: true,
        _count: { select: { orders: true, reviews: true } },
      },
    });

    const rows = users.map((u) => ({
      firstName: u.firstName || '',
      lastName: u.lastName || '',
      firstNameAr: u.firstNameAr || '',
      lastNameAr: u.lastNameAr || '',
      email: u.email || '',
      phone: u.phone || '',
      address: u.address || '',
      city: u.city || '',
      role: u.role || 'USER',
      isBlocked: u.isBlocked ? 'yes' : 'no',
      totalOrders: u._count.orders,
      totalReviews: u._count.reviews,
      createdAt: u.createdAt ? u.createdAt.toISOString().split('T')[0] : '',
      lastLogin: u.lastLoginAt ? u.lastLoginAt.toISOString().split('T')[0] : '',
    }));

    const csv = stringify(rows, { header: true });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=customers.csv');
    res.send(csv);
  } catch (error) {
    next(error);
  }
};

// Export Orders
exports.exportOrders = async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        items: { include: { book: { select: { title: true } } } },
      },
    });

    const rows = orders.map((o) => ({
      orderNumber: o.orderNumber || '',
      customerName: o.user ? `${o.user.firstName} ${o.user.lastName}` : o.shippingName || 'Guest',
      customerEmail: o.user?.email || '',
      phone: o.shippingPhone || '',
      address: o.shippingAddress || '',
      city: o.shippingCity || '',
      items: o.items.map((i) => `${i.book?.title || i.title} x${i.quantity}`).join('; '),
      itemCount: o.items.reduce((sum, i) => sum + i.quantity, 0),
      subtotal: o.subtotal?.toString() || '0',
      shippingCost: o.shippingCost?.toString() || '0',
      total: o.total?.toString() || '0',
      paymentMethod: o.paymentMethod || '',
      status: o.status || '',
      notes: o.shippingNotes || '',
      createdAt: o.createdAt ? o.createdAt.toISOString().split('T')[0] : '',
    }));

    const csv = stringify(rows, { header: true });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=orders.csv');
    res.send(csv);
  } catch (error) {
    next(error);
  }
};

// Export Inventory
exports.exportInventory = async (req, res, next) => {
  try {
    const books = await prisma.book.findMany({
      where: { isActive: true },
      orderBy: { stock: 'asc' },
      select: {
        title: true, titleAr: true, sku: true, isbn: true, author: true,
        stock: true, lowStockThreshold: true, price: true, salesCount: true,
        isOutOfStock: true,
        category: { select: { name: true } },
      },
    });

    const rows = books.map((b) => ({
      title: b.title || '',
      titleAr: b.titleAr || '',
      barcode: b.sku || '',
      isbn: b.isbn || '',
      author: b.author || '',
      category: b.category?.name || '',
      stock: b.stock?.toString() || '0',
      lowStockThreshold: b.lowStockThreshold?.toString() || '5',
      price: b.price?.toString() || '0',
      totalSold: b.salesCount?.toString() || '0',
      isOutOfStock: b.isOutOfStock ? 'yes' : 'no',
      status: b.stock <= b.lowStockThreshold ? 'LOW' : 'OK',
    }));

    const csv = stringify(rows, { header: true });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=inventory.csv');
    res.send(csv);
  } catch (error) {
    next(error);
  }
};

// Export Categories
exports.exportCategories = async (req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { displayOrder: 'asc' },
      include: {
        parent: { select: { name: true } },
        _count: { select: { books: true } },
      },
    });

    const rows = categories.map((c) => ({
      name: c.name || '',
      nameAr: c.nameAr || '',
      slug: c.slug || '',
      parent: c.parent?.name || '',
      productCount: c._count.books,
      isActive: c.isActive ? 'yes' : 'no',
      displayOrder: c.displayOrder,
    }));

    const csv = stringify(rows, { header: true });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=categories.csv');
    res.send(csv);
  } catch (error) {
    next(error);
  }
};

// ==================== IMPORT ====================

// Import Products (CSV)
exports.importProducts = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'CSV file is required.' });
    }

    const fileContent = req.file.buffer.toString('utf-8');
    let records;
    try {
      records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
      });
    } catch (parseError) {
      return res.status(400).json({ message: 'Invalid CSV format. Please check the file.' });
    }

    if (!records || records.length === 0) {
      return res.status(400).json({ message: 'CSV file is empty.' });
    }

    // Fetch all categories for slug matching
    const allCategories = await prisma.category.findMany({ select: { id: true, name: true, slug: true } });
    const catBySlug = {};
    const catByName = {};
    allCategories.forEach((c) => {
      catBySlug[c.slug.toLowerCase()] = c.id;
      catByName[c.name.toLowerCase()] = c.id;
    });

    const results = { created: 0, errors: [] };

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const rowNum = i + 2; // +2 because row 1 is header, data starts at 2

      try {
        // Validate required fields
        if (!row.title || !row.title.trim()) {
          results.errors.push({ row: rowNum, error: 'Title is required' });
          continue;
        }
        if (!row.price || isNaN(parseFloat(row.price))) {
          results.errors.push({ row: rowNum, error: 'Valid price is required' });
          continue;
        }

        // Resolve category
        let categoryId = null;
        const catRef = row.categorySlug || row.category || '';
        if (catRef) {
          // Try slug first, then name
          categoryId = catBySlug[catRef.toLowerCase()] || catByName[catRef.toLowerCase()] || null;
          // If "Parent > Child" format, try to match the child
          if (!categoryId && catRef.includes('>')) {
            const childName = catRef.split('>').pop().trim().toLowerCase();
            categoryId = catByName[childName] || null;
          }
        }

        // Check for duplicate ISBN
        if (row.isbn && row.isbn.trim()) {
          const existing = await prisma.book.findFirst({ where: { isbn: row.isbn.trim() } });
          if (existing) {
            results.errors.push({ row: rowNum, error: `ISBN "${row.isbn}" already exists` });
            continue;
          }
        }

        // Check for duplicate SKU
        if (row.barcode && row.barcode.trim()) {
          const existing = await prisma.book.findFirst({ where: { sku: row.barcode.trim() } });
          if (existing) {
            results.errors.push({ row: rowNum, error: `SKU "${row.barcode}" already exists` });
            continue;
          }
        }

        const toBool = (val) => val && ['yes', 'true', '1'].includes(val.toLowerCase());

        const data = {
          title: row.title.trim(),
          titleAr: row.titleAr?.trim() || null,
          slug: generateSlug(row.title.trim()),
          author: row.author?.trim() || 'Unknown',
          authorAr: row.authorAr?.trim() || null,
          isbn: row.isbn?.trim() || null,
          sku: row.barcode?.trim() || null,
          description: row.description?.trim() || null,
          descriptionAr: row.descriptionAr?.trim() || null,
          price: parseFloat(row.price),
          compareAtPrice: row.compareAtPrice ? parseFloat(row.compareAtPrice) : null,
          publisher: row.publisher?.trim() || null,
          publisherAr: row.publisherAr?.trim() || null,
          language: row.language?.trim() || 'en',
          pages: row.pages ? parseInt(row.pages) : null,
          weight: row.weight ? parseFloat(row.weight) : null,
          dimensions: row.dimensions?.trim() || null,
          brand: row.brand?.trim() || null,
          color: row.color?.trim() || null,
          material: row.material?.trim() || null,
          ageRange: row.ageRange?.trim() || null,
          stock: row.stock ? parseInt(row.stock) : 0,
          lowStockThreshold: row.lowStockThreshold ? parseInt(row.lowStockThreshold) : 5,
          categoryId: categoryId,
          tags: row.tags ? row.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
          isFeatured: toBool(row.isFeatured),
          isBestseller: toBool(row.isBestseller),
          isNewArrival: toBool(row.isNewArrival),
          isTrending: toBool(row.isTrending),
          isComingSoon: toBool(row.isComingSoon),
          isOutOfStock: toBool(row.isOutOfStock),
          isActive: row.isActive ? toBool(row.isActive) : true,
        };

        // Handle publishedDate
        if (row.publishedDate?.trim()) {
          const d = new Date(row.publishedDate.trim());
          if (!isNaN(d.getTime())) data.publishedDate = d;
        }

        // Ensure unique slug
        const existingSlug = await prisma.book.findFirst({ where: { slug: data.slug } });
        if (existingSlug) {
          data.slug = `${data.slug}-${Date.now()}`;
        }

        await prisma.book.create({ data });
        results.created++;
      } catch (rowError) {
        results.errors.push({ row: rowNum, error: rowError.message || 'Unknown error' });
      }
    }

    res.json({
      message: `Import complete. ${results.created} products created.`,
      created: results.created,
      total: records.length,
      errors: results.errors,
    });
  } catch (error) {
    next(error);
  }
};

// Download import template
exports.importTemplate = async (req, res, next) => {
  try {
    const headers = [
      'title', 'titleAr', 'author', 'authorAr', 'isbn', 'barcode',
      'description', 'descriptionAr', 'price', 'compareAtPrice',
      'publisher', 'publisherAr', 'language', 'pages', 'weight', 'dimensions',
      'brand', 'color', 'material', 'ageRange',
      'stock', 'lowStockThreshold', 'categorySlug', 'tags',
      'isFeatured', 'isBestseller', 'isNewArrival', 'isTrending', 'isComingSoon',
      'isOutOfStock', 'isActive', 'publishedDate',
    ];

    const sample = [{
      title: 'Sample Book Title',
      titleAr: 'عنوان الكتاب',
      author: 'Author Name',
      authorAr: 'اسم المؤلف',
      isbn: '978-3-16-148410-0',
      barcode: '978316148410',
      description: 'Book description here',
      descriptionAr: 'وصف الكتاب',
      price: '49.99',
      compareAtPrice: '59.99',
      publisher: 'Publisher Name',
      publisherAr: 'اسم الناشر',
      language: 'en',
      pages: '320',
      weight: '450',
      dimensions: '20x15x3 cm',
      brand: '',
      color: '',
      material: '',
      ageRange: '',
      stock: '50',
      lowStockThreshold: '5',
      categorySlug: 'fiction',
      tags: 'bestseller, new',
      isFeatured: 'no',
      isBestseller: 'no',
      isNewArrival: 'yes',
      isTrending: 'no',
      isComingSoon: 'no',
      isOutOfStock: 'no',
      isActive: 'yes',
      publishedDate: '2026-01-15',
    }];

    const csv = stringify(sample, { header: true, columns: headers });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=product-import-template.csv');
    res.send(csv);
  } catch (error) {
    next(error);
  }
};

