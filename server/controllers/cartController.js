const prisma = require('../config/database');

const cartItemInclude = {
  book: {
    select: {
      id: true, title: true, titleAr: true, slug: true, author: true,
      authorAr: true, price: true, compareAtPrice: true, coverImage: true,
      stock: true, isActive: true, isOutOfStock: true, hasVariants: true,
    },
  },
  variant: {
    select: {
      id: true, label: true, labelAr: true, sku: true,
      price: true, color: true, colorAr: true, image: true,
      stock: true, isOutOfStock: true, isActive: true,
    },
  },
};

exports.get = async (req, res, next) => {
  try {
    const items = await prisma.cartItem.findMany({
      where: { userId: req.user.id },
      include: cartItemInclude,
      orderBy: { createdAt: 'desc' },
    });
    res.json(items);
  } catch (error) {
    next(error);
  }
};

exports.add = async (req, res, next) => {
  try {
    const { bookId, variantId: rawVariantId, quantity = 1 } = req.body;
    const qty = Math.min(Math.max(parseInt(quantity, 10) || 1, 1), 999);

    const book = await prisma.book.findUnique({
      where: { id: bookId },
      include: { variants: true },
    });
    if (!book || !book.isActive) {
      return res.status(404).json({ message: 'Book not found.' });
    }

    // The base product is always purchasable on its own. Variants are
    // ALTERNATIVE options the customer may pick — picking none means buying
    // the base. Server still validates whichever target the client chose.
    let variantId = null;
    if (book.hasVariants && rawVariantId) {
      const variant = book.variants.find((v) => v.id === rawVariantId);
      if (!variant) {
        return res.status(400).json({ message: 'Selected option is not available.' });
      }
      if (!variant.isActive) {
        return res.status(400).json({ message: 'Selected option is no longer available.' });
      }
      if (variant.isOutOfStock) {
        return res.status(400).json({ message: 'Selected option is out of stock.' });
      }
      variantId = variant.id;
    } else {
      // Buying the base — either non-variant product, or hasVariants with no
      // variant chosen. Block on the base's out-of-stock flag.
      variantId = null;
      if (book.isOutOfStock) {
        return res.status(400).json({ message: `"${book.title}" is currently out of stock.` });
      }
    }

    const variantKey = variantId || '';

    const item = await prisma.cartItem.upsert({
      where: {
        userId_bookId_variantKey: {
          userId: req.user.id,
          bookId,
          variantKey,
        },
      },
      update: { quantity: { increment: qty } },
      create: { userId: req.user.id, bookId, variantId, variantKey, quantity: qty },
      include: cartItemInclude,
    });

    res.json(item);
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { quantity } = req.body;
    const qty = Math.min(Math.max(parseInt(quantity, 10) || 1, 1), 999);

    const item = await prisma.cartItem.findUnique({
      where: { id: req.params.itemId },
      include: cartItemInclude,
    });

    if (!item || item.userId !== req.user.id) {
      return res.status(404).json({ message: 'Cart item not found.' });
    }

    // Block stock blockers; per oversell policy, low stock alone does not block.
    if (item.variant) {
      if (!item.variant.isActive) {
        return res.status(400).json({ message: 'This option is no longer available.' });
      }
      if (item.variant.isOutOfStock) {
        return res.status(400).json({ message: 'This option is out of stock.' });
      }
    } else if (item.book.isOutOfStock) {
      return res.status(400).json({ message: `"${item.book.title}" is currently out of stock.` });
    }

    const updated = await prisma.cartItem.update({
      where: { id: req.params.itemId },
      data: { quantity: qty },
      include: cartItemInclude,
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const item = await prisma.cartItem.findUnique({ where: { id: req.params.itemId } });
    if (!item || item.userId !== req.user.id) {
      return res.status(404).json({ message: 'Cart item not found.' });
    }

    await prisma.cartItem.delete({ where: { id: req.params.itemId } });
    res.json({ message: 'Item removed.' });
  } catch (error) {
    next(error);
  }
};

exports.clear = async (req, res, next) => {
  try {
    await prisma.cartItem.deleteMany({ where: { userId: req.user.id } });
    res.json({ message: 'Cart cleared.' });
  } catch (error) {
    next(error);
  }
};
