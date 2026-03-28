import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowRight, FiArrowLeft, FiBookOpen } from 'react-icons/fi';
import PageTransition from '../animations/PageTransition';
import BookCard from '../components/books/BookCard';
import BookCarousel from '../components/common/BookCarousel';
import useLanguageStore from '../stores/useLanguageStore';
import api from '../utils/api';

const HeroBanner = () => {
  return (
    <section className="relative overflow-hidden">
      <img
        src="/hero-banner.jpg"
        alt="Arkaan Bookstore - توصيلنا بختصر المسافات"
        className="w-full h-auto object-cover"
      />
      {/* Animated Logo */}
      <div className="absolute top-[40%] left-10 sm:left-32 lg:left-48 -translate-y-1/2 z-10 flex flex-col items-center">
        <div className="relative flex items-center justify-center">
          <div className="absolute w-[80px] h-[80px] sm:w-[280px] sm:h-[280px] lg:w-[400px] lg:h-[400px] rounded-full" style={{ border: '1px solid rgba(212,165,116,0.25)' }} />
          <div className="absolute w-[100px] h-[100px] sm:w-[340px] sm:h-[340px] lg:w-[500px] lg:h-[500px] rounded-full" style={{ border: '1px solid rgba(212,165,116,0.12)' }} />
          <motion.img
            src="/logo.jpg"
            alt="Arkaan"
            className="w-14 h-14 sm:w-48 sm:h-48 lg:w-72 lg:h-72 rounded-full object-cover shadow-2xl"
            style={{ boxShadow: '0 0 60px rgba(122,27,78,0.5), 0 0 30px rgba(212,165,116,0.2)' }}
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
          />
        </div>
        <div className="-mt-2 sm:-mt-1">
          <img src="/arkaan-banner-logo.png" alt="مكتبة أركان - Arkaan Bookstore" className="w-20 sm:w-48 lg:w-64 drop-shadow-lg" />
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
  const [trending, setTrending] = useState([]);
  const [comingSoon, setComingSoon] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catRes, featuredRes, newRes, bestRes, trendRes, soonRes] = await Promise.all([
          api.get('/categories').catch(() => ({ data: [] })),
          api.get('/books/featured').catch(() => ({ data: [] })),
          api.get('/books/new-arrivals').catch(() => ({ data: [] })),
          api.get('/books/bestsellers').catch(() => ({ data: [] })),
          api.get('/books/trending').catch(() => ({ data: [] })),
          api.get('/books/coming-soon').catch(() => ({ data: [] })),
        ]);
        setCategories(catRes.data);
        setFeatured(featuredRes.data);
        setNewArrivals(newRes.data);
        setBestsellers(bestRes.data);
        setTrending(trendRes.data);
        setComingSoon(soonRes.data);
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
      <HeroBanner />

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
      {!loading && trending.length > 0 && (
        <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-14">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
              {language === 'ar' ? 'الجميع يتحدث عنها' : "Everyone's Talking About"}
            </h2>
          </div>
          <BookCarousel>
            {trending.map((book) => <BookCard key={book.id} book={book} />)}
          </BookCarousel>
        </section>
      )}

      {/* Coming Soon */}
      {!loading && comingSoon.length > 0 && (
        <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-14">
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-8">
            {language === 'ar' ? 'قريباً' : 'Coming Soon'}
          </h2>
          <BookCarousel>
            {comingSoon.map((book) => <BookCard key={book.id} book={book} comingSoon />)}
          </BookCarousel>
        </section>
      )}

    </PageTransition>
  );
};

export default Home;
