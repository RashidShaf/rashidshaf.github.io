const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const crypto = require('crypto');

const generateAccessToken = (user) => {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

const generateRefreshToken = async (userId) => {
  const token = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  await prisma.refreshToken.create({
    data: { token, userId, expiresAt },
  });

  return token;
};

exports.register = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, firstNameAr, lastNameAr, phone } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ message: 'Email already registered.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        firstNameAr,
        lastNameAr,
        phone,
      },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        firstNameAr: true, lastNameAr: true, role: true, phone: true,
        createdAt: true,
      },
    });

    const accessToken = generateAccessToken(user);
    const refreshToken = await generateRefreshToken(user.id);

    res.status(201).json({
      message: 'Registration successful.',
      user,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    if (user.isBlocked) {
      return res.status(403).json({ message: 'Account has been blocked.' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const accessToken = generateAccessToken(user);
    const refreshToken = await generateRefreshToken(user.id);

    const { password: _, ...userWithoutPassword } = user;

    res.json({
      message: 'Login successful.',
      user: userWithoutPassword,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
};

exports.refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token required.' });
    }

    const stored = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date()) {
      if (stored) {
        await prisma.refreshToken.delete({ where: { id: stored.id } });
      }
      return res.status(401).json({ message: 'Invalid or expired refresh token.' });
    }

    if (stored.user.isBlocked) {
      return res.status(403).json({ message: 'Account has been blocked.' });
    }

    // Rotate refresh token
    await prisma.refreshToken.delete({ where: { id: stored.id } });

    const accessToken = generateAccessToken(stored.user);
    const newRefreshToken = await generateRefreshToken(stored.user.id);

    res.json({ accessToken, refreshToken: newRefreshToken });
  } catch (error) {
    next(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    }
    res.json({ message: 'Logged out successfully.' });
  } catch (error) {
    next(error);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        firstNameAr: true, lastNameAr: true, phone: true, address: true,
        city: true, avatar: true, role: true, createdAt: true,
      },
    });
    res.json(user);
  } catch (error) {
    next(error);
  }
};

exports.updateMe = async (req, res, next) => {
  try {
    const { firstName, lastName, firstNameAr, lastNameAr, phone, address, city } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { firstName, lastName, firstNameAr, lastNameAr, phone, address, city },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        firstNameAr: true, lastNameAr: true, phone: true, address: true,
        city: true, avatar: true, role: true, createdAt: true,
      },
    });

    res.json({ message: 'Profile updated.', user });
  } catch (error) {
    next(error);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return res.status(400).json({ message: 'Current password is incorrect.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedPassword },
    });

    // Invalidate all refresh tokens
    await prisma.refreshToken.deleteMany({ where: { userId: req.user.id } });

    res.json({ message: 'Password changed successfully.' });
  } catch (error) {
    next(error);
  }
};
