import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowRight, FiArrowLeft, FiBookOpen } from 'react-icons/fi';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import PageTransition from '../animations/PageTransition';
import BookCard from '../components/books/BookCard';
import BookCarousel from '../components/common/BookCarousel';
import LogoOverlay from '../components/common/LogoOverlay';
import useLanguageStore from '../stores/useLanguageStore';
import api from '../utils/api';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '');

const BannerSlide = ({ desktop, mobile, alt, link }) => {
  const content = (
    <>
      <img src={desktop} alt={alt} className="hidden sm:block w-full h-auto object-cover" />
      <img src={mobile || desktop} alt={alt} className="block sm:hidden w-full h-auto object-cover" />
    </>
  );
  if (link) {
    return <a href={link} target="_blank" rel="noopener noreferrer">{content}</a>;
  }
  return content;
};

const HeroBanner = () => {
  const [banners, setBanners] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    api.get('/banners').then((res) => setBanners(res.data || [])).catch(() => {});
  }, []);

  // Get logo settings from the current banner
  const currentBanner = banners[activeIndex] || banners[0];
  const logo = currentBanner?.showLogo !== false
    ? <LogoOverlay position={currentBanner?.logoPosition || 'center-left'} hideMobile={currentBanner?.showMobileLogo === false} />
    : null;

  // No active banners — show nothing
  if (banners.length === 0) return null;

  // Single banner — no carousel needed
  if (banners.length === 1) {
    const b = banners[0];
    return (
      <section className="relative overflow-hidden">
        <BannerSlide desktop={`${API_BASE}/${b.desktopImage}`} mobile={b.mobileImage ? `${API_BASE}/${b.mobileImage}` : null} alt={b.title || 'Arkaan Bookstore'} link={b.link} />
        {b.showLogo !== false && <LogoOverlay position={b.logoPosition || 'center-left'} hideMobile={b.showMobileLogo === false} />}
      </section>
    );
  }

  // Multiple banners — Swiper carousel
  return (
    <section className="relative overflow-hidden">
      <Swiper
        modules={[Autoplay, Pagination]}
        autoplay={{ delay: 5000, disableOnInteraction: false }}
        pagination={{ clickable: true }}
        loop
        className="w-full arkaan-banner-swiper"
        onSlideChange={(swiper) => setActiveIndex(swiper.realIndex)}
      >
        {banners.map((b) => (
          <SwiperSlide key={b.id}>
            <BannerSlide desktop={`${API_BASE}/${b.desktopImage}`} mobile={b.mobileImage ? `${API_BASE}/${b.mobileImage}` : null} alt={b.title || 'Arkaan Bookstore'} link={b.link} />
          </SwiperSlide>
        ))}
      </Swiper>
      {logo}
    </section>
  );
};

const Home = () => {
  const { t, language } = useLanguageStore();
  const [searchParams] = useSearchParams();
  const cornerParam = searchParams.get('corner') || '';

  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await api.get('/home/layout').catch(() => ({ data: { sections: [] } }));
        setSections(res.data.sections || []);
      } catch (err) {
        console.error('Failed to load home data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [cornerParam]);

  const getName = (item) => language === 'ar' && item.nameAr ? item.nameAr : item.name;

  const GLOBAL_TITLES = {
    featured:     t('home.featured'),
    newArrivals:  t('home.newArrivals'),
    bestsellers:  t('home.bestsellers'),
    trending:     t('home.trending'),
    comingSoon:   t('home.comingSoon'),
  };
  const GLOBAL_SEEALL_SECTION = {
    featured: 'featured',
    newArrivals: 'new',
    bestsellers: 'bestseller',
    trending: 'trending',
    comingSoon: 'comingSoon',
  };

  return (
    <PageTransition>
      {/* Hero Banner Carousel */}
      <HeroBanner />

      {/* Driven by /home/layout — sections appear in admin-controlled order */}
      {!loading && sections.map((section, sIdx) => {
        if (section.type === 'corner') {
          const l1 = section.corner;
          if (!l1) return null;
          const hasChildren = l1.children && l1.children.length > 0;
          const hasBooks = section.books && section.books.length > 0;
          if (!hasChildren && !hasBooks) return null;
          return (
            <section key={`corner-${l1.id}`} className="mx-auto px-3 sm:px-6 lg:px-8 xl:px-10 3xl:px-12 py-6 sm:py-8 3xl:py-16">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl sm:text-3xl 3xl:text-4xl font-display font-bold text-foreground">
                  {getName(l1)}
                </h2>
                <Link to={`/books?category=${l1.slug}`} className="flex items-center gap-1 text-sm 3xl:text-lg font-medium text-accent hover:text-accent-light transition-colors">
                  {t('common.seeAll')} {language === 'ar' ? <FiArrowLeft size={16} /> : <FiArrowRight size={16} />}
                </Link>
              </div>
              {hasChildren && (
                <BookCarousel>
                  {l1.children.map((cat) => {
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
              )}
              {hasBooks && (
                <div className={hasChildren ? 'mt-6 3xl:mt-10' : ''}>
                  <BookCarousel>
                    {section.books.map((book) => <BookCard key={book.id} book={book} />)}
                  </BookCarousel>
                </div>
              )}
            </section>
          );
        }
        // Global section (featured/newArrivals/bestsellers/trending/comingSoon)
        if (!section.books || section.books.length === 0) return null;
        const title = GLOBAL_TITLES[section.type];
        const seeAllSection = GLOBAL_SEEALL_SECTION[section.type];
        const hasSeeAll = !!seeAllSection && section.type !== 'comingSoon' && section.type !== 'trending';
        return (
          <section key={`g-${section.type}-${sIdx}`} className="mx-auto px-3 sm:px-6 lg:px-8 xl:px-10 3xl:px-12 py-6 sm:py-8 3xl:py-16">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl sm:text-3xl 3xl:text-4xl font-display font-bold text-foreground">{title}</h2>
              {hasSeeAll && (
                <Link to={`/books?section=${seeAllSection}`} className="flex items-center gap-1 text-sm 3xl:text-lg font-medium text-accent hover:text-accent-light transition-colors">
                  {t('common.seeAll')} {language === 'ar' ? <FiArrowLeft size={16} /> : <FiArrowRight size={16} />}
                </Link>
              )}
            </div>
            <BookCarousel>
              {section.books.map((book) => (
                <BookCard key={book.id} book={book} comingSoon={section.type === 'comingSoon'} />
              ))}
            </BookCarousel>
          </section>
        );
      })}

    </PageTransition>
  );
};

export default Home;
