import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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
      {/* Desktop Banner */}
      <img
        src="/hero-banner.jpg"
        alt="Arkaan Bookstore - توصيلنا بختصر المسافات"
        className="hidden sm:block w-full h-auto object-cover"
      />
      {/* Mobile Banner */}
      <img
        src="/hero-banner-mobile.jpg"
        alt="Arkaan Bookstore - توصيلنا بختصر المسافات"
        className="block sm:hidden w-full h-auto object-cover"
      />
    </section>
  );
};

const Home = () => {
  const { t, language } = useLanguageStore();
  const [searchParams] = useSearchParams();
  const corner = searchParams.get('corner') || 'books';

  const [featured, setFeatured] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [bestsellers, setBestsellers] = useState([]);
  const [trending, setTrending] = useState([]);
  const [comingSoon, setComingSoon] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cornerData, setCornerData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const q = `?corner=${corner}`;
        const [catRes, featuredRes, newRes, bestRes, trendRes, soonRes] = await Promise.all([
          api.get('/categories').catch(() => ({ data: [] })),
          api.get(`/books/featured${q}`).catch(() => ({ data: [] })),
          api.get(`/books/new-arrivals${q}`).catch(() => ({ data: [] })),
          api.get(`/books/bestsellers${q}`).catch(() => ({ data: [] })),
          api.get(`/books/trending${q}`).catch(() => ({ data: [] })),
          api.get(`/books/coming-soon${q}`).catch(() => ({ data: [] })),
        ]);
        const allCats = catRes.data;
        setCategories(allCats);
        // Find the selected corner and its children
        const selectedCorner = allCats.find((c) => c.slug === corner);
        setCornerData(selectedCorner);
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
  }, [corner]);

  const getName = (item) => language === 'ar' && item.nameAr ? item.nameAr : item.name;

  return (
    <PageTransition>
      {/* Hero Banner Carousel */}
      <HeroBanner />

      {/* Featured Books */}
      {!loading && featured.length > 0 && (
        <section className="max-w-[1800px] mx-auto px-3 sm:px-6 lg:px-10 py-8 sm:py-14">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
              {t('home.featured')}
            </h2>
            <Link to={`/books?category=${corner}&section=featured`} className="flex items-center gap-1 text-sm font-medium text-accent hover:text-accent-light transition-colors">
              {t('common.seeAll')} {language === 'ar' ? <FiArrowLeft size={16} /> : <FiArrowRight size={16} />}
            </Link>
          </div>
          <BookCarousel>
            {featured.map((book) => <BookCard key={book.id} book={book} />)}
          </BookCarousel>
        </section>
      )}

      {/* Sub-categories of selected corner */}
      {cornerData?.children && cornerData.children.length > 0 && (
        <section className="max-w-[1800px] mx-auto px-3 sm:px-6 lg:px-10 py-8 sm:py-14">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
              {t('nav.categories')}
            </h2>
          </div>
          <BookCarousel>
            {cornerData.children.map((cat) => {
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
                        {cat._count?.books || 0} {t('common.results').toLowerCase()}
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
        <section className="max-w-[1800px] mx-auto px-3 sm:px-6 lg:px-10 py-8 sm:py-14">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
              {t('home.newArrivals')}
            </h2>
            <Link to={`/books?category=${corner}&section=new`} className="flex items-center gap-1 text-sm font-medium text-accent hover:text-accent-light transition-colors">
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
        <section className="max-w-[1800px] mx-auto px-3 sm:px-6 lg:px-10 py-8 sm:py-14">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
              {t('home.bestsellers')}
            </h2>
            <Link to={`/books?category=${corner}&section=bestseller`} className="flex items-center gap-1 text-sm font-medium text-accent hover:text-accent-light transition-colors">
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
        <section className="max-w-[1800px] mx-auto px-3 sm:px-6 lg:px-10 py-8 sm:py-14">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
              {t('home.trending')}
            </h2>
          </div>
          <BookCarousel>
            {trending.map((book) => <BookCard key={book.id} book={book} />)}
          </BookCarousel>
        </section>
      )}

      {/* Coming Soon */}
      {!loading && comingSoon.length > 0 && (
        <section className="max-w-[1800px] mx-auto px-3 sm:px-6 lg:px-10 py-8 sm:py-14">
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-8">
            {t('home.comingSoon')}
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
