import axios from 'axios';

const SEARCH_URL = 'https://openlibrary.org/search.json';
const COVER_URL = 'https://covers.openlibrary.org/b';

const getCover = (coverId, size = 'L') => {
  if (!coverId) return null;
  return `${COVER_URL}/id/${coverId}-${size}.jpg`;
};

const mapBook = (doc) => {
  const price = Math.floor(Math.random() * 60) + 20;
  const comparePrice = Math.random() > 0.6 ? Math.round(price * 1.3) : null;
  const cover = getCover(doc.cover_i);

  return {
    id: doc.key || `ol-${doc.cover_i || Math.random()}`,
    title: doc.title || 'Untitled',
    titleAr: null,
    slug: doc.key?.replace('/works/', '') || `ol-${doc.cover_i}`,
    author: doc.author_name?.join(', ') || 'Unknown',
    authorAr: null,
    description: doc.first_sentence?.join(' ') || '',
    descriptionAr: null,
    price,
    compareAtPrice: comparePrice,
    coverImage: null,
    _googleCover: cover,
    publisher: doc.publisher?.[0] || null,
    publisherAr: null,
    publishedDate: doc.first_publish_year ? `${doc.first_publish_year}-01-01` : null,
    language: doc.language?.[0] || 'en',
    pages: doc.number_of_pages_median || null,
    isbn: doc.isbn?.[0] || null,
    stock: Math.floor(Math.random() * 50) + 5,
    averageRating: doc.ratings_average?.toFixed(1) || (Math.random() * 2 + 3).toFixed(1),
    reviewCount: doc.ratings_count || Math.floor(Math.random() * 200),
    isFeatured: true,
    isActive: true,
    category: {
      id: 'ol',
      name: doc.subject?.[0] || 'Books',
      nameAr: 'كتب',
      slug: 'books',
    },
  };
};

export const fetchBooks = async (query, limit = 10) => {
  try {
    const res = await axios.get(SEARCH_URL, {
      params: {
        q: query,
        limit,
        fields: 'key,title,author_name,cover_i,first_publish_year,number_of_pages_median,publisher,isbn,subject,language,ratings_average,ratings_count,first_sentence',
        lang: 'en',
      },
    });
    // Only return books that have covers
    return (res.data.docs || [])
      .filter((doc) => doc.cover_i)
      .map(mapBook);
  } catch (err) {
    console.error('Open Library API error:', err);
    return [];
  }
};

export const fetchBookByKey = async (key) => {
  try {
    const res = await axios.get(`https://openlibrary.org/works/${key}.json`);
    const data = res.data;

    // Get author names
    let authorNames = [];
    if (data.authors) {
      const authorPromises = data.authors.map(async (a) => {
        const authorKey = a.author?.key || a.key;
        if (!authorKey) return 'Unknown';
        try {
          const authorRes = await axios.get(`https://openlibrary.org${authorKey}.json`);
          return authorRes.data.name || 'Unknown';
        } catch {
          return 'Unknown';
        }
      });
      authorNames = await Promise.all(authorPromises);
    }

    const cover = data.covers?.[0] ? getCover(data.covers[0]) : null;
    const description = typeof data.description === 'string'
      ? data.description
      : data.description?.value || '';

    return {
      id: data.key,
      title: data.title || 'Untitled',
      titleAr: null,
      slug: key,
      author: authorNames.join(', ') || 'Unknown',
      authorAr: null,
      description,
      descriptionAr: null,
      price: Math.floor(Math.random() * 60) + 20,
      compareAtPrice: null,
      coverImage: null,
      _googleCover: cover,
      publisher: null,
      publisherAr: null,
      publishedDate: data.first_publish_date || null,
      language: 'en',
      pages: null,
      isbn: null,
      stock: 30,
      averageRating: (Math.random() * 2 + 3).toFixed(1),
      reviewCount: Math.floor(Math.random() * 200),
      isFeatured: true,
      isActive: true,
      category: {
        id: 'ol',
        name: data.subjects?.[0] || 'Books',
        nameAr: 'كتب',
        slug: 'books',
      },
      reviews: [],
    };
  } catch (err) {
    console.error('Open Library work fetch error:', err);
    return null;
  }
};
