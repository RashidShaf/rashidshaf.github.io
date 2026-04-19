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
      purchasePrice: b.purchasePrice?.toString() || '',
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
          author: row.author?.trim() || '',
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

// Download import template (simplified)
exports.importTemplate = async (req, res, next) => {
  try {
    const headers = ['barcode', 'nameEn', 'nameAr', 'Classification EN', 'Classification Ar', 'descriptionEn', 'descriptionAr'];
    const sample = { barcode: '978316148410', nameEn: 'Sample Product', nameAr: 'منتج تجريبي', 'Classification EN': '', 'Classification Ar': '', descriptionEn: '', descriptionAr: '' };

    // If category provided, add category-specific columns
    let detailArr = null;
    let customDefs = [];
    if (req.query.category) {
      const category = await prisma.category.findUnique({ where: { id: req.query.category }, select: { detailFields: true, customFields: true } });
      if (category?.detailFields) {
        try {
          const parsed = JSON.parse(category.detailFields);
          detailArr = Array.isArray(parsed) ? parsed : parsed.detail || null;
        } catch {}
      }
      if (category?.customFields) {
        try { customDefs = JSON.parse(category.customFields); } catch {}
      }
    }

    const hasField = (key) => !detailArr || detailArr.includes(key);

    if (hasField('author')) { headers.push('authorEn', 'authorAr'); sample.authorEn = ''; sample.authorAr = ''; }
    if (hasField('publisher')) { headers.push('publisherEn', 'publisherAr'); sample.publisherEn = ''; sample.publisherAr = ''; }
    if (hasField('language')) { headers.push('language'); sample.language = ''; }

    headers.push('purchasePrice', 'sellingPrice', 'mainCategory', 'subCategory', 'subSubCategory');
    sample.purchasePrice = '30.00'; sample.sellingPrice = '49.99'; sample.mainCategory = ''; sample.subCategory = ''; sample.subSubCategory = '';

    const csv = stringify([sample], { header: true, columns: headers });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=product-import-template.csv');
    res.send(csv);
  } catch (error) {
    next(error);
  }
};

exports.importTemplateAll = async (req, res, next) => {
  try {
    const sections = [
      {
        name: 'Book Corner',
        columns: ['barcode', 'nameEn', 'nameAr', 'Classification EN', 'Classification Ar', 'Description Ar', 'Description EN', 'Author AR', 'Author EN', 'Publisher AR', 'Publisher (English)', 'purchasePrice', 'sellingPrice', 'mainCategory', 'subCategory', 'subSubCategory', 'Language'],
      },
      {
        name: 'Stationery Corner',
        columns: ['barcode', 'nameEn', 'nameAr', 'Description Ar', 'Description EN', 'purchasePrice', 'sellingPrice', 'mainCategory', 'subCategory', 'subSubCategory'],
      },
      {
        name: 'Islamic Corner',
        columns: ['barcode', 'nameEn', 'nameAr', 'Description Ar', 'Description EN', 'Publisher AR', 'Publisher (English)', 'purchasePrice', 'sellingPrice', 'mainCategory', 'subCategory', 'subSubCategory', 'Language'],
      },
    ];

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Product Template');

    let currentRow = 1;
    for (const section of sections) {
      const headerCell = sheet.getCell(currentRow, 1);
      headerCell.value = section.name;
      headerCell.font = { bold: true, size: 14 };
      currentRow += 3;

      section.columns.forEach((col, i) => {
        const cell = sheet.getCell(currentRow, i + 1);
        cell.value = col;
        cell.font = { bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E8E8' } };
      });
      currentRow += 13;
    }

    sheet.columns.forEach((col) => { col.width = 18; });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Product-Template.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
};

// Preview import — parse CSV, validate, detect duplicates (does NOT create anything)
exports.importPreview = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'CSV file is required.' });

    const fileContent = req.file.buffer.toString('utf-8');
    let records;
    try {
      records = parse(fileContent, { columns: true, skip_empty_lines: true, trim: true, bom: true });
    } catch {
      return res.status(400).json({ message: 'Invalid CSV format.' });
    }

    if (!records || records.length === 0) return res.status(400).json({ message: 'CSV file is empty.' });

    // Fetch categories and existing barcodes
    const allCategories = await prisma.category.findMany({
      select: { id: true, name: true, slug: true, parentId: true },
    });
    const existingBarcodes = await prisma.book.findMany({
      where: { sku: { not: null } },
      select: { sku: true, title: true },
    });
    const barcodeMap = {};
    existingBarcodes.forEach((b) => { barcodeMap[b.sku] = b.title; });
    const barcodeSet = new Set(Object.keys(barcodeMap));

    const valid = [];
    const duplicates = [];
    const errors = [];

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const rowNum = i + 2;

      // Validate required fields
      if (!row.nameEn || !row.nameEn.trim()) { errors.push({ row: rowNum, error: 'Name (English) is required' }); continue; }
      if (!row.sellingPrice || isNaN(parseFloat(row.sellingPrice))) { errors.push({ row: rowNum, error: 'Valid selling price is required' }); continue; }
      if (!row.barcode || !row.barcode.trim()) { errors.push({ row: rowNum, error: 'Barcode is required' }); continue; }

      // Resolve category by name (case-insensitive)
      let categoryId = null;
      const l1Name = (row.mainCategory || '').trim().toLowerCase();
      const l2Name = (row.subCategory || '').trim().toLowerCase();
      const l3Name = (row.subSubCategory || '').trim().toLowerCase();

      if (l1Name) {
        const l1 = allCategories.find((c) => c.name.toLowerCase() === l1Name && !c.parentId);
        if (l1) {
          categoryId = l1.id;
          if (l2Name) {
            const l2 = allCategories.find((c) => c.name.toLowerCase() === l2Name && c.parentId === l1.id);
            if (l2) {
              categoryId = l2.id;
              if (l3Name) {
                const l3 = allCategories.find((c) => c.name.toLowerCase() === l3Name && c.parentId === l2.id);
                if (l3) categoryId = l3.id;
              }
            }
          }
        }
      }

      // Build custom fields from cf_ columns
      const customFields = {};
      Object.keys(row).filter((k) => k.startsWith('cf_')).forEach((k) => {
        const val = row[k]?.trim();
        if (val) customFields[k.slice(3)] = { value: val };
      });
      // Bilingual "Classification" columns (Book Corner filter)
      const classEn = row['Classification EN']?.trim();
      const classAr = row['Classification Ar']?.trim();
      if (classEn || classAr) {
        customFields.classification = {
          ...(classEn && { value: classEn }),
          ...(classAr && { valueAr: classAr }),
        };
      }

      const product = {
        row: rowNum,
        barcode: row.barcode.trim(),
        nameEn: row.nameEn.trim(),
        nameAr: row.nameAr?.trim() || '',
        descriptionEn: row.descriptionEn?.trim() || row['Description EN']?.trim() || '',
        descriptionAr: row.descriptionAr?.trim() || row['Description Ar']?.trim() || '',
        authorEn: row.authorEn?.trim() || row['Author EN']?.trim() || '',
        authorAr: row.authorAr?.trim() || row['Author AR']?.trim() || '',
        publisherEn: row.publisherEn?.trim() || row['Publisher (English)']?.trim() || '',
        publisherAr: row.publisherAr?.trim() || row['Publisher AR']?.trim() || '',
        language: row.language?.trim() || '',
        brand: row.brand?.trim() || '',
        brandAr: row.brandAr?.trim() || '',
        color: row.color?.trim() || '',
        colorAr: row.colorAr?.trim() || '',
        material: row.material?.trim() || '',
        materialAr: row.materialAr?.trim() || '',
        dimensions: row.dimensions?.trim() || '',
        ageRange: row.ageRange?.trim() || '',
        customFields: Object.keys(customFields).length > 0 ? JSON.stringify(customFields) : null,
        purchasePrice: row.purchasePrice ? parseFloat(row.purchasePrice) : null,
        sellingPrice: parseFloat(row.sellingPrice),
        mainCategory: row.mainCategory?.trim() || '',
        subCategory: row.subCategory?.trim() || '',
        subSubCategory: row.subSubCategory?.trim() || '',
        categoryId,
      };

      // Check for duplicate barcode
      if (barcodeSet.has(product.barcode)) {
        // Exists in database
        product.duplicateReason = 'exists';
        product.existingProduct = barcodeMap[product.barcode];
        duplicates.push(product);
      } else {
        // Check within the file itself for duplicate barcodes
        const existingInValid = valid.findIndex((v) => v.barcode === product.barcode);
        if (existingInValid !== -1) {
          // Move the first one from valid to duplicates too
          const first = valid.splice(existingInValid, 1)[0];
          first.duplicateReason = 'file';
          product.duplicateReason = 'file';
          duplicates.push(first);
          duplicates.push(product);
        } else if (duplicates.some((d) => d.barcode === product.barcode)) {
          product.duplicateReason = 'file';
          duplicates.push(product);
        } else {
          valid.push(product);
        }
      }
    }

    res.json({ valid, duplicates, errors, total: records.length });
  } catch (error) {
    next(error);
  }
};

