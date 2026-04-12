const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.message);

  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large.' });
    }
    return res.status(400).json({ message: err.message });
  }

  if (err.code === 'P2002') {
    const field = err.meta?.target?.[0] || 'field';
    const messages = {
      slug: 'A product with this title already exists. Please use a different title.',
      email: 'An account with this email already exists.',
      sku: 'A product with this barcode already exists.',
      isbn: 'A product with this ISBN already exists.',
      order_number: 'This order number already exists.',
    };
    return res.status(409).json({ message: messages[field] || `A record with this ${field} already exists.` });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({ message: 'Record not found.' });
  }

  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 ? 'Internal server error' : err.message;

  res.status(statusCode).json({ message });
};

module.exports = { errorHandler };
