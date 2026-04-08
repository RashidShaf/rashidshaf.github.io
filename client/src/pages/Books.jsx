import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiFilter, FiX, FiChevronDown } from 'react-icons/fi';
import PageTransition from '../animations/PageTransition';
import BookCard from '../components/books/BookCard';
import LogoOverlay from '../components/common/LogoOverlay';
import useLanguageStore from '../stores/useLanguageStore';
import api from '../utils/api';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '');

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
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOpen, setSortOpen] = useState(false);
  const [sectionOpen, setSectionOpen] = useState(false);
  const [expandedCats, setExpandedCats] = useState({});
  const [scopedParentSlug, setScopedParentSlug] = useState('');
  const [availableAuthors, setAvailableAuthors] = useState([]);
  const [availablePublishers, setAvailablePublishers] = useState([]);
  const [availableBrands, setAvailableBrands] = useState([]);
  const [availableColors, setAvailableColors] = useState([]);
  const [availableMaterials, setAvailableMaterials] = useState([]);
  const [authorsOpen, setAuthorsOpen] = useState(false);
  const [publishersOpen, setPublishersOpen] = useState(false);
  const [brandsOpen, setBrandsOpen] = useState(false);
  const [colorsOpen, setColorsOpen] = useState(false);
  const [materialsOpen, setMaterialsOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [categoryBanners, setCategoryBanners] = useState([]);
  const [filterConfig, setFilterConfig] = useState(null);
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
  const selectedCategories = category ? category.split(',').filter(Boolean) : [];
  const sort = searchParams.get('sort') || 'newest';
  const bookLang = searchParams.get('language') || '';
  const section = searchParams.get('section') || '';
  const authorFilter = searchParams.get('author') || '';
  const selectedAuthors = authorFilter ? authorFilter.split(',').filter(Boolean) : [];
  const publisherFilter = searchParams.get('publisher') || '';
  const selectedPublishers = publisherFilter ? publisherFilter.split(',').filter(Boolean) : [];
  const brandFilter = searchParams.get('brand') || '';
  const selectedBrands = brandFilter ? brandFilter.split(',').filter(Boolean) : [];
  const colorFilter = searchParams.get('color') || '';
  const selectedColors = colorFilter ? colorFilter.split(',').filter(Boolean) : [];
  const materialFilter = searchParams.get('material') || '';
  const selectedMaterials = materialFilter ? materialFilter.split(',').filter(Boolean) : [];

  const updateParam = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    if (key !== 'page') params.delete('page');
    setSearchParams(params);
  };

  const toggleCategory = (slug) => {
    const wasDirectlySelected = selectedCategories.includes(slug);
    if (wasDirectlySelected || isCatSelected(slug)) {
      // Deselecting — remove slug and all its children
      let current = selectedCategories.filter((s) => s !== slug);
      for (const topCat of categories) {
        if (topCat.slug === slug && topCat.children) {
          const childSlugs = topCat.children.flatMap((s) => [s.slug, ...(s.children?.map((l3) => l3.slug) || [])]);
          current = current.filter((s) => !childSlugs.includes(s));
        }
        if (topCat.children) {
          const sub = topCat.children.find((s) => s.slug === slug);
          if (sub && sub.children) {
            const l3Slugs = sub.children.map((l3) => l3.slug);
            current = current.filter((s) => !l3Slugs.includes(s));
          }
        }
      }
      // Only re-add L2 parent if this was a directly selected L3 (not a parent uncheck)
      if (wasDirectlySelected) {
        for (const topCat of categories) {
          if (topCat.children) {
            for (const sub of topCat.children) {
              if (sub.children?.some((l3) => l3.slug === slug)) {
                const hasOtherL3 = sub.children.some((l3) => l3.slug !== slug && current.includes(l3.slug));
                if (!hasOtherL3 && !current.includes(sub.slug)) {
                  current.push(sub.slug);
                }
              }
            }
          }
        }
      }
      // If nothing left, re-add the top-level parent so sidebar stays scoped and category bar stays active
      if (current.length === 0 && scopedParentSlug) {
        current.push(scopedParentSlug);
      }
      updateParam('category', current.join(','));
    } else {
      // Selecting — remove parent slugs so only the selected level filters
      let current = [...selectedCategories];
      for (const topCat of categories) {
        // L2 selected: remove L1 parent
        const isL2 = topCat.children?.some((s) => s.slug === slug);
        if (isL2 && current.includes(topCat.slug)) {
          current = current.filter((s) => s !== topCat.slug);
        }
        // L3 selected: remove L1 parent and L2 parent
        if (topCat.children) {
          for (const sub of topCat.children) {
            if (sub.children?.some((l3) => l3.slug === slug)) {
              current = current.filter((s) => s !== topCat.slug && s !== sub.slug);
            }
          }
        }
      }
      current.push(slug);
      updateParam('category', current.join(','));
    }
  };

  // Check if a category appears selected (directly or because a child is selected)
  const isCatSelected = (slug) => {
    if (selectedCategories.includes(slug)) return true;
    // L2 appears selected if any of its L3 children are selected
    for (const topCat of categories) {
      if (topCat.children) {
        const sub = topCat.children.find((s) => s.slug === slug);
        if (sub && sub.children?.some((l3) => selectedCategories.includes(l3.slug))) return true;
      }
    }
    return false;
  };

  useEffect(() => {
    api.get('/categories').then((res) => {
      const cats = res.data;
      setCategories(cats);
      // Auto-expand categories matching URL params
      const slugs = category ? category.split(',').filter(Boolean) : [];
      slugs.forEach((slug) => {
        for (const topCat of cats) {
          if (topCat.slug === slug) {
            setExpandedCats((prev) => ({ ...prev, [topCat.id]: true }));
            return;
          }
          if (topCat.children) {
            for (const sub of topCat.children) {
              if (sub.slug === slug) {
                setExpandedCats((prev) => ({ ...prev, [topCat.id]: true }));
                return;
              }
              if (sub.children?.some((l3) => l3.slug === slug)) {
                setExpandedCats((prev) => ({ ...prev, [topCat.id]: true, [sub.id]: true }));
                return;
              }
            }
          }
        }
      });
    }).catch(() => {});
  }, []);

  // Fetch available authors & publishers (scoped to category)
  useEffect(() => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    api.get(`/books/filters?${params}`).then((res) => {
      setAvailableAuthors(res.data.authors || []);
      setAvailablePublishers(res.data.publishers || []);
      setAvailableBrands(res.data.brands || []);
      setAvailableColors(res.data.colors || []);
      setAvailableMaterials(res.data.materials || []);
    }).catch(() => {});
  }, [category]);

  // Reset and fetch page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
    setBooks([]);
    setPagination(null);
    const fetchBooks = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('page', '1');
        params.set('limit', '20');
        if (search) params.set('search', search);
        if (category) params.set('category', category);
        if (bookLang) params.set('language', bookLang);
        if (section) params.set('section', section);
        if (sort) params.set('sort', sort);
        if (authorFilter) params.set('author', authorFilter);
        if (publisherFilter) params.set('publisher', publisherFilter);
        if (brandFilter) params.set('brand', brandFilter);
        if (colorFilter) params.set('color', colorFilter);
        if (materialFilter) params.set('material', materialFilter);

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
  }, [search, category, sort, bookLang, section, authorFilter, publisherFilter, brandFilter, colorFilter, materialFilter]);

  // Load more books (next page)
  const loadMore = async () => {
    if (loadingMore || !pagination || currentPage >= pagination.totalPages) return;
    const nextPage = currentPage + 1;
    setLoadingMore(true);
    try {
      const params = new URLSearchParams();
      params.set('page', nextPage.toString());
      params.set('limit', '20');
      if (search) params.set('search', search);
      if (category) params.set('category', category);
      if (bookLang) params.set('language', bookLang);
      if (section) params.set('section', section);
      if (sort) params.set('sort', sort);
      if (authorFilter) params.set('author', authorFilter);
      if (publisherFilter) params.set('publisher', publisherFilter);
      if (brandFilter) params.set('brand', brandFilter);
      if (colorFilter) params.set('color', colorFilter);
      if (materialFilter) params.set('material', materialFilter);

      const res = await api.get(`/books?${params}`);
      setBooks((prev) => [...prev, ...(res.data.data || res.data)]);
      setPagination(res.data.pagination || null);
      setCurrentPage(nextPage);
    } catch (err) {
      console.error('Failed to load more books:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Infinite scroll — trigger loadMore when near bottom
  const loadTriggerRef = useRef(null);
  useEffect(() => {
    const el = loadTriggerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMore(); },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  });

  const getName = (item) => language === 'ar' && item.nameAr ? item.nameAr : item.name;
  const hasActiveFilters = (category && category !== scopedParentSlug) || bookLang || section || authorFilter || publisherFilter || brandFilter || colorFilter || materialFilter;
  const isBooksDept = scopedParentSlug === 'books' || categories.find((c) => c.slug === 'books' && selectedCategories.includes('books'));
  const totalBooks = pagination?.total || books.length;

  // Find the top-level parent for any slug
  const findTopParent = (slugs) => {
    for (const slug of slugs) {
      const topMatch = categories.find((c) => c.slug === slug);
      if (topMatch) return topMatch;
      for (const topCat of categories) {
        if (topCat.children) {
          if (topCat.children.some((s) => s.slug === slug)) return topCat;
          for (const sub of topCat.children) {
            if (sub.children?.some((l3) => l3.slug === slug)) return topCat;
          }
        }
      }
    }
    return null;
  };

  // Track the scoped department via effect (avoids setState during render)
  useEffect(() => {
    if (selectedCategories.length > 0 && categories.length > 0) {
      const parent = findTopParent(selectedCategories);
      if (parent) setScopedParentSlug(parent.slug);
    } else {
      setScopedParentSlug('');
    }
  }, [category, categories]);

  // Fetch category-specific banners when top-level category changes
  useEffect(() => {
    if (scopedParentSlug) {
      api.get('/banners?category=' + scopedParentSlug).then((res) => {
        setCategoryBanners(res.data || []);
      }).catch(() => setCategoryBanners([]));
    } else {
      setCategoryBanners([]);
    }
  }, [scopedParentSlug]);

  // Fetch dynamic filter config when top-level category changes
  useEffect(() => {
    if (scopedParentSlug) {
      api.get('/categories/' + scopedParentSlug + '/filters').then((res) => {
        setFilterConfig(res.data || []);
      }).catch(() => setFilterConfig(null));
    } else {
      setFilterConfig(null);
    }
  }, [scopedParentSlug]);

  // Scope sidebar categories: show only the active department's children
  const getScopedCategories = () => {
    const parent = findTopParent(selectedCategories);
    if (parent) return parent.children;
    if (scopedParentSlug) {
      const remembered = categories.find((c) => c.slug === scopedParentSlug);
      if (remembered && remembered.children?.length > 0) return remembered.children;
    }
    return categories;
  };
  const sidebarCategories = getScopedCategories();

  // Dynamic page title based on selected categories
  const getPageTitle = () => {
    if (selectedCategories.length === 0) return t('books.title');
    if (selectedCategories.length > 2) return `${t('books.browse')} (${selectedCategories.length})`;
    const names = selectedCategories.map((slug) => {
      for (const cat of categories) {
        if (cat.slug === slug) return getName(cat);
        if (cat.children) {
          for (const sub of cat.children) {
            if (sub.slug === slug) return getName(sub);
            if (sub.children) {
              const l3 = sub.children.find((s) => s.slug === slug);
              if (l3) return getName(l3);
            }
          }
        }
      }
      return slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ');
    });
    return `${t('books.browse')} ${names.join(' & ')}`;
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
            <div className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:pb-8 overflow-x-hidden"
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

              {/* Category — multi-select (scoped to selected department) */}
              {sidebarCategories.length > 0 && (
              <div className="mb-6">
                <label className="text-xs 3xl:text-base font-semibold text-foreground/50 uppercase tracking-wider mb-2 block">
                  {t('books.category')}
                </label>
                <div className="space-y-0.5">
                  {sidebarCategories.map((cat) => {
                    const hasChildren = cat.children && cat.children.length > 0;
                    const isSelected = isCatSelected(cat.slug);
                    const childSelected = cat.children?.some((s) => isCatSelected(s.slug));
                    const grandchildSelected = cat.children?.some((s) => s.children?.some((l3) => isCatSelected(l3.slug)));
                    const isExpanded = expandedCats[cat.id] || isSelected || childSelected || grandchildSelected;
                    return (
                      <div key={cat.id}>
                        <div className="flex items-center">
                          <button
                            onClick={() => { toggleCategory(cat.slug); if (hasChildren) setExpandedCats((prev) => ({ ...prev, [cat.id]: true })); }}
                            className={`flex-1 flex items-center gap-2 text-start py-1.5 text-sm 3xl:text-lg font-medium transition-colors ${
                              isSelected ? 'text-accent' : 'text-foreground hover:text-accent'
                            }`}
                          >
                            <span className={`w-3.5 h-3.5 rounded border-2 flex-shrink-0 flex items-center justify-center ${isSelected ? 'bg-accent border-accent' : 'border-gray-300'}`}>
                              {isSelected && <span className="text-white text-[8px]">✓</span>}
                            </span>
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
                              const subSelected = isCatSelected(sub.slug);
                              const subChildSelected = sub.children?.some((l3) => isCatSelected(l3.slug));
                              const subExpanded = expandedCats[sub.id] || subSelected || subChildSelected;
                              return (
                                <div key={sub.id}>
                                  <div className="flex items-center">
                                    <button
                                      onClick={() => { toggleCategory(sub.slug); if (subHasChildren) setExpandedCats((prev) => ({ ...prev, [sub.id]: true })); }}
                                      className={`flex-1 flex items-center gap-2 text-start py-1 text-sm 3xl:text-lg transition-colors ${
                                        subSelected ? 'text-accent font-medium' : 'text-foreground/60 hover:text-accent'
                                      }`}
                                    >
                                      <span className={`w-3 h-3 rounded border-2 flex-shrink-0 flex items-center justify-center ${subSelected ? 'bg-accent border-accent' : 'border-gray-300'}`}>
                                        {subSelected && <span className="text-white text-[7px]">✓</span>}
                                      </span>
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
                                          onClick={() => toggleCategory(l3.slug)}
                                          className={`w-full flex items-center gap-2 text-start py-0.5 text-[13px] transition-colors ${
                                            isCatSelected(l3.slug) ? 'text-accent font-medium' : 'text-foreground/45 hover:text-accent'
                                          }`}
                                        >
                                          <span className={`w-2.5 h-2.5 rounded border-2 flex-shrink-0 flex items-center justify-center ${isCatSelected(l3.slug) ? 'bg-accent border-accent' : 'border-gray-300'}`}>
                                            {isCatSelected(l3.slug) && <span className="text-white text-[6px]">✓</span>}
                                          </span>
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
              )}

              {/* Dynamic filter sections — driven by filterConfig or hardcoded fallback */}
              {(() => {
                // Render a filter section by fieldKey, with a custom title
                const renderFilterSection = (fieldKey, title) => {
                  if (fieldKey === 'language') {
                    return (
                      <div key={fieldKey} className="mb-6">
                        <button
                          onClick={() => setLanguageOpen(!languageOpen)}
                          className="w-full flex items-center justify-between text-xs 3xl:text-base font-semibold text-foreground/50 uppercase tracking-wider mb-2"
                        >
                          {title}
                          <FiChevronDown size={14} className={`transition-transform ${languageOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {languageOpen && (
                          <div className="space-y-0.5">
                            {[
                              { value: 'en', label: language === 'ar' ? 'إنجليزي' : 'English' },
                              { value: 'ar', label: language === 'ar' ? 'عربي' : 'Arabic' },
                            ].map((opt) => {
                              const isSelected = bookLang === opt.value;
                              return (
                                <button
                                  key={opt.value}
                                  onClick={() => updateParam('language', isSelected ? '' : opt.value)}
                                  className={`w-full flex items-center gap-2 text-start py-1.5 text-sm transition-colors ${
                                    isSelected ? 'text-accent font-medium' : 'text-foreground/70 hover:text-accent'
                                  }`}
                                >
                                  <span className={`w-3 h-3 rounded border-2 flex-shrink-0 flex items-center justify-center ${isSelected ? 'bg-accent border-accent' : 'border-gray-300'}`}>
                                    {isSelected && <span className="text-white text-[7px]">✓</span>}
                                  </span>
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }

                  if (fieldKey === 'author' && availableAuthors.length > 0) {
                    return (
                      <div key={fieldKey} className="mb-6">
                        <button
                          onClick={() => setAuthorsOpen(!authorsOpen)}
                          className="w-full flex items-center justify-between text-xs 3xl:text-base font-semibold text-foreground/50 uppercase tracking-wider mb-2"
                        >
                          {title}
                          <FiChevronDown size={14} className={`transition-transform ${authorsOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {authorsOpen && (
                          <div className="space-y-0.5">
                            {availableAuthors.map((author) => {
                              const isSelected = selectedAuthors.includes(author);
                              return (
                                <button
                                  key={author}
                                  onClick={() => {
                                    const next = isSelected ? selectedAuthors.filter((a) => a !== author) : [...selectedAuthors, author];
                                    updateParam('author', next.join(','));
                                  }}
                                  className={`w-full flex items-center gap-2 text-start py-1.5 text-sm transition-colors ${
                                    isSelected ? 'text-accent font-medium' : 'text-foreground/70 hover:text-accent'
                                  }`}
                                >
                                  <span className={`w-3 h-3 rounded border-2 flex-shrink-0 flex items-center justify-center ${isSelected ? 'bg-accent border-accent' : 'border-gray-300'}`}>
                                    {isSelected && <span className="text-white text-[7px]">✓</span>}
                                  </span>
                                  {author}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }

                  if (fieldKey === 'publisher' && availablePublishers.length > 0) {
                    return (
                      <div key={fieldKey} className="mb-6">
                        <button
                          onClick={() => setPublishersOpen(!publishersOpen)}
                          className="w-full flex items-center justify-between text-xs 3xl:text-base font-semibold text-foreground/50 uppercase tracking-wider mb-2"
                        >
                          {title}
                          <FiChevronDown size={14} className={`transition-transform ${publishersOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {publishersOpen && (
                          <div className="space-y-0.5">
                            {availablePublishers.map((publisher) => {
                              const isSelected = selectedPublishers.includes(publisher);
                              return (
                                <button
                                  key={publisher}
                                  onClick={() => {
                                    const next = isSelected ? selectedPublishers.filter((p) => p !== publisher) : [...selectedPublishers, publisher];
                                    updateParam('publisher', next.join(','));
                                  }}
                                  className={`w-full flex items-center gap-2 text-start py-1.5 text-sm transition-colors ${
                                    isSelected ? 'text-accent font-medium' : 'text-foreground/70 hover:text-accent'
                                  }`}
                                >
                                  <span className={`w-3 h-3 rounded border-2 flex-shrink-0 flex items-center justify-center ${isSelected ? 'bg-accent border-accent' : 'border-gray-300'}`}>
                                    {isSelected && <span className="text-white text-[7px]">✓</span>}
                                  </span>
                                  {publisher}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }

                  if (fieldKey === 'brand' && availableBrands.length > 0) {
                    return (
                      <div key={fieldKey} className="mb-6">
                        <button
                          onClick={() => setBrandsOpen(!brandsOpen)}
                          className="w-full flex items-center justify-between text-xs 3xl:text-base font-semibold text-foreground/50 uppercase tracking-wider mb-2"
                        >
                          {title}
                          <FiChevronDown size={14} className={`transition-transform ${brandsOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {brandsOpen && (
                          <div className="space-y-0.5">
                            {availableBrands.map((brand) => {
                              const isSelected = selectedBrands.includes(brand);
                              return (
                                <button
                                  key={brand}
                                  onClick={() => {
                                    const next = isSelected ? selectedBrands.filter((b) => b !== brand) : [...selectedBrands, brand];
                                    updateParam('brand', next.join(','));
                                  }}
                                  className={`w-full flex items-center gap-2 text-start py-1.5 text-sm transition-colors ${
                                    isSelected ? 'text-accent font-medium' : 'text-foreground/70 hover:text-accent'
                                  }`}
                                >
                                  <span className={`w-3 h-3 rounded border-2 flex-shrink-0 flex items-center justify-center ${isSelected ? 'bg-accent border-accent' : 'border-gray-300'}`}>
                                    {isSelected && <span className="text-white text-[7px]">✓</span>}
                                  </span>
                                  {brand}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }

                  if (fieldKey === 'color' && availableColors.length > 0) {
                    return (
                      <div key={fieldKey} className="mb-6">
                        <button
                          onClick={() => setColorsOpen(!colorsOpen)}
                          className="w-full flex items-center justify-between text-xs 3xl:text-base font-semibold text-foreground/50 uppercase tracking-wider mb-2"
                        >
                          {title}
                          <FiChevronDown size={14} className={`transition-transform ${colorsOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {colorsOpen && (
                          <div className="space-y-0.5">
                            {availableColors.map((color) => {
                              const isSelected = selectedColors.includes(color);
                              return (
                                <button
                                  key={color}
                                  onClick={() => {
                                    const next = isSelected ? selectedColors.filter((c) => c !== color) : [...selectedColors, color];
                                    updateParam('color', next.join(','));
                                  }}
                                  className={`w-full flex items-center gap-2 text-start py-1.5 text-sm transition-colors ${
                                    isSelected ? 'text-accent font-medium' : 'text-foreground/70 hover:text-accent'
                                  }`}
                                >
                                  <span className={`w-3 h-3 rounded border-2 flex-shrink-0 flex items-center justify-center ${isSelected ? 'bg-accent border-accent' : 'border-gray-300'}`}>
                                    {isSelected && <span className="text-white text-[7px]">✓</span>}
                                  </span>
                                  {color}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }

                  if (fieldKey === 'material' && availableMaterials.length > 0) {
                    return (
                      <div key={fieldKey} className="mb-6">
                        <button
                          onClick={() => setMaterialsOpen(!materialsOpen)}
                          className="w-full flex items-center justify-between text-xs 3xl:text-base font-semibold text-foreground/50 uppercase tracking-wider mb-2"
                        >
                          {title}
                          <FiChevronDown size={14} className={`transition-transform ${materialsOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {materialsOpen && (
                          <div className="space-y-0.5">
                            {availableMaterials.map((mat) => {
                              const isSelected = selectedMaterials.includes(mat);
                              return (
                                <button
                                  key={mat}
                                  onClick={() => {
                                    const next = isSelected ? selectedMaterials.filter((m) => m !== mat) : [...selectedMaterials, mat];
                                    updateParam('material', next.join(','));
                                  }}
                                  className={`w-full flex items-center gap-2 text-start py-1.5 text-sm transition-colors ${
                                    isSelected ? 'text-accent font-medium' : 'text-foreground/70 hover:text-accent'
                                  }`}
                                >
                                  <span className={`w-3 h-3 rounded border-2 flex-shrink-0 flex items-center justify-center ${isSelected ? 'bg-accent border-accent' : 'border-gray-300'}`}>
                                    {isSelected && <span className="text-white text-[7px]">✓</span>}
                                  </span>
                                  {mat}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }

                  return null;
                };

                // If we fetched filter config and it's empty, admin wants no filters — show nothing
                if (Array.isArray(filterConfig) && filterConfig.length === 0) {
                  return null;
                }

                // If filterConfig is available and has entries, use it to control which filters appear and in what order
                if (filterConfig && filterConfig.length > 0) {
                  const keyToLabel = {
                    author: t('books.author'),
                    publisher: t('books.publisher'),
                    language: t('books.language'),
                    brand: t('books.brand'),
                    color: t('books.color'),
                    material: t('books.material'),
                    price: t('books.price'),
                  };
                  return filterConfig
                    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
                    .map((filter) => renderFilterSection(filter.fieldKey, keyToLabel[filter.fieldKey] || filter.fieldKey));
                }

                // Fallback: hardcoded filter behavior (backwards compatible)
                return (
                  <>
                    {(isBooksDept || !scopedParentSlug) && renderFilterSection('language', t('books.language'))}
                    {(isBooksDept || !scopedParentSlug) && renderFilterSection('author', t('books.author'))}
                    {(isBooksDept || !scopedParentSlug) && renderFilterSection('publisher', t('books.publisher'))}
                    {(!isBooksDept || !scopedParentSlug) && renderFilterSection('brand', t('books.brand'))}
                    {(!isBooksDept || !scopedParentSlug) && renderFilterSection('color', t('books.color'))}
                    {(!isBooksDept || !scopedParentSlug) && renderFilterSection('material', t('books.material'))}
                  </>
                );
              })()}

              {/* Clear Filters */}
              {hasActiveFilters && (
                <button
                  onClick={() => {
                    const params = new URLSearchParams();
                    if (scopedParentSlug) params.set('category', scopedParentSlug);
                    setSearchParams(params);
                  }}
                  className="w-full py-2 text-sm text-red-500 hover:text-red-600 transition-colors"
                >
                  {language === 'ar' ? 'مسح الفلاتر' : 'Clear all filters'}
                </button>
              )}
            </div>

          </aside>

          {/* Books Grid */}
          <div className="flex-1 min-w-0">
            {/* Category Banner */}
            {categoryBanners.length > 0 && (() => {
              const banner = categoryBanners[0];
              const desktopSrc = `${API_BASE}/${banner.desktopImage}`;
              const mobileSrc = banner.mobileImage ? `${API_BASE}/${banner.mobileImage}` : desktopSrc;
              const content = (
                <>
                  <img src={desktopSrc} alt={banner.title || ''} className="hidden sm:block w-full h-auto object-cover" />
                  <img src={mobileSrc} alt={banner.title || ''} className="block sm:hidden w-full h-auto object-cover" />
                  {banner.showLogo !== false && <LogoOverlay position={banner.logoPosition || 'center-left'} compact hideMobile={banner.showMobileLogo === false} />}
                </>
              );
              return (
                <div className="mb-4 relative overflow-hidden rounded-xl">
                  {banner.link ? (
                    <a href={banner.link} target="_blank" rel="noopener noreferrer">{content}</a>
                  ) : content}
                </div>
              );
            })()}

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

                {/* Infinite scroll trigger */}
                <div ref={loadTriggerRef} className="h-1" />
                {loadingMore && (
                  <div className="flex justify-center py-6">
                    <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
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
