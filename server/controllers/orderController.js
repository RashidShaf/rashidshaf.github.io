const prisma = require('../config/database');
const { getPagination, getPaginatedResponse } = require('../utils/pagination');
const { generateOrderNumber } = require('../utils/helpers');

const orderItemBookSelect = {
  id: true, slug: true, coverImage: true, titleAr: true, authorAr: true, hasVariants: true,
};

// When a variant still exists, surface its own image + display fields so the
// orders/track pages render the picked option, not the base cover. Snapshot
// fields on OrderItem (variantLabel/Sku/Color) still describe a deleted variant.
const orderItemVariantSelect = {
  id: true, image: true, label: true, labelAr: true, color: true, colorAr: true,
};

exports.create = async (req, res, next) => {
  try {
    const { shippingName, shippingPhone, shippingAddress, shippingCity, shippingNotes, paymentMethod, cartItems: clientCart } = req.body;

    if (!clientCart || clientCart.length === 0) {
      return res.status(400).json({ message: 'Cart is empty.' });
    }

    // Fetch every referenced book + its variants in one round-trip. The client's
    // {bookId, variantId, quantity} payload is treated as INTENT only — the
    // server reads the canonical price/stock here and never trusts client price.
    const bookIds = [...new Set(clientCart.map((item) => item.bookId).filter(Boolean))];
    const books = await prisma.book.findMany({
      where: { id: { in: bookIds }, isActive: true },
      include: { variants: true },
    });
    const bookMap = {};
    books.forEach((b) => { bookMap[b.id] = b; });

    // Resolve and validate every line.
    const resolved = [];
    for (const raw of clientCart) {
      const book = bookMap[raw.bookId];
      if (!book) {
        return res.status(404).json({ message: `Book not found: ${raw.bookId}` });
      }

      const qty = parseInt(raw.quantity, 10);
      if (!Number.isFinite(qty) || qty < 1) {
        return res.status(400).json({ message: `Invalid quantity for "${book.title}".` });
      }

      // The base product is always purchasable. Variants are ALTERNATIVE
      // options. variantId=null/undefined means buying the base — block only
      // on book.isOutOfStock then. With a variantId, validate the variant.
      let variant = null;
      if (book.hasVariants && raw.variantId) {
        variant = book.variants.find((v) => v.id === raw.variantId);
        if (!variant) {
          return res.status(400).json({
            message: `Selected option for "${book.title}" is not available.`,
            code: 'VARIANT_INVALID',
          });
        }
        if (!variant.isActive || variant.isOutOfStock) {
          return res.status(400).json({
            message: `Selected option for "${book.title}" is not available.`,
            code: 'VARIANT_UNAVAILABLE',
          });
        }
      } else {
        if (book.isOutOfStock) {
          return res.status(400).json({ message: `"${book.title}" is currently out of stock` });
        }
      }

      // Server-sourced price — NEVER from the request body.
      const unitPrice = variant ? parseFloat(variant.price) : parseFloat(book.price);
      resolved.push({ book, variant, quantity: qty, unitPrice });
    }

    // Read shipping settings from DB
    const shippingSettings = await prisma.setting.findMany({
      where: { key: { in: ['shippingThreshold', 'shippingCost'] } },
    });
    const settingsMap = {};
    shippingSettings.forEach((s) => { settingsMap[s.key] = s.value; });
    const freeShippingThreshold = parseFloat(settingsMap.shippingThreshold) || 100;
    const flatShippingCost = parseFloat(settingsMap.shippingCost) || 15;

    // Calculate totals from server-trusted prices
    const subtotal = resolved.reduce((sum, r) => sum + r.unitPrice * r.quantity, 0);
    const shippingCost = subtotal >= freeShippingThreshold ? 0 : flatShippingCost;
    const total = subtotal + shippingCost;

    // Generate order number
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999);
    const orderCount = await prisma.order.count({
      where: { createdAt: { gte: todayStart, lte: todayEnd } },
    });
    const orderNumber = generateOrderNumber(orderCount);

    // Resolve userId: logged-in user, or match guest phone to existing account
    let userId = req.user?.id || null;
    if (!userId && shippingPhone) {
      const matchedUser = await prisma.user.findFirst({
        where: { phone: shippingPhone, isBlocked: false },
        select: { id: true },
      });
      if (matchedUser) userId = matchedUser.id;
    }

    // Atomic order creation + per-line stock decrement + inventory log
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId,
          subtotal,
          shippingCost,
          total,
          paymentMethod: paymentMethod || 'COD',
          shippingName,
          shippingPhone,
          shippingAddress,
          shippingCity,
          shippingNotes,
          status: 'CONFIRMED',
          statusHistory: [{ status: 'CONFIRMED', timestamp: new Date().toISOString() }],
          items: {
            create: resolved.map(({ book, variant, quantity, unitPrice }) => ({
              bookId: book.id,
              variantId: variant ? variant.id : null,
              quantity,
              price: unitPrice,
              title: book.title,
              variantLabel: variant ? variant.label : null,
              variantSku: variant ? variant.sku : null,
              variantColor: variant ? variant.color : null,
            })),
          },
        },
        include: { items: true },
      });

      // Per-line atomic decrement. Postgres `decrement` runs in a single
      // UPDATE so two concurrent orders against the same row can't both
      // see the same pre-decrement stock.
      for (const { book, variant, quantity } of resolved) {
        const previousStock = variant ? variant.stock : book.stock;
        const newStock = previousStock - quantity;

        if (variant) {
          await tx.productVariant.update({
            where: { id: variant.id },
            data: { stock: { decrement: quantity } },
          });
        } else {
          await tx.book.update({
            where: { id: book.id },
            data: {
              stock: { decrement: quantity },
              salesCount: { increment: quantity },
            },
          });
        }

        // Always increment book salesCount even when variant-keyed (book stock untouched).
        if (variant) {
          await tx.book.update({
            where: { id: book.id },
            data: { salesCount: { increment: quantity } },
          });
        }

        await tx.inventoryLog.create({
          data: {
            bookId: book.id,
            variantId: variant ? variant.id : null,
            action: 'SALE',
            quantity: -quantity,
            previousStock,
            newStock,
            note: `Order ${orderNumber}`,
          },
        });
      }

      return newOrder;
    });

    // Notifications + low-stock checks (best-effort, outside the transaction)
    try {
      const { createNotification } = require('./notificationController');
      await createNotification({
        type: 'NEW_ORDER',
        title: 'New Order Received',
        message: `Order ${order.orderNumber} placed for QAR ${parseFloat(order.total).toFixed(2)}`,
        metadata: { orderId: order.id, orderNumber: order.orderNumber },
      });

      for (const { book, variant, quantity } of resolved) {
        const previousStock = variant ? variant.stock : book.stock;
        const newStock = previousStock - quantity;
        const threshold = variant ? variant.lowStockThreshold : book.lowStockThreshold;
        if (newStock >= 0 && newStock <= threshold) {
          await createNotification({
            type: 'LOW_STOCK',
            title: 'Low Stock Alert',
            message: variant
              ? `"${book.title}" — ${variant.label} is low on stock (${newStock} remaining)`
              : `"${book.title}" is low on stock (${newStock} remaining)`,
            metadata: {
              bookId: book.id,
              variantId: variant?.id || null,
              currentStock: newStock,
              threshold,
            },
          });
        }
      }
    } catch {}

    res.status(201).json({ message: 'Order placed successfully.', order });
  } catch (error) {
    next(error);
  }
};

