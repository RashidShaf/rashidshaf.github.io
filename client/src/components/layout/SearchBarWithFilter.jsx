import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiChevronDown } from 'react-icons/fi';
import useLanguageStore from '../../stores/useLanguageStore';
import api from '../../utils/api';

const SearchBarWithFilter = ({ categories = [], className = '' }) => {
  const { t, language } = useLanguageStore();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchCategory, setSearchCategory] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const containerRef = useRef(null);
  const filterRef = useRef(null);
  const debounceRef = useRef(null);

  const getName = (cat) => language === 'ar' && cat.nameAr ? cat.nameAr : cat.name;

  const selectedCategoryName = searchCategory
    ? getName(categories.find((c) => c.slug === searchCategory) || { name: searchCategory })
    : t('nav.all');

  // Debounced autocomplete
  const handleSearchChange = (value) => {
    setSearchQuery(value);
    clearTimeout(debounceRef.current);
    if (value.trim().length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setLoadingSuggestions(true);
    setShowSuggestions(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ search: value.trim(), limit: '6' });
        if (searchCategory) params.set('category', searchCategory);
        const res = await api.get(`/books?${params}`);
        const books = res.data.data || res.data;
        setSuggestions(
          books.map((b) => ({
            id: b.id,
            title: b.title,
            author: b.author,
            slug: b.slug,
            cover: b.coverImage
              ? `${import.meta.env.VITE_API_URL?.replace('/api', '')}/${b.coverImage}`
              : null,
          }))
        );
      } catch {
        setSuggestions([]);
      }
      setLoadingSuggestions(false);
    }, 300);
  };

  const closeSuggestions = () => {
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleSuggestionClick = (slug) => {
    navigate(`/books/${slug}`);
    setSearchQuery('');
    closeSuggestions();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const params = new URLSearchParams({ search: searchQuery.trim() });
      if (searchCategory) params.set('category', searchCategory);
      navigate(`/books?${params}`);
      setSearchQuery('');
      closeSuggestions();
    }
  };

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        closeSuggestions();
      }
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <form onSubmit={handleSubmit} className="flex items-center bg-surface border-2 border-gray-400 rounded-lg focus-within:border-accent transition-colors shadow-sm">
        {/* Category filter dropdown */}
        <div ref={filterRef} className="relative flex-shrink-0">
          <button
            type="button"
            onClick={() => setFilterOpen(!filterOpen)}
            className="flex items-center gap-1.5 h-full px-3 sm:px-4 py-2.5 text-sm font-medium text-foreground/70 hover:text-foreground border-e-2 border-gray-400 bg-surface-alt/40 rounded-s-lg whitespace-nowrap transition-colors"
          >
            <span className="max-w-[120px] truncate">{selectedCategoryName}</span>
            <FiChevronDown className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
          </button>

          {filterOpen && (
            <div className="absolute top-full mt-2 start-0 bg-surface border border-muted/15 rounded-xl shadow-xl z-50 min-w-[180px] py-1">
              <button
                type="button"
                onClick={() => { setSearchCategory(''); setFilterOpen(false); }}
                className={`w-full text-start px-4 py-2.5 text-sm transition-colors ${
                  !searchCategory ? 'bg-accent text-white font-semibold' : 'text-foreground hover:bg-accent/10 hover:text-accent'
                }`}
              >
                {t('nav.all')}
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => { setSearchCategory(cat.slug); setFilterOpen(false); }}
                  className={`w-full text-start px-4 py-2.5 text-sm transition-colors ${
                    searchCategory === cat.slug ? 'bg-accent text-white font-semibold' : 'text-foreground hover:bg-accent/10 hover:text-accent'
                  }`}
                >
                  {getName(cat)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Search input */}
        <div className="flex-1 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && closeSuggestions()}
            placeholder={t('books.search')}
            className="w-full px-4 py-2.5 ps-10 bg-transparent text-sm text-foreground placeholder:text-muted/40 focus:outline-none"
          />
          <FiSearch className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/50 pointer-events-none" />
        </div>
      </form>

      {/* Suggestions dropdown */}
      {showSuggestions && (
        <div className="absolute top-full mt-2 inset-x-0 bg-surface border border-muted/15 rounded-xl shadow-xl z-50 overflow-hidden">
          {loadingSuggestions ? (
            <div className="px-4 py-6 text-center">
              <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin mx-auto" />
            </div>
          ) : suggestions.length === 0 ? (
            <div className="px-4 py-4 text-center text-sm text-foreground/60">
              {t('common.noResults')}
            </div>
          ) : (
            <div className="py-1">
              {suggestions.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSuggestionClick(item.slug)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-surface-alt transition-colors text-start"
                >
                  {item.cover ? (
                    <img src={item.cover} alt="" className="w-9 h-12 rounded object-cover bg-surface-alt flex-shrink-0" />
                  ) : (
                    <div className="w-9 h-12 rounded bg-surface-alt flex-shrink-0 flex items-center justify-center text-accent/30 font-bold text-xs">
                      {item.title?.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground line-clamp-1">{item.title}</p>
                    <p className="text-xs text-foreground/60 line-clamp-1">{item.author}</p>
                  </div>
                </button>
              ))}
              <button
                onClick={() => {
                  const params = new URLSearchParams({ search: searchQuery.trim() });
                  if (searchCategory) params.set('category', searchCategory);
                  navigate(`/books?${params}`);
                  setSearchQuery('');
                  closeSuggestions();
                }}
                className="w-full px-3 py-2.5 text-xs font-medium text-accent hover:bg-surface-alt transition-colors border-t border-muted/10 text-center"
              >
                {t('common.seeAll')} "{searchQuery}"
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBarWithFilter;
