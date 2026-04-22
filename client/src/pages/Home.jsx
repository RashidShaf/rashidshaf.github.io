import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FiArrowRight, FiArrowLeft, FiBookOpen } from 'react-icons/fi';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import BookCard from '../components/books/BookCard';
import BookCarousel from '../components/common/BookCarousel';
import LogoOverlay from '../components/common/LogoOverlay';
import Image from '../components/common/Image';
import CornerSection from '../components/common/CornerSection';
import SEO from '../components/SEO';
import useLanguageStore from '../stores/useLanguageStore';
import api from '../utils/api';

const BannerSlide = ({ desktop, mobile, alt, link, priority = false }) => {
  const content = (
    <>
      <Image
        src={desktop}
        alt={alt}
        width={2400}
        height={900}
        widths={[800, 1600, 2400]}
        sizes="100vw"
        priority={priority}
        className="hidden sm:block w-full h-auto object-cover"
      />
      <Image
        src={mobile || desktop}
        alt={alt}
        width={800}
        height={600}
        widths={mobile ? [400, 800, 1600] : [800, 1600, 2400]}
        sizes="100vw"
        priority={priority}
        className="block sm:hidden w-full h-auto object-cover"
      />
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
        <BannerSlide desktop={b.desktopImage} mobile={b.mobileImage} alt={b.title || 'Arkaan Bookstore'} link={b.link} priority />
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
        {banners.map((b, idx) => (
          <SwiperSlide key={b.id}>
            <BannerSlide desktop={b.desktopImage} mobile={b.mobileImage} alt={b.title || 'Arkaan Bookstore'} link={b.link} priority={idx === 0} />
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

  const homeJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': 'https://arkaan.qa/#organization',
        name: 'Arkaan Bookstore',
        url: 'https://arkaan.qa/',
        logo: 'https://arkaan.qa/arkaan-banner-logo.png',
        contactPoint: {
          '@type': 'ContactPoint',
          telephone: '+974-5994-3131',
          contactType: 'customer service',
          areaServed: 'QA',
          availableLanguage: ['English', 'Arabic'],
        },
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Doha',
          addressCountry: 'QA',
        },
      },
      {
        '@type': 'WebSite',
        '@id': 'https://arkaan.qa/#website',
        url: 'https://arkaan.qa/',
        name: 'Arkaan Bookstore',
        publisher: { '@id': 'https://arkaan.qa/#organization' },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: 'https://arkaan.qa/books?search={search_term_string}',
          },
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  };

  // Labels and see-all flags per section type. Flag maps to the server's `?isFeatured=1` etc.
  const SECTION_TITLES = {
    featured:    t('home.featured'),
    bestsellers: t('home.bestsellers'),
    newArrivals: t('home.newArrivals'),
    trending:    t('home.trending'),
    comingSoon:  t('home.comingSoon'),
  };
  const SECTION_FLAG = {
    featured:    'isFeatured',
    bestsellers: 'isBestseller',
    newArrivals: 'isNewArrival',
    trending:    'isTrending',
    comingSoon:  'isComingSoon',
  };

  return (
    <>
      <SEO url="https://arkaan.qa/" jsonLd={homeJsonLd} />
      {/* Hero Banner Carousel */}
      <HeroBanner />

      {/* Driven by /home/layout — sections appear in admin-controlled order.
          Each corner block now renders: L1 title + L2 subcategories + 5-section grid. */}
      {!loading && sections.map((section, sIdx) => {
        if (section.type === 'corner') {
          const l1 = section.corner;
          if (!l1) return null;
          const hasChildren = l1.children && l1.children.length > 0;
          // Keep ALL cornerSections (including empty ones) so the 2-per-row grid respects
          // the admin-configured order. Empty sections render a "No products yet" placeholder.
          const cornerSections = section.cornerSections || [];
          const hasCornerSections = cornerSections.length > 0;
          if (!hasChildren && !hasCornerSections) return null;
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
                    const coverPath = cat.image || null;
                    return (
                      <Link
                        key={cat.id}
                        to={`/books?category=${cat.slug}`}
                        className="group bg-surface rounded-lg overflow-hidden hover:shadow-lg hover:shadow-accent/5 transition-all duration-300"
                      >
                        <div className="relative aspect-[5/6] bg-surface-alt overflow-hidden">
                          {coverPath ? (
                            <Image src={coverPath} alt={getName(cat)} width={500} height={600} sizes="(max-width: 640px) 45vw, 240px" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
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
              {hasCornerSections && (
                <div className={hasChildren ? 'mt-6 3xl:mt-10' : ''}>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 3xl:gap-8">
                    {cornerSections.map((s, idx) => {
                      const isLast = idx === cornerSections.length - 1;
                      const oddCount = cornerSections.length % 2 === 1;
                      const fullWidth = isLast && oddCount;
                      const flag = SECTION_FLAG[s.type];
                      const seeAllUrl = flag
                        ? `/books?category=${encodeURIComponent(l1.slug)}&${flag}=1`
                        : `/books?category=${encodeURIComponent(l1.slug)}`;
                      return (
                        <div key={s.type} className={fullWidth ? 'lg:col-span-2' : ''}>
                          <CornerSection
                            title={SECTION_TITLES[s.type] || s.type}
                            books={s.books || []}
                            seeAllUrl={seeAllUrl}
                            comingSoon={s.type === 'comingSoon'}
                          />
                        </div>
                      );
                    })}
                  </div>
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

    </>
  );
};

export default Home;