exports.track = async (req, res, next) => {
  try {
    const { phone } = req.query;
    if (!phone) {
      return res.status(400).json({ message: 'Phone number is required.' });
    }

    const orders = await prisma.order.findMany({
      where: { shippingPhone: phone },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            book: { select: orderItemBookSelect },
            variant: { select: orderItemVariantSelect },
          },
        },
      },
    });

    res.json(orders);
  } catch (error) {
    next(error);
  }
};

exports.list = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          items: {
            include: {
            book: { select: orderItemBookSelect },
            variant: { select: orderItemVariantSelect },
          },
          },
        },
      }),
      prisma.order.count({ where: { userId: req.user.id } }),
    ]);

    res.json(getPaginatedResponse(orders, total, page, limit));
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        items: {
          include: {
            book: { select: orderItemBookSelect },
            variant: { select: orderItemVariantSelect },
          },
        },
      },
    });

    if (!order || order.userId !== req.user.id) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    res.json(order);
  } catch (error) {
    next(error);
  }
};

exports.cancel = async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { items: { include: { book: true, variant: true } } },
    });

    if (!order || order.userId !== req.user.id) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    if (!['PENDING', 'CONFIRMED'].includes(order.status)) {
      return res.status(400).json({ message: 'Order cannot be cancelled at this stage.' });
    }

    await prisma.$transaction(async (tx) => {
      // Restore stock — variant-aware. When a variant has been deleted since
      // the order was placed (FK SetNull), `item.variant` is null even though
      // the snapshot fields on the OrderItem still describe what was bought —
      // skip stock restoration in that case but log the return regardless.
      for (const item of order.items) {
        const variantStillExists = item.variantId && item.variant;
        const variantWasDeleted = item.variantId && !item.variant;

        if (variantStillExists) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { increment: item.quantity } },
          });
          if (item.bookId) {
            await tx.book.update({
              where: { id: item.bookId },
              data: { salesCount: { decrement: item.quantity } },
            });
          }
        } else if (!item.variantId && item.bookId && item.book) {
          await tx.book.update({
            where: { id: item.bookId },
            data: {
              stock: { increment: item.quantity },
              salesCount: { decrement: item.quantity },
            },
          });
        } else if (variantWasDeleted && item.bookId) {
          // Variant gone — only roll back the book's sales count
          await tx.book.update({
            where: { id: item.bookId },
            data: { salesCount: { decrement: item.quantity } },
          }).catch(() => {});
        }

        if (item.bookId) {
          // Use the previous stock if we have it; otherwise mark as 0/0 so
          // the audit trail still records the cancellation event.
          const previousStock = variantStillExists
            ? item.variant.stock
            : (!item.variantId && item.book ? item.book.stock : 0);
          const newStock = variantStillExists || (!item.variantId && item.book)
            ? previousStock + item.quantity
            : previousStock;
          await tx.inventoryLog.create({
            data: {
              bookId: item.bookId,
              variantId: variantStillExists ? item.variantId : null,
              action: 'RETURN',
              quantity: item.quantity,
              previousStock,
              newStock,
              note: variantWasDeleted
                ? `Cancelled order ${order.orderNumber} — variant no longer exists, stock not restored`
                : `Cancelled order ${order.orderNumber}`,
            },
          });
        }
      }

      const history = Array.isArray(order.statusHistory) ? order.statusHistory : [];
      history.push({ status: 'CANCELLED', timestamp: new Date().toISOString() });

      await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          statusHistory: history,
        },
      });
    });

    res.json({ message: 'Order cancelled.' });
  } catch (error) {
    next(error);
  }
};
