import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiFilter, FiX, FiChevronDown, FiStar } from 'react-icons/fi';
import PageTransition from '../animations/PageTransition';
import BookCard from '../components/books/BookCard';
import useLanguageStore from '../stores/useLanguageStore';
import api from '../utils/api';
import { fetchBooks as fetchOpenLibrary } from '../utils/openLibrary';

const sortOptions = [
  { value: 'newest', labelKey: 'books.sortOptions.newest' },
  { value: 'price_asc', labelKey: 'books.sortOptions.priceAsc' },
  { value: 'price_desc', labelKey: 'books.sortOptions.priceDesc' },
  { value: 'rating', labelKey: 'books.sortOptions.rating' },
  { value: 'bestselling', labelKey: 'books.sortOptions.bestselling' },
];

const Books = () => {
  const { t, language } = useLanguageStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const [allBooks, setAllBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || '';
  const sort = searchParams.get('sort') || 'newest';
  const bookLang = searchParams.get('language') || '';
  const minRating = searchParams.get('rating') || '';

  const updateParam = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    setSearchParams(params);
  };

  useEffect(() => {
    api.get('/categories').then((res) => setCategories(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const fetchBooks = async () => {
      setLoading(true);
      try {
        const query = search || 'popular books';
        const results = await fetchOpenLibrary(query, 40);
        setAllBooks(results);
      } catch (err) {
        console.error('Failed to load books:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBooks();
  }, [search]);

  // Client-side filtering + sorting
  const filteredBooks = allBooks.filter((book) => {
    if (bookLang && book.language !== bookLang) return false;
    if (minRating && parseFloat(book.averageRating) < parseFloat(minRating)) return false;
    return true;
  }).sort((a, b) => {
    if (sort === 'price_asc') return a.price - b.price;
    if (sort === 'price_desc') return b.price - a.price;
    if (sort === 'rating') return parseFloat(b.averageRating) - parseFloat(a.averageRating);
    if (sort === 'bestselling') return b.reviewCount - a.reviewCount;
    return 0;
  });

  const getName = (item) => language === 'ar' && item.nameAr ? item.nameAr : item.name;
  const hasActiveFilters = category || bookLang || minRating;

  return (
    <PageTransition>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">
              {t('books.title')}
            </h1>
            <p className="text-sm text-foreground/50 mt-0.5">
              {filteredBooks.length} {t('nav.books').toLowerCase()}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <select
                value={sort}
                onChange={(e) => updateParam('sort', e.target.value)}
                className="appearance-none bg-surface border border-muted/15 rounded-lg px-4 py-2 pe-9 text-sm text-foreground focus:outline-none focus:border-accent cursor-pointer"
              >
                {sortOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>
                ))}
              </select>
              <FiChevronDown className="absolute right-3 rtl:right-auto rtl:left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
            </div>

            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className={`lg:hidden flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${
                hasActiveFilters ? 'border-accent text-accent bg-accent/5' : 'border-muted/15 text-foreground'
              }`}
            >
              <FiFilter size={16} />
              {t('books.filters')}
            </button>
          </div>
        </div>

        <div className="flex gap-8">
          {/* Sidebar Filters */}
          <aside className={`
            ${filtersOpen ? 'fixed inset-0 z-50 bg-black/40 lg:static lg:bg-transparent' : 'hidden lg:block'}
            lg:w-52 flex-shrink-0
          `}>
            <div className={`
              ${filtersOpen ? 'absolute right-0 rtl:right-auto rtl:left-0 top-0 h-full w-72 bg-background p-6 shadow-2xl overflow-y-auto' : ''}
              lg:static lg:p-0 lg:shadow-none lg:w-auto lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto
            `}
              style={{ scrollbarWidth: 'thin' }}
            >
              {filtersOpen && (
                <div className="flex items-center justify-between mb-6 lg:hidden">
                  <h3 className="text-lg font-semibold text-foreground">{t('books.filters')}</h3>
                  <button onClick={() => setFiltersOpen(false)} className="p-1 text-muted hover:text-foreground">
                    <FiX size={20} />
                  </button>
                </div>
              )}

              {/* Category */}
              <div className="mb-6">
                <label className="text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-2 block">
                  {t('books.category')}
                </label>
                <div className="space-y-0.5">
                  <button
                    onClick={() => updateParam('category', '')}
                    className={`w-full text-start py-1.5 text-sm transition-colors ${
                      !category ? 'text-accent font-medium' : 'text-foreground/70 hover:text-accent'
                    }`}
                  >
                    {t('common.viewAll')}
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => updateParam('category', cat.slug)}
                      className={`w-full text-start py-1.5 text-sm transition-colors ${
                        category === cat.slug ? 'text-accent font-medium' : 'text-foreground/70 hover:text-accent'
                      }`}
                    >
                      {getName(cat)}
                      <span className="text-foreground/30 ms-1">({cat._count?.books || 0})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Language */}
              <div className="mb-6">
                <label className="text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-2 block">
                  {t('books.language')}
                </label>
                <div className="space-y-0.5">
                  {[
                    { value: '', label: language === 'ar' ? 'الكل' : 'All' },
                    { value: 'en', label: language === 'ar' ? 'إنجليزي' : 'English' },
                    { value: 'ar', label: language === 'ar' ? 'عربي' : 'Arabic' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => updateParam('language', opt.value)}
                      className={`w-full text-start py-1.5 text-sm transition-colors ${
                        bookLang === opt.value ? 'text-accent font-medium' : 'text-foreground/70 hover:text-accent'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rating */}
              <div className="mb-6">
                <label className="text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-2 block">
                  {language === 'ar' ? 'التقييم' : 'Rating'}
                </label>
                <div className="space-y-1">
                  {[
                    { value: '', label: language === 'ar' ? 'الكل' : 'Any' },
                    { value: '4', label: '4+' },
                    { value: '3', label: '3+' },
                    { value: '2', label: '2+' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => updateParam('rating', opt.value)}
                      className={`w-full text-start py-1.5 flex items-center gap-1.5 text-sm transition-colors ${
                        minRating === opt.value ? 'text-accent font-medium' : 'text-foreground/70 hover:text-accent'
                      }`}
                    >
                      {opt.value ? (
                        <>
                          <div className="flex items-center gap-0.5">
                            {[...Array(5)].map((_, i) => (
                              <FiStar
                                key={i}
                                size={12}
                                className={i < parseInt(opt.value) ? 'text-yellow-500 fill-yellow-500' : 'text-foreground/15'}
                              />
                            ))}
                          </div>
                          <span>& {language === 'ar' ? 'فوق' : 'up'}</span>
                        </>
                      ) : (
                        opt.label
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <button
                  onClick={() => setSearchParams({})}
                  className="w-full py-2 text-sm text-red-500 hover:text-red-600 transition-colors"
                >
                  {language === 'ar' ? 'مسح الفلاتر' : 'Clear all filters'}
                </button>
              )}
            </div>

            {filtersOpen && (
              <div className="absolute inset-0 lg:hidden" onClick={() => setFiltersOpen(false)} />
            )}
          </aside>

          {/* Books Grid */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="bg-surface-alt rounded-lg animate-pulse">
                    <div className="aspect-[5/6] bg-muted/10 rounded-t-lg" />
                    <div className="p-3 space-y-2">
                      <div className="h-3 bg-muted/10 rounded w-2/3" />
                      <div className="h-2.5 bg-muted/10 rounded w-1/2" />
                      <div className="h-3 bg-muted/10 rounded w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredBooks.length === 0 ? (
              <div className="bg-surface rounded-xl p-16 text-center border border-muted/10">
                <p className="text-foreground/50 text-lg">{t('common.noResults')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredBooks.map((book) => <BookCard key={book.id} book={book} />)}
              </div>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default Books;
