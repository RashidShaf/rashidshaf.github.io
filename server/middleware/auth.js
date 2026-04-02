const jwt = require('jsonwebtoken');
const prisma = require('../config/database');

const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true, isBlocked: true, firstName: true, lastName: true },
    });

    if (!user) {
      return res.status(401).json({ message: 'User not found.' });
    }

    if (user.isBlocked) {
      return res.status(403).json({ message: 'Account has been blocked.' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired.', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ message: 'Invalid token.' });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true, isBlocked: true, firstName: true, lastName: true },
    });

    if (user && !user.isBlocked) {
      req.user = user;
    }
  } catch {}
  next();
};

module.exports = auth;
module.exports.optionalAuth = optionalAuth;
