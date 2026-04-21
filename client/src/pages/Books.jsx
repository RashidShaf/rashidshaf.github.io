import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiFilter, FiX, FiChevronDown } from 'react-icons/fi';
import PageTransition from '../animations/PageTransition';
import BookCard from '../components/books/BookCard';
import LogoOverlay from '../components/common/LogoOverlay';
import SEO from '../components/SEO';
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
  const [openFilter, setOpenFilter] = useState(null);
  const [categoryBanners, setCategoryBanners] = useState([]);
  const [filterConfig, setFilterConfig] = useState(null);
  const [availableCustomFields, setAvailableCustomFields] = useState({});
  const sortRef = useRef(null);
  const sectionRef = useRef(null);
  const filterDropdownRef = useRef(null);

  const toggleExpand = (catId) => {
    setExpandedCats((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClick = (e) => {
      if (sortRef.current && !sortRef.current.contains(e.target)) setSortOpen(false);
      if (sectionRef.current && !sectionRef.current.contains(e.target)) setSectionOpen(false);
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target)) setOpenFilter(null);
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
  // Collect all custom field filters as a single string for dependency tracking
  const customFieldParams = Array.from(searchParams.entries()).filter(([k]) => k.startsWith('cf_')).map(([k, v]) => `${k}=${v}`).join('&');

  const updateParam = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    if (key !== 'page') params.delete('page');
    setSearchParams(params);
  };

  const getAllDescendantSlugs = (cat) => {
    const slugs = [];
    cat.children?.forEach((child) => {
      slugs.push(child.slug);
      slugs.push(...getAllDescendantSlugs(child));
    });
    return slugs;
  };

  const toggleCategory = (slug) => {
    const wasDirectlySelected = selectedCategories.includes(slug);
    if (wasDirectlySelected || isCatSelected(slug)) {
      // Deselecting — remove slug and all its children
      let current = selectedCategories.filter((s) => s !== slug);
      for (const topCat of categories) {
        if (topCat.slug === slug && topCat.children) {
          const childSlugs = getAllDescendantSlugs(topCat);
          current = current.filter((s) => !childSlugs.includes(s));
        }
        if (topCat.children) {
          const sub = topCat.children.find((s) => s.slug === slug);
          if (sub && sub.children) {
            const descSlugs = getAllDescendantSlugs(sub);
            current = current.filter((s) => !descSlugs.includes(s));
          }
        }
      }
      // Only re-add L2 parent if this was a directly selected L3 (not a parent uncheck)
      if (wasDirectlySelected) {
        for (const topCat of categories) {
          if (topCat.children) {
            for (const sub of topCat.children) {
              const descSlugs = getAllDescendantSlugs(sub);
              if (descSlugs.includes(slug)) {
                const hasOtherDesc = descSlugs.some((ds) => ds !== slug && current.includes(ds));
                if (!hasOtherDesc && !current.includes(sub.slug)) {
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
        // Deeper child selected: remove all ancestor slugs
        if (topCat.children) {
          for (const sub of topCat.children) {
            const descSlugs = getAllDescendantSlugs(sub);
            if (descSlugs.includes(slug)) {
              current = current.filter((s) => s !== topCat.slug && s !== sub.slug);
              // Also remove any intermediate ancestors between sub and the slug
              const removeAncestors = (node) => {
                if (!node.children) return false;
                for (const child of node.children) {
                  if (child.slug === slug || removeAncestors(child)) {
                    current = current.filter((s) => s !== child.slug);
                    return true;
                  }
                }
                return false;
              };
              removeAncestors(sub);
            }
          }
        }
      }
      current.push(slug);
      updateParam('category', current.join(','));
    }
  };

  // Check if a category appears selected (directly or because a descendant is selected)
  const isCatSelected = (slug) => {
    if (selectedCategories.includes(slug)) return true;
    // A category appears selected if any of its descendants are selected
    const findCat = (nodes) => {
      for (const node of nodes) {
        if (node.slug === slug) return node;
        if (node.children) {
          const found = findCat(node.children);
          if (found) return found;
        }
      }
      return null;
    };
    const cat = findCat(categories);
    if (cat) {
      const descSlugs = getAllDescendantSlugs(cat);
      if (descSlugs.some((ds) => selectedCategories.includes(ds))) return true;
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
        // Recursively find a slug and return the path of ancestor IDs to expand
        const findAndExpand = (nodes, ancestors) => {
          for (const node of nodes) {
            if (node.slug === slug) {
              const expanded = {};
              ancestors.forEach((id) => { expanded[id] = true; });
              setExpandedCats((prev) => ({ ...prev, ...expanded }));
              return true;
            }
            if (node.children) {
              if (findAndExpand(node.children, [...ancestors, node.id])) return true;
            }
          }
          return false;
        };
        findAndExpand(cats, []);
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
      setAvailableCustomFields(res.data.customFieldValues || {});
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
        // Custom field filters
        searchParams.forEach((val, key) => { if (key.startsWith('cf_') && val) params.set(key, val); });

        const res = await api.get(`/books?${params}`);
        setBooks(res.data.data || res.data);
        setPagination(res.data.pagination || null);
      } catch (err) {
        // silently handle error
      } finally {
        setLoading(false);
      }
    };
    fetchBooks();
  }, [search, category, sort, bookLang, section, authorFilter, publisherFilter, brandFilter, colorFilter, materialFilter, customFieldParams]);

  // Load more books (next page)
  const loadMore = useCallback(async () => {
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
      // Custom field filters
      searchParams.forEach((val, key) => { if (key.startsWith('cf_') && val) params.set(key, val); });

      const res = await api.get(`/books?${params}`);
      setBooks((prev) => [...prev, ...(res.data.data || res.data)]);
      setPagination(res.data.pagination || null);
      setCurrentPage(nextPage);
    } catch (err) {
      // silently handle error
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, pagination, currentPage, search, category, bookLang, section, sort, authorFilter, publisherFilter, brandFilter, colorFilter, materialFilter, customFieldParams]);

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
  }, [loadMore]);

  const getName = (item) => language === 'ar' && item.nameAr ? item.nameAr : item.name;
  const hasActiveFilters = (category && category !== scopedParentSlug) || bookLang || section || authorFilter || publisherFilter || brandFilter || colorFilter || materialFilter;
  const isBooksDept = scopedParentSlug === 'books' || categories.find((c) => c.slug === 'books' && selectedCategories.includes('books'));
  const totalBooks = pagination?.total || books.length;

  // Find the top-level parent for any slug (supports any depth)
  const findTopParent = (slugs) => {
    const hasSlugInTree = (node, slug) => {
      if (node.slug === slug) return true;
      return node.children?.some((child) => hasSlugInTree(child, slug)) || false;
    };
    for (const slug of slugs) {
      const topMatch = categories.find((c) => c.slug === slug);
      if (topMatch) return topMatch;
      for (const topCat of categories) {
        if (hasSlugInTree(topCat, slug)) return topCat;
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
      const findBySlug = (nodes) => {
        for (const node of nodes) {
          if (node.slug === slug) return node;
          if (node.children) {
            const found = findBySlug(node.children);
            if (found) return found;
          }
        }
        return null;
      };
      const found = findBySlug(categories);
      if (found) return getName(found);
      return slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ');
    });
    return `${t('books.browse')} ${names.join(' & ')}`;
  };

  // Build the list of filter dropdown definitions visible in the header bar
  const getVisibleFilters = () => {
    const keyToLabel = {
      author: t('books.author'),
      publisher: t('books.publisher'),
      language: t('books.language'),
      brand: t('books.brand'),
      color: t('books.color'),
      material: t('books.material'),
    };

    const filterDefs = {
      language: {
        key: 'language',
        label: keyToLabel.language,
        items: [
          { value: 'en', label: language === 'ar' ? 'إنجليزي' : 'English' },
          { value: 'ar', label: language === 'ar' ? 'عربي' : 'Arabic' },
        ],
        selected: bookLang ? [bookLang] : [],
        isRadio: true,
        onToggle: (val) => updateParam('language', bookLang === val ? '' : val),
        hasItems: true,
      },
      author: {
        key: 'author',
        label: keyToLabel.author,
        items: availableAuthors.filter((item) => typeof item === 'string' || !language.startsWith('ar') || item.valueAr).map((item) => ({
          value: typeof item === 'string' ? item : item.value,
          label: typeof item === 'string' ? item : (language === 'ar' && item.valueAr ? item.valueAr : item.value),
        })),
        selected: selectedAuthors,
        onToggle: (val) => {
          const next = selectedAuthors.includes(val) ? selectedAuthors.filter((a) => a !== val) : [...selectedAuthors, val];
          updateParam('author', next.join(','));
        },
        hasItems: availableAuthors.filter((item) => typeof item === 'string' || !language.startsWith('ar') || item.valueAr).length > 0,
      },
      publisher: {
        key: 'publisher',
        label: keyToLabel.publisher,
        items: availablePublishers.filter((item) => typeof item === 'string' || !language.startsWith('ar') || item.valueAr).map((item) => ({
          value: typeof item === 'string' ? item : item.value,
          label: typeof item === 'string' ? item : (language === 'ar' && item.valueAr ? item.valueAr : item.value),
        })),
        selected: selectedPublishers,
        onToggle: (val) => {
          const next = selectedPublishers.includes(val) ? selectedPublishers.filter((p) => p !== val) : [...selectedPublishers, val];
          updateParam('publisher', next.join(','));
        },
        hasItems: availablePublishers.filter((item) => typeof item === 'string' || !language.startsWith('ar') || item.valueAr).length > 0,
      },
      brand: {
        key: 'brand',
        label: keyToLabel.brand,
        items: availableBrands.filter((item) => typeof item === 'string' || !language.startsWith('ar') || item.valueAr).map((item) => ({
          value: typeof item === 'string' ? item : item.value,
          label: typeof item === 'string' ? item : (language === 'ar' && item.valueAr ? item.valueAr : item.value),
        })),
        selected: selectedBrands,
        onToggle: (val) => {
          const next = selectedBrands.includes(val) ? selectedBrands.filter((b) => b !== val) : [...selectedBrands, val];
          updateParam('brand', next.join(','));
        },
        hasItems: availableBrands.filter((item) => typeof item === 'string' || !language.startsWith('ar') || item.valueAr).length > 0,
      },
      color: {
        key: 'color',
        label: keyToLabel.color,
        items: availableColors.filter((item) => typeof item === 'string' || !language.startsWith('ar') || item.valueAr).map((item) => ({
          value: typeof item === 'string' ? item : item.value,
          label: typeof item === 'string' ? item : (language === 'ar' && item.valueAr ? item.valueAr : item.value),
        })),
        selected: selectedColors,
        onToggle: (val) => {
          const next = selectedColors.includes(val) ? selectedColors.filter((c) => c !== val) : [...selectedColors, val];
          updateParam('color', next.join(','));
        },
        hasItems: availableColors.filter((item) => typeof item === 'string' || !language.startsWith('ar') || item.valueAr).length > 0,
      },
      material: {
        key: 'material',
        label: keyToLabel.material,
        items: availableMaterials.filter((item) => typeof item === 'string' || !language.startsWith('ar') || item.valueAr).map((item) => ({
          value: typeof item === 'string' ? item : item.value,
          label: typeof item === 'string' ? item : (language === 'ar' && item.valueAr ? item.valueAr : item.value),
        })),
        selected: selectedMaterials,
        onToggle: (val) => {
          const next = selectedMaterials.includes(val) ? selectedMaterials.filter((m) => m !== val) : [...selectedMaterials, val];
          updateParam('material', next.join(','));
        },
        hasItems: availableMaterials.filter((item) => typeof item === 'string' || !language.startsWith('ar') || item.valueAr).length > 0,
      },
    };

    // Add custom field filter definitions dynamically
    if (filterConfig && filterConfig.length > 0) {
      filterConfig.filter((fc) => fc.fieldKey.startsWith('cf_')).forEach((fc) => {
        const cfKey = fc.fieldKey.slice(3); // remove "cf_" prefix
        const values = availableCustomFields[cfKey] || [];
        const selectedParam = searchParams.get(fc.fieldKey) || '';
        const selectedValues = selectedParam ? selectedParam.split(',').filter(Boolean) : [];
        filterDefs[fc.fieldKey] = {
          key: fc.fieldKey,
          label: language === 'ar' && fc.nameAr ? fc.nameAr : fc.name,
          items: values.map((v) => ({
            value: v.value,
            label: language === 'ar' && v.valueAr ? v.valueAr : v.value,
          })),
          selected: selectedValues,
          onToggle: (val) => {
            const next = selectedValues.includes(val) ? selectedValues.filter((v) => v !== val) : [...selectedValues, val];
            updateParam(fc.fieldKey, next.join(','));
          },
          hasItems: values.length > 0,
        };
      });
    }

    // If filterConfig is an empty array, show no filters
    if (Array.isArray(filterConfig) && filterConfig.length === 0) {
      return [];
    }

    // If filterConfig has entries, use it to control which filters appear and in what order
    if (filterConfig && filterConfig.length > 0) {
      return filterConfig
        .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
        .map((fc) => filterDefs[fc.fieldKey])
        .filter((def) => def && def.hasItems);
    }

    // Fallback: hardcoded filter behavior (backwards compatible)
    const result = [];
    if (isBooksDept || !scopedParentSlug) {
      if (filterDefs.language.hasItems) result.push(filterDefs.language);
      if (filterDefs.author.hasItems) result.push(filterDefs.author);
      if (filterDefs.publisher.hasItems) result.push(filterDefs.publisher);
    }
    if (!isBooksDept || !scopedParentSlug) {
      if (filterDefs.brand.hasItems) result.push(filterDefs.brand);
      if (filterDefs.color.hasItems) result.push(filterDefs.color);
      if (filterDefs.material.hasItems) result.push(filterDefs.material);
    }
    return result;
  };

  const visibleFilters = getVisibleFilters();

  const seoTitle = getPageTitle();
  const seoDescription = search
    ? `Search results for "${search}" at Arkaan Bookstore — books, stationery and more in Doha, Qatar.`
    : selectedCategories.length > 0
      ? `Browse ${seoTitle.replace(/^browse\s*/i, '')} at Arkaan Bookstore in Doha, Qatar. Arabic & English titles, cash on delivery.`
      : "Browse books, stationery and printing products at Arkaan Bookstore in Doha, Qatar. Arabic & English titles, cash on delivery.";

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://arkaan.qa/' },
      { '@type': 'ListItem', position: 2, name: 'Books', item: 'https://arkaan.qa/books' },
    ],
  };

  return (
    <PageTransition>
      <SEO
        title={seoTitle === t('books.title') ? 'All Books' : seoTitle}
        description={seoDescription}
        noindex={!!search}
        jsonLd={breadcrumbJsonLd}
      />
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
                    const grandchildSelected = cat.children?.some((s) => getAllDescendantSlugs(s).some((ds) => isCatSelected(ds)));
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
                              const subChildSelected = getAllDescendantSlugs(sub).some((ds) => isCatSelected(ds));
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
                                      {sub.children.map((l3) => {
                                        const l3HasChildren = l3.children && l3.children.length > 0;
                                        const l3Selected = isCatSelected(l3.slug);
                                        const l3ChildSelected = getAllDescendantSlugs(l3).some((ds) => isCatSelected(ds));
                                        const l3Expanded = expandedCats[l3.id] || l3Selected || l3ChildSelected;
                                        return (
                                          <div key={l3.id}>
                                            <div className="flex items-center">
                                              <button
                                                onClick={() => { toggleCategory(l3.slug); if (l3HasChildren) setExpandedCats((prev) => ({ ...prev, [l3.id]: true })); }}
                                                className={`flex-1 flex items-center gap-2 text-start py-0.5 text-[13px] transition-colors ${
                                                  l3Selected ? 'text-accent font-medium' : 'text-foreground/45 hover:text-accent'
                                                }`}
                                              >
                                                <span className={`w-2.5 h-2.5 rounded border-2 flex-shrink-0 flex items-center justify-center ${l3Selected ? 'bg-accent border-accent' : 'border-gray-300'}`}>
                                                  {l3Selected && <span className="text-white text-[6px]">✓</span>}
                                                </span>
                                                {getName(l3)}
                                              </button>
                                              {l3HasChildren && (
                                                <button onClick={() => toggleExpand(l3.id)} className="p-0.5 text-foreground/30 hover:text-foreground transition-colors">
                                                  <FiChevronDown size={10} className={`transition-transform ${l3Expanded ? 'rotate-180' : ''}`} />
                                                </button>
                                              )}
                                            </div>
                                            {l3HasChildren && l3Expanded && (
                                              <div className="ps-3 border-s border-muted/5 ms-1 space-y-0.5 mb-0.5">
                                                {l3.children.map((l4) => (
                                                  <button
                                                    key={l4.id}
                                                    onClick={() => toggleCategory(l4.slug)}
                                                    className={`w-full flex items-center gap-2 text-start py-0.5 text-[12px] transition-colors ${
                                                      isCatSelected(l4.slug) ? 'text-accent font-medium' : 'text-foreground/35 hover:text-accent'
                                                    }`}
                                                  >
                                                    <span className={`w-2 h-2 rounded border-2 flex-shrink-0 flex items-center justify-center ${isCatSelected(l4.slug) ? 'bg-accent border-accent' : 'border-gray-300'}`}>
                                                      {isCatSelected(l4.slug) && <span className="text-white text-[5px]">✓</span>}
                                                    </span>
                                                    {getName(l4)}
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
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              )}

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
                  {t('books.clearFilters')}
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
            <div className="flex items-center justify-between gap-4 mb-3">
              <div>
                <h1 className="text-2xl 3xl:text-4xl font-display font-bold text-foreground">
                  {getPageTitle()}
                </h1>
                <p className="text-sm text-foreground/50 mt-0.5">
                  {totalBooks} {t('common.results').toLowerCase()}
                </p>
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

            {/* Filter Bar */}
            <div className="flex items-center gap-2 mb-4 flex-wrap" ref={filterDropdownRef}>
              {/* Section */}
              <div className="relative flex-shrink-0" ref={sectionRef}>
                <button
                  onClick={() => { setSectionOpen(!sectionOpen); setSortOpen(false); setOpenFilter(null); }}
                  className="flex items-center gap-2 bg-surface border border-muted/40 rounded-lg px-3 py-1.5 pe-8 text-sm text-foreground focus:outline-none focus:border-accent cursor-pointer whitespace-nowrap"
                >
                  {t(sectionOptions.find((o) => o.value === section)?.labelKey || 'books.section')}
                  <FiChevronDown className={`absolute end-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/60 transition-transform ${sectionOpen ? 'rotate-180' : ''}`} />
                </button>
                {sectionOpen && (
                  <div className="absolute top-full mt-1 start-0 bg-surface border border-muted/15 rounded-xl shadow-xl z-50 min-w-[180px] py-1">
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
              <div className="relative flex-shrink-0" ref={sortRef}>
                <button
                  onClick={() => { setSortOpen(!sortOpen); setSectionOpen(false); setOpenFilter(null); }}
                  className="flex items-center gap-2 bg-surface border border-muted/40 rounded-lg px-3 py-1.5 pe-8 text-sm text-foreground focus:outline-none focus:border-accent cursor-pointer whitespace-nowrap"
                >
                  {t(sortOptions.find((o) => o.value === sort)?.labelKey || sortOptions[0].labelKey)}
                  <FiChevronDown className={`absolute end-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/60 transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
                </button>
                {sortOpen && (
                  <div className="absolute top-full mt-1 start-0 bg-surface border border-muted/15 rounded-xl shadow-xl z-50 min-w-[180px] py-1">
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

              {/* Divider */}
              {visibleFilters.length > 0 && <div className="w-px h-6 bg-muted/20 flex-shrink-0" />}

              {/* Filters */}
                {visibleFilters.map((filterDef) => {
                  const isOpen = openFilter === filterDef.key;
                  const count = filterDef.selected.length;
                  return (
                    <div key={filterDef.key} className="relative flex-shrink-0">
                      <button
                        onClick={() => { setOpenFilter(isOpen ? null : filterDef.key); setSortOpen(false); setSectionOpen(false); }}
                        className={`flex items-center gap-2 bg-surface border rounded-lg px-3 py-1.5 pe-8 text-sm focus:outline-none focus:border-accent cursor-pointer transition-colors whitespace-nowrap ${
                          count > 0 ? 'border-accent text-accent' : 'border-muted/40 text-foreground'
                        }`}
                      >
                        {filterDef.label}{count > 0 ? ` (${count})` : ''}
                        <FiChevronDown className={`absolute end-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/60 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {isOpen && (
                        <div className="absolute top-full mt-1 start-0 bg-surface border border-muted/15 rounded-xl shadow-xl z-50 min-w-[200px] py-1">
                          <div className="max-h-48 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                            {filterDef.items.map((item) => {
                              const isSelected = filterDef.selected.includes(item.value);
                              return (
                                <button
                                  key={item.value}
                                  onClick={() => filterDef.onToggle(item.value)}
                                  className={`w-full flex items-center gap-2 text-start px-4 py-2 text-sm transition-colors ${
                                    isSelected ? 'text-accent font-medium' : 'text-foreground hover:bg-accent/10 hover:text-accent'
                                  }`}
                                >
                                  <span className={`w-3 h-3 rounded${filterDef.isRadio ? '-full' : ''} border-2 flex-shrink-0 flex items-center justify-center ${isSelected ? 'bg-accent border-accent' : 'border-gray-300'}`}>
                                    {isSelected && <span className="text-white text-[7px]">✓</span>}
                                  </span>
                                  {item.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {hasActiveFilters && (
                  <button
                    onClick={() => {
                      const params = new URLSearchParams();
                      if (scopedParentSlug) params.set('category', scopedParentSlug);
                      setSearchParams(params);
                    }}
                    className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 text-sm text-red-500 hover:text-red-600 transition-colors"
                  >
                    <FiX size={14} />
                    {t('books.clearFilters')}
                  </button>
                )}
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
