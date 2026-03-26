import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiArrowRight, FiArrowLeft, FiBookOpen } from 'react-icons/fi';
import PageTransition from '../animations/PageTransition';
import BookCard from '../components/books/BookCard';
import BookCarousel from '../components/common/BookCarousel';
import useLanguageStore from '../stores/useLanguageStore';
import api from '../utils/api';
import { fetchBooks } from '../utils/openLibrary';

const HeroBanner = ({ featured, language, t }) => {
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const isRTL = language === 'ar';

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => setSlide((s) => (s === 0 ? 1 : 0)), 4000);
    return () => clearInterval(timer);
  }, [paused]);

  const bookCovers = featured.filter((b) => b._googleCover).slice(0, 6).map((b) => b._googleCover);
  const isSlide2 = slide === 1;

  return (
    <section
      className="relative overflow-hidden mt-4"
      style={{ backgroundColor: '#7A1B4E' }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Pattern */}
      <div className="absolute inset-0 opacity-[0.06]" style={{
        backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.4) 1px, transparent 0)',
        backgroundSize: '32px 32px',
      }} />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 relative z-10">
        <div className="min-h-[360px] lg:min-h-[400px] flex items-center">

          {/* Logo — always visible, animates position */}
          <motion.div
            className="absolute z-20 hidden lg:flex flex-col items-center"
            initial={isRTL ? {
              right: '76%',
              x: '50%',
            } : {
              left: '76%',
              x: '-50%',
            }}
            animate={isRTL ? {
              right: isSlide2 ? '15%' : '76%',
              x: '50%',
            } : {
              left: isSlide2 ? '15%' : '76%',
              x: '-50%',
            }}
            transition={{ type: 'spring', stiffness: 35, damping: 15 }}
            style={{ top: '50%', y: '-50%' }}
          >
            <div className="relative flex items-center justify-center">
              <div className="absolute w-[280px] h-[280px] rounded-full" style={{ border: '1px solid rgba(212,165,116,0.15)' }} />
              <div className="absolute w-[350px] h-[350px] rounded-full" style={{ border: '1px solid rgba(212,165,116,0.08)' }} />
              <motion.img
                src="/logo.jpg"
                alt="Arkaan"
                className="w-52 h-52 rounded-full object-cover shadow-2xl"
                style={{ boxShadow: '0 0 80px rgba(122,27,78,0.5), 0 0 40px rgba(212,165,116,0.2)' }}
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
              />
            </div>
            <div className="text-center mt-3">
              <h2 className="text-2xl font-display font-bold text-white tracking-[0.3em]">{language === 'ar' ? 'أركان' : 'ARKAAN'}</h2>
              <p className="text-[10px] tracking-[0.4em] uppercase mt-0.5" style={{ color: '#D4A574' }}>{language === 'ar' ? 'مكتبة' : 'Bookstore'}</p>
            </div>
          </motion.div>

          {/* Text content — slides in/out */}
          <motion.div
            className="w-full lg:w-1/2 py-10 lg:py-12 relative z-10"
            initial={{ opacity: 0, x: isRTL ? 60 : -60 }}
            animate={{ opacity: isSlide2 ? 0 : 1, x: isSlide2 ? (isRTL ? 60 : -60) : 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{ pointerEvents: isSlide2 ? 'none' : 'auto' }}
          >
            <span className="inline-block px-4 py-1.5 text-[11px] font-bold tracking-widest uppercase rounded-full mb-6" style={{ backgroundColor: 'rgba(212,165,116,0.2)', color: '#D4A574', border: '1px solid rgba(212,165,116,0.3)' }}>
              {language === 'ar' ? 'عروض محدودة' : 'Limited Time Offer'}
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold leading-tight text-white">
              {language === 'ar' ? (
                <>خصم يصل إلى <span style={{ color: '#D4A574' }}>٤٠٪</span> على جميع الكتب</>
              ) : (
                <>Up to <span style={{ color: '#D4A574' }}>40% Off</span> on All Books</>
              )}
            </h1>
            <p className="mt-4 text-white/60 text-base lg:text-lg max-w-md leading-relaxed">
              {t('home.heroSubtitle')}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-5">
              <Link
                to="/books"
                className="inline-flex items-center gap-2 px-7 py-3.5 font-semibold rounded-xl shadow-lg text-white"
                style={{ backgroundColor: '#D4A574', boxShadow: '0 10px 30px rgba(212,165,116,0.3)' }}
              >
                {language === 'ar' ? 'تسوق الآن' : 'Shop Now'}
                {isRTL ? <FiArrowLeft /> : <FiArrowRight />}
              </Link>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <span className="block text-2xl font-bold text-white">{isRTL ? '+٥٠٠' : '500+'}</span>
                  <span className="text-[11px] text-white/40">{isRTL ? 'كتاب' : 'Books'}</span>
                </div>
                <div className="w-px h-10 bg-white/10" />
                <div className="text-center">
                  <span className="block text-2xl font-bold text-white">{isRTL ? '+٥٠' : '50+'}</span>
                  <span className="text-[11px] text-white/40">{isRTL ? 'مؤلف' : 'Authors'}</span>
                </div>
                <div className="w-px h-10 bg-white/10" />
                <div className="text-center">
                  <span className="block text-2xl font-bold" style={{ color: '#D4A574' }}>{isRTL ? 'الدفع عند الاستلام' : 'COD'}</span>
                  <span className="text-[11px] text-white/40">{isRTL ? 'عند التوصيل' : 'Cash on Delivery'}</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Slide 2 — heading + book covers */}
          <motion.div
            className={`absolute ${isRTL ? 'left-0' : 'right-0'} top-0 bottom-0 w-[55%] hidden lg:flex items-center ${isRTL ? 'justify-end pe-6' : 'justify-end pe-10'} z-10`}
            initial={{ opacity: 0, x: isRTL ? -80 : 80 }}
            animate={{ opacity: isSlide2 ? 1 : 0, x: isSlide2 ? 0 : (isRTL ? -80 : 80) }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: isSlide2 ? 0.15 : 0 }}
            style={{ pointerEvents: isSlide2 ? 'auto' : 'none' }}
          >
            <div className={`flex flex-col ${isRTL ? 'items-start' : 'items-end'} gap-4`}>
              <motion.div
                animate={{ opacity: isSlide2 ? 1 : 0, y: isSlide2 ? 0 : -15 }}
                transition={{ duration: 0.4, delay: isSlide2 ? 0.2 : 0 }}
                className={`${isRTL ? 'text-start' : 'text-end'} mb-1`}
              >
                <p className="text-white/40 text-xs uppercase tracking-[0.3em] mb-1">
                  {language === 'ar' ? 'قراء يوصون' : 'Readers Recommend'}
                </p>
                <h3 className="text-2xl font-display font-bold text-white leading-snug">
                  {language === 'ar' ? (
                    <>كتب تستحق <span style={{ color: '#D4A574' }}>القراءة</span></>
                  ) : (
                    <>Books Worth <span style={{ color: '#D4A574' }}>Reading</span></>
                  )}
                </h3>
              </motion.div>
              <div className="grid grid-cols-3 gap-3">
              {bookCovers.map((cover, i) => (
                <motion.div
                  key={i}
                  animate={{ y: isSlide2 ? 0 : 30, opacity: isSlide2 ? 1 : 0 }}
                  transition={{ duration: 0.4, delay: isSlide2 ? 0.25 + i * 0.07 : 0 }}
                  className={`rounded-xl overflow-hidden shadow-xl border border-white/10 ${i % 2 === 0 ? 'mt-4' : '-mt-2'}`}
                >
                  <img src={cover} alt={`Book ${i + 1}`} className="w-full h-40 object-cover" />
                </motion.div>
              ))}
            </div>
            </div>
          </motion.div>

          {/* Mobile fallback — just show logo on mobile */}
          <div className="lg:hidden flex justify-center py-6">
            <img src="/logo.jpg" alt="Arkaan" className="w-24 h-24 rounded-full object-cover shadow-xl" />
          </div>
        </div>

        {/* Dots */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
          {[0, 1].map((i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                slide === i ? 'w-8' : 'w-2 bg-white/30 hover:bg-white/50'
              }`}
              style={slide === i ? { backgroundColor: '#D4A574' } : {}}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

const Home = () => {
  const { t, language } = useLanguageStore();
  const [featured, setFeatured] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [bestsellers, setBestsellers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch categories from our API
        const catRes = await api.get('/categories').catch(() => ({ data: [] }));
        setCategories(catRes.data);

        // Fetch books from Open Library API for demo
        const [featuredBooks, newBooks, bestBooks] = await Promise.all([
          fetchBooks('bestseller fiction', 12),
          fetchBooks('new releases 2024', 12),
          fetchBooks('popular novels', 12),
        ]);
        setFeatured(featuredBooks);
        setNewArrivals(newBooks);
        setBestsellers(bestBooks);
      } catch (err) {
        console.error('Failed to load home data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getName = (item) => language === 'ar' && item.nameAr ? item.nameAr : item.name;

  return (
    <PageTransition>
      {/* Hero Banner Carousel */}
      <HeroBanner key={language} featured={featured} language={language} t={t} />

      {/* Featured Books */}
      {!loading && featured.length > 0 && (
        <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-14">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
              {t('home.featured')}
            </h2>
            <Link to="/books" className="flex items-center gap-1 text-sm font-medium text-accent hover:text-accent-light transition-colors">
              {t('common.seeAll')} {language === 'ar' ? <FiArrowLeft size={16} /> : <FiArrowRight size={16} />}
            </Link>
          </div>
          <BookCarousel>
            {featured.map((book) => <BookCard key={book.id} book={book} />)}
          </BookCarousel>
        </section>
      )}

      {/* Categories */}
      {categories.length > 0 && (
        <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-14">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
              {t('nav.categories')}
            </h2>
          </div>
          <BookCarousel>
            {categories.map((cat) => {
              const coverUrl = cat.image ? `${import.meta.env.VITE_API_URL?.replace('/api', '')}/${cat.image}` : null;
              return (
                <Link
                  key={cat.id}
                  to={`/books?category=${cat.slug}`}
                  className="group bg-surface rounded-lg overflow-hidden hover:shadow-lg hover:shadow-accent/5 transition-all duration-300"
                >
                  <div className="relative aspect-[5/6] bg-surface-alt overflow-hidden">
                    {coverUrl ? (
                      <img src={coverUrl} alt={getName(cat)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent/10 to-accent/5">
                        <FiBookOpen className="w-10 h-10 text-accent/30" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3">
                      <h3 className="text-[15px] font-bold text-white line-clamp-1 leading-tight">
                        {getName(cat)}
                      </h3>
                      <p className="text-[12px] text-white/70 mt-0.5">
                        {cat._count?.books || 0} {t('nav.books').toLowerCase()}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </BookCarousel>
        </section>
      )}

      {/* New Arrivals */}
      {!loading && newArrivals.length > 0 && (
        <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-14">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
              {t('home.newArrivals')}
            </h2>
            <Link to="/books?sort=newest" className="flex items-center gap-1 text-sm font-medium text-accent hover:text-accent-light transition-colors">
              {t('common.seeAll')} {language === 'ar' ? <FiArrowLeft size={16} /> : <FiArrowRight size={16} />}
            </Link>
          </div>
          <BookCarousel>
            {newArrivals.map((book) => <BookCard key={book.id} book={book} />)}
          </BookCarousel>
        </section>
      )}

      {/* Bestsellers */}
      {!loading && bestsellers.length > 0 && (
        <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-14">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
              {language === 'ar' ? 'الأكثر مبيعاً' : 'Bestsellers'}
            </h2>
            <Link to="/books?sort=bestselling" className="flex items-center gap-1 text-sm font-medium text-accent hover:text-accent-light transition-colors">
              {t('common.seeAll')} {language === 'ar' ? <FiArrowLeft size={16} /> : <FiArrowRight size={16} />}
            </Link>
          </div>
          <BookCarousel>
            {bestsellers.map((book) => <BookCard key={book.id} book={book} />)}
          </BookCarousel>
        </section>
      )}

      {/* Everyone's Talking About */}
      {!loading && featured.length > 0 && (
        <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-14">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
              {language === 'ar' ? 'الجميع يتحدث عنها' : "Everyone's Talking About"}
            </h2>
          </div>
          <BookCarousel>
            {featured.map((book) => <BookCard key={book.id} book={book} />)}
          </BookCarousel>
        </section>
      )}

      {/* Coming Soon */}
      {!loading && newArrivals.length > 0 && (
        <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-14">
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-8">
            {language === 'ar' ? 'قريباً' : 'Coming Soon'}
          </h2>
          <BookCarousel>
            {newArrivals.map((book) => <BookCard key={book.id} book={book} comingSoon />)}
          </BookCarousel>
        </section>
      )}

    </PageTransition>
  );
};

export default Home;