// Confirm import — create products after password verification
exports.importConfirm = async (req, res, next) => {
  try {
    const { products, password } = req.body;
    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ message: 'No products to import.' });
    }
    if (!password) return res.status(400).json({ message: 'Password is required.' });

    // Verify admin password
    const bcrypt = require('bcryptjs');
    const admin = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!admin) return res.status(401).json({ message: 'User not found.' });
    const validPassword = await bcrypt.compare(password, admin.password);
    if (!validPassword) return res.status(401).json({ message: 'Incorrect password.' });

    const results = { created: 0, errors: [] };

    for (const product of products) {
      try {
        // Re-check barcode uniqueness at creation time
        if (product.barcode) {
          const existing = await prisma.book.findFirst({ where: { sku: product.barcode } });
          if (existing) { results.errors.push({ row: product.row, error: `Barcode "${product.barcode}" already exists` }); continue; }
        }

        let slug = generateSlug(product.nameEn);
        const existingSlug = await prisma.book.findFirst({ where: { slug } });
        if (existingSlug) slug = `${slug}-${Date.now()}`;

        await prisma.book.create({
          data: {
            title: product.nameEn,
            titleAr: product.nameAr || null,
            slug,
            author: product.authorEn || '',
            authorAr: product.authorAr || null,
            description: product.descriptionEn || null,
            descriptionAr: product.descriptionAr || null,
            publisher: product.publisherEn || null,
            publisherAr: product.publisherAr || null,
            language: product.language || 'en',
            brand: product.brand || null,
            brandAr: product.brandAr || null,
            color: product.color || null,
            colorAr: product.colorAr || null,
            material: product.material || null,
            materialAr: product.materialAr || null,
            dimensions: product.dimensions || null,
            ageRange: product.ageRange || null,
            customFields: product.customFields || null,
            sku: product.barcode || null,
            price: product.sellingPrice,
            purchasePrice: product.purchasePrice || null,
            categoryId: product.categoryId || null,
            stock: 0,
            isActive: true,
          },
        });
        results.created++;
      } catch (err) {
        results.errors.push({ row: product.row, error: err.message || 'Unknown error' });
      }
    }

    res.json({
      message: `Import complete. ${results.created} products created.`,
      created: results.created,
      total: products.length,
      errors: results.errors,
    });
  } catch (error) {
    next(error);
  }
};

