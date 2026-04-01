import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiFilter, FiX, FiChevronDown, FiChevronLeft, FiChevronRight, FiStar } from 'react-icons/fi';
import PageTransition from '../animations/PageTransition';
import BookCard from '../components/books/BookCard';
import useLanguageStore from '../stores/useLanguageStore';
import api from '../utils/api';

const sortOptions = [
  { value: 'newest', labelKey: 'books.sortOptions.newest' },
  { value: 'price_asc', labelKey: 'books.sortOptions.priceAsc' },
  { value: 'price_desc', labelKey: 'books.sortOptions.priceDesc' },
  { value: 'rating', labelKey: 'books.sortOptions.rating' },
  { value: 'bestselling', labelKey: 'books.sortOptions.bestselling' },
];

const sectionOptions = [
  { value: '', labelKey: 'common.viewAll' },
  { value: 'featured', labelKey: 'home.featured' },
  { value: 'bestseller', labelKey: 'home.bestsellers' },
  { value: 'new', labelKey: 'home.newArrivals' },
  { value: 'trending', labelKey: 'home.trending' },
];

const Books = () => {
  const { t, language } = useLanguageStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortOpen, setSortOpen] = useState(false);
  const [sectionOpen, setSectionOpen] = useState(false);
  const [expandedCats, setExpandedCats] = useState({});
  const sortRef = useRef(null);
  const sectionRef = useRef(null);

  const toggleExpand = (catId) => {
    setExpandedCats((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClick = (e) => {
      if (sortRef.current && !sortRef.current.contains(e.target)) setSortOpen(false);
      if (sectionRef.current && !sectionRef.current.contains(e.target)) setSectionOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || '';
  const sort = searchParams.get('sort') || 'newest';
  const bookLang = searchParams.get('language') || '';
  const section = searchParams.get('section') || '';
  const authorFilter = searchParams.get('author') || '';
  const publisherFilter = searchParams.get('publisher') || '';
  const page = parseInt(searchParams.get('page') || '1');

  const updateParam = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    if (key !== 'page') params.delete('page');
    setSearchParams(params);
  };

  useEffect(() => {
    api.get('/categories').then((res) => {
      const cats = res.data;
      setCategories(cats);
      // Auto-expand the category matching the URL param
      if (category) {
        const parent = cats.find((c) => c.slug === category);
        if (parent) {
          setExpandedCats((prev) => ({ ...prev, [parent.id]: true }));
        } else {
          // Check Level 2
          const parentOfChild = cats.find((c) => c.children?.some((s) => s.slug === category));
          if (parentOfChild) {
            setExpandedCats((prev) => ({ ...prev, [parentOfChild.id]: true }));
          } else {
            // Check Level 3: find the Level 2 parent and its Level 1 grandparent
            for (const topCat of cats) {
              if (!topCat.children) continue;
              for (const sub of topCat.children) {
                if (sub.children?.some((l3) => l3.slug === category)) {
                  setExpandedCats((prev) => ({ ...prev, [topCat.id]: true, [sub.id]: true }));
                  break;
                }
              }
            }
          }
        }
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const fetchBooks = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('page', page);
        params.set('limit', '20');
        if (search) params.set('search', search);
        if (category) params.set('category', category);
        if (bookLang) params.set('language', bookLang);
        if (section) params.set('section', section);
        if (sort) params.set('sort', sort);
        if (authorFilter) params.set('author', authorFilter);
        if (publisherFilter) params.set('publisher', publisherFilter);

        const res = await api.get(`/books?${params}`);
        setBooks(res.data.data || res.data);
        setPagination(res.data.pagination || null);
      } catch (err) {
        console.error('Failed to load books:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBooks();
  }, [search, category, sort, bookLang, section, authorFilter, publisherFilter, page]);

  const getName = (item) => language === 'ar' && item.nameAr ? item.nameAr : item.name;
  const hasActiveFilters = category || bookLang || section || authorFilter || publisherFilter;
  const totalBooks = pagination?.total || books.length;

  // Dynamic page title based on selected category
  const getPageTitle = () => {
    if (!category) return t('books.title');
    for (const cat of categories) {
      if (cat.slug === category) return `${t('books.browse')} ${getName(cat)}`;
      if (cat.children) {
        for (const sub of cat.children) {
          if (sub.slug === category) return `${t('books.browse')} ${getName(sub)}`;
          if (sub.children) {
            const l3 = sub.children.find((s) => s.slug === category);
            if (l3) return `${t('books.browse')} ${getName(l3)}`;
          }
        }
      }
    }
    // Fallback: capitalize the slug while categories are loading
    if (category) return `${t('books.browse')} ${category.charAt(0).toUpperCase() + category.slice(1).replace(/-/g, ' ')}`;
    return t('books.title');
  };

  return (
    <PageTransition>
      <div className="mx-auto px-4 sm:px-6 lg:px-6 xl:px-8 3xl:px-12 py-4">
        <div className="flex gap-4 lg:gap-8">
          {/* Sidebar Filters */}
          {/* Mobile filter backdrop */}
          {filtersOpen && (
            <div className="fixed inset-0 z-50 bg-black/40 lg:hidden" onClick={() => setFiltersOpen(false)} />
          )}

          <aside className={`
            ${filtersOpen ? 'fixed right-0 rtl:right-auto rtl:left-0 top-0 bottom-0 z-50 w-[min(80vw,288px)] bg-background p-5 shadow-2xl overflow-y-auto' : 'hidden'}
            lg:block lg:static lg:w-52 3xl:w-64 lg:p-0 lg:shadow-none lg:bg-transparent flex-shrink-0
          `}>
            <div className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:pb-8"
              style={{ scrollbarWidth: 'thin' }}
            >
              {filtersOpen && (
                <div className="flex items-center justify-between mb-6 lg:hidden">
                  <h3 className="text-lg font-semibold text-foreground">{t('books.filters')}</h3>
                  <button onClick={() => setFiltersOpen(false)} className="p-1 text-foreground/60 hover:text-foreground">
                    <FiX size={20} />
                  </button>
                </div>
              )}

              {/* Category */}
              <div className="mb-6">
                <label className="text-xs 3xl:text-base font-semibold text-foreground/50 uppercase tracking-wider mb-2 block">
                  {t('books.category')}
                </label>
                <div className="space-y-0.5">
                  {categories.map((cat) => {
                    const hasChildren = cat.children && cat.children.length > 0;
                    const isSelected = category === cat.slug;
                    const childSelected = cat.children?.some((s) => s.slug === category);
                    const grandchildSelected = cat.children?.some((s) => s.children?.some((l3) => l3.slug === category));
                    const isExpanded = expandedCats[cat.id] || isSelected || childSelected || grandchildSelected;
                    return (
                      <div key={cat.id}>
                        <div className="flex items-center">
                          <button
                            onClick={() => { updateParam('category', cat.slug); if (hasChildren) setExpandedCats((prev) => ({ ...prev, [cat.id]: true })); }}
                            className={`flex-1 text-start py-1.5 text-sm 3xl:text-lg font-medium transition-colors ${
                              isSelected ? 'text-accent' : 'text-foreground hover:text-accent'
                            }`}
                          >
                            {getName(cat)}
                          </button>
                          {hasChildren && (
                            <button onClick={() => toggleExpand(cat.id)} className="p-1 text-foreground/60 hover:text-foreground transition-colors">
                              <FiChevronDown size={14} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>
                          )}
                        </div>
                        {hasChildren && isExpanded && (
                          <div className="ps-3 border-s border-muted/15 ms-2 space-y-0.5 mb-1">
                            {cat.children.map((sub) => {
                              const subHasChildren = sub.children && sub.children.length > 0;
                              const subSelected = category === sub.slug;
                              const subChildSelected = sub.children?.some((l3) => l3.slug === category);
                              const subExpanded = expandedCats[sub.id] || subSelected || subChildSelected;
                              return (
                                <div key={sub.id}>
                                  <div className="flex items-center">
                                    <button
                                      onClick={() => { updateParam('category', sub.slug); if (subHasChildren) setExpandedCats((prev) => ({ ...prev, [sub.id]: true })); }}
                                      className={`flex-1 text-start py-1 text-sm 3xl:text-lg transition-colors ${
                                        subSelected ? 'text-accent font-medium' : 'text-foreground/60 hover:text-accent'
                                      }`}
                                    >
                                      {getName(sub)}
                                    </button>
                                    {subHasChildren && (
                                      <button onClick={() => toggleExpand(sub.id)} className="p-0.5 text-foreground/40 hover:text-foreground transition-colors">
                                        <FiChevronDown size={12} className={`transition-transform ${subExpanded ? 'rotate-180' : ''}`} />
                                      </button>
                                    )}
                                  </div>
                                  {subHasChildren && subExpanded && (
                                    <div className="ps-3 border-s border-muted/10 ms-1.5 space-y-0.5 mb-0.5">
                                      {sub.children.map((l3) => (
                                        <button
                                          key={l3.id}
                                          onClick={() => updateParam('category', l3.slug)}
                                          className={`w-full text-start py-0.5 text-[13px] transition-colors ${
                                            category === l3.slug ? 'text-accent font-medium' : 'text-foreground/45 hover:text-accent'
                                          }`}
                                        >
                                          {getName(l3)}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Language */}
              <div className="mb-6">
                <label className="text-xs 3xl:text-base font-semibold text-foreground/50 uppercase tracking-wider mb-2 block">
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
                      className={`w-full text-start py-1.5 text-sm 3xl:text-lg transition-colors ${
                        bookLang === opt.value ? 'text-accent font-medium' : 'text-foreground/70 hover:text-accent'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Author */}
              <div className="mb-6">
                <label className="text-xs 3xl:text-base font-semibold text-foreground/50 uppercase tracking-wider mb-2 block">
                  {t('books.author')}
                </label>
                <input
                  type="text"
                  value={authorFilter}
                  onChange={(e) => updateParam('author', e.target.value)}
                  placeholder={t('books.authorPlaceholder')}
                  className="w-full px-3 py-2 bg-surface border border-gray-300 rounded-lg text-sm text-foreground placeholder:text-muted/40 focus:outline-none focus:border-accent"
                />
              </div>

              {/* Publisher */}
              <div className="mb-6">
                <label className="text-xs 3xl:text-base font-semibold text-foreground/50 uppercase tracking-wider mb-2 block">
                  {t('books.publisher')}
                </label>
                <input
                  type="text"
                  value={publisherFilter}
                  onChange={(e) => updateParam('publisher', e.target.value)}
                  placeholder={t('books.publisherPlaceholder')}
                  className="w-full px-3 py-2 bg-surface border border-gray-300 rounded-lg text-sm text-foreground placeholder:text-muted/40 focus:outline-none focus:border-accent"
                />
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

          </aside>

          {/* Books Grid */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
              <div>
                <h1 className="text-2xl 3xl:text-4xl font-display font-bold text-foreground">
                  {getPageTitle()}
                </h1>
                <p className="text-sm text-foreground/50 mt-0.5">
                  {totalBooks} {t('common.results').toLowerCase()}
                </p>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                {/* Collection filter */}
                <div className="relative" ref={sectionRef}>
                  <button
                    onClick={() => { setSectionOpen(!sectionOpen); setSortOpen(false); }}
                    className="flex items-center gap-2 bg-surface border border-muted/40 rounded-lg px-4 py-2 pe-9 text-sm text-foreground focus:outline-none focus:border-accent cursor-pointer"
                  >
                    {t(sectionOptions.find((o) => o.value === section)?.labelKey || 'books.section')}
                    <FiChevronDown className={`absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/60 transition-transform ${sectionOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {sectionOpen && (
                    <div className="absolute top-full mt-1 left-0 sm:left-auto sm:right-0 rtl:left-auto rtl:right-0 rtl:sm:right-auto rtl:sm:left-0 bg-surface border border-muted/15 rounded-xl shadow-xl z-50 min-w-[180px] py-1">
                      {sectionOptions.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => { updateParam('section', opt.value); setSectionOpen(false); }}
                          className={`w-full text-start px-4 py-2.5 text-sm transition-colors ${
                            section === opt.value ? 'bg-accent text-white font-semibold' : 'text-foreground hover:bg-accent/10 hover:text-accent'
                          }`}
                        >
                          {t(opt.labelKey)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Sort */}
                <div className="relative" ref={sortRef}>
                  <button
                    onClick={() => { setSortOpen(!sortOpen); setSectionOpen(false); }}
                    className="flex items-center gap-2 bg-surface border border-muted/40 rounded-lg px-4 py-2 pe-9 text-sm text-foreground focus:outline-none focus:border-accent cursor-pointer"
                  >
                    {t(sortOptions.find((o) => o.value === sort)?.labelKey || sortOptions[0].labelKey)}
                    <FiChevronDown className={`absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/60 transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {sortOpen && (
                    <div className="absolute top-full mt-1 left-0 sm:left-auto sm:right-0 rtl:left-auto rtl:right-0 rtl:sm:right-auto rtl:sm:left-0 bg-surface border border-muted/15 rounded-xl shadow-xl z-50 min-w-[180px] py-1">
                      {sortOptions.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => { updateParam('sort', opt.value); setSortOpen(false); }}
                          className={`w-full text-start px-4 py-2.5 text-sm transition-colors ${
                            sort === opt.value ? 'bg-accent text-white font-semibold' : 'text-foreground hover:bg-accent/10 hover:text-accent'
                          }`}
                        >
                          {t(opt.labelKey)}
                        </button>
                      ))}
                    </div>
                  )}
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

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 3xl:grid-cols-6 gap-3">
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
            ) : books.length === 0 ? (
              <div className="bg-surface rounded-xl p-16 text-center border border-muted/10">
                <p className="text-foreground/50 text-lg">{t('common.noResults')}</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 3xl:grid-cols-6 gap-3">
                  {books.map((book) => <BookCard key={book.id} book={book} />)}
                </div>

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <button
                      disabled={page <= 1}
                      onClick={() => updateParam('page', (page - 1).toString())}
                      className="p-2 rounded-lg border border-muted/20 text-foreground disabled:opacity-30 hover:bg-surface-alt transition-colors"
                    >
                      <FiChevronLeft size={18} />
                    </button>
                    <span className="text-sm text-foreground/70 px-3">
                      {page} / {pagination.totalPages}
                    </span>
                    <button
                      disabled={page >= pagination.totalPages}
                      onClick={() => updateParam('page', (page + 1).toString())}
                      className="p-2 rounded-lg border border-muted/20 text-foreground disabled:opacity-30 hover:bg-surface-alt transition-colors"
                    >
                      <FiChevronRight size={18} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default Books;
