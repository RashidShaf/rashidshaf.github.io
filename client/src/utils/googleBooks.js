import axios from 'axios';

const GOOGLE_BOOKS_URL = 'https://www.googleapis.com/books/v1/volumes';

const mapBook = (item) => {
  const info = item.volumeInfo || {};
  const sale = item.saleInfo || {};
  const price = sale.listPrice?.amount || Math.floor(Math.random() * 60) + 20;
  const comparePrice = Math.random() > 0.6 ? Math.round(price * 1.3) : null;
  const cover = info.imageLinks?.thumbnail?.replace('http://', 'https://') || null;

  return {
    id: item.id,
    title: info.title || 'Untitled',
    titleAr: null,
    slug: item.id,
    author: info.authors?.join(', ') || 'Unknown',
    authorAr: null,
    description: info.description || '',
    descriptionAr: null,
    price: price,
    compareAtPrice: comparePrice,
    coverImage: null,
    _googleCover: cover,
    publisher: info.publisher || null,
    publisherAr: null,
    publishedDate: info.publishedDate || null,
    language: info.language || 'en',
    pages: info.pageCount || null,
    stock: Math.floor(Math.random() * 50) + 5,
    averageRating: info.averageRating || (Math.random() * 2 + 3).toFixed(1),
    reviewCount: info.ratingsCount || Math.floor(Math.random() * 200),
    isFeatured: true,
    isActive: true,
    category: {
      id: 'google',
      name: info.categories?.[0] || 'Books',
      nameAr: 'كتب',
      slug: 'books',
    },
  };
};

export const fetchGoogleBooks = async (query, maxResults = 8) => {
  try {
    const res = await axios.get(GOOGLE_BOOKS_URL, {
      params: { q: query, maxResults, langRestrict: 'en', orderBy: 'relevance', printType: 'books' },
    });
    return (res.data.items || []).map(mapBook);
  } catch (err) {
    console.error('Google Books API error:', err);
    return [];
  }
};

export const fetchMultipleQueries = async (queries) => {
  const results = await Promise.all(queries.map((q) => fetchGoogleBooks(q.query, q.max || 8)));
  return results;
};
