const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const admin = require('../../middleware/admin');

// TODO: Implement admin review routes

// GET / - List all reviews (admin)
router.get('/', [auth, admin], (req, res) => {
  res.json({ message: 'TODO' });
});

module.exports = router;
