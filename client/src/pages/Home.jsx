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
import AdBannerGrid from '../components/home/AdBannerGrid';
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

  // Labels per section type.
  const SECTION_TITLES = {
    featured:    t('home.featured'),
    bestsellers: t('home.bestsellers'),
    newArrivals: t('home.newArrivals'),
    trending:    t('home.trending'),
    comingSoon:  t('home.comingSoon'),
  };
  // Maps section type to the catalog page's section-filter query param value.
  // The catalog dropdown UI (Books.jsx) reads `?section=` and highlights the matching option,
  // so using this param keeps the dropdown in sync on See All.
  const SECTION_SEE_ALL = {
    featured:    'featured',
    bestsellers: 'bestseller',   // singular — matches existing dropdown value
    newArrivals: 'new',          // short form — matches existing dropdown value
    trending:    'trending',
    comingSoon:  'comingSoon',
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
          // Only render sub-sections that actually have books. Empty ones
          // (e.g. Books → Coming Soon with zero picks/flags) are hidden for this corner.
          const populatedSections = cornerSections.filter((s) => Array.isArray(s.books) && s.books.length > 0);
          const hasCornerSections = populatedSections.length > 0;
          if (!hasChildren && !hasCornerSections) return null;
          return (
            <section key={`corner-${l1.id}`} className="mx-auto px-3 sm:px-6 lg:px-8 xl:px-10 3xl:px-12 py-6 sm:py-8 3xl:py-16">
              <div className="flex items-center justify-between mb-6 sm:mb-8">
                <h2 className="text-2xl sm:text-3xl 3xl:text-4xl font-display font-bold text-foreground">
                  {getName(l1)}
                </h2>
                <Link to={`/books?category=${l1.slug}`} className="flex items-center gap-1 text-sm 3xl:text-lg font-medium text-accent hover:text-accent-light transition-colors">
                  {t('common.seeAll')} {language === 'ar' ? <FiArrowLeft size={16} /> : <FiArrowRight size={16} />}
                </Link>
              </div>
              {section.adTiles && section.adTiles.length > 0 && (
                <AdBannerGrid tiles={section.adTiles} />
              )}
              {hasChildren && (
                <div className={(section.adTiles && section.adTiles.length > 0) ? 'mt-6 3xl:mt-10' : ''}>
                {/* Gray-tinted backdrop visually groups the L2 category cards. */}
                <div className="bg-[#C2C1BD] rounded-xl p-3 sm:p-4 3xl:p-5">
                <BookCarousel>
                  {l1.children.map((cat) => {
                    const coverPath = cat.image || null;
                    return (
                      <Link
                        key={cat.id}
                        to={`/books?category=${cat.slug}`}
                        className="group bg-surface rounded-lg overflow-hidden hover:shadow-lg hover:shadow-accent/5 transition-all duration-300"
                      >
                        <div className="relative aspect-square bg-surface-alt overflow-hidden rounded-lg">
                          {coverPath ? (
                            <Image src={coverPath} alt={getName(cat)} width={500} height={600} sizes="(max-width: 640px) 45vw, 240px" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent/10 to-accent/5">
                              <FiBookOpen className="w-10 h-10 text-accent/30" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                          <div className="absolute bottom-1.5 left-1.5 right-1.5 sm:bottom-3 sm:left-3 sm:right-3">
                            <h3 className="text-[11px] sm:text-[13px] lg:text-[14px] xl:text-[13px] 2xl:text-[15px] font-bold text-white text-center line-clamp-3 leading-tight break-words min-h-[2.2em]">
                              {getName(cat)}
                            </h3>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </BookCarousel>
                </div>
                </div>
              )}
              {hasCornerSections && (
                <div className={(hasChildren || (section.adTiles && section.adTiles.length > 0)) ? 'mt-6 3xl:mt-10' : ''}>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 3xl:gap-8">
                    {populatedSections.map((s, idx) => {
                      const isLast = idx === populatedSections.length - 1;
                      const oddCount = populatedSections.length % 2 === 1;
                      const fullWidth = isLast && oddCount;
                      const sectionValue = SECTION_SEE_ALL[s.type];
                      const seeAllUrl = sectionValue
                        ? `/books?category=${encodeURIComponent(l1.slug)}&section=${sectionValue}`
                        : `/books?category=${encodeURIComponent(l1.slug)}`;
                      // Custom per-corner title overrides the default translation when set.
                      const customTitle = language === 'ar'
                        ? (s.titleAr && s.titleAr.trim())
                        : (s.titleEn && s.titleEn.trim());
                      const title = customTitle || SECTION_TITLES[s.type] || s.type;
                      return (
                        <div key={s.type} className={fullWidth ? 'lg:col-span-2' : ''}>
                          <CornerSection
                            title={title}
                            books={s.books || []}
                            seeAllUrl={seeAllUrl}
                            comingSoon={s.type === 'comingSoon'}
                            wide={fullWidth}
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
        // Root-level global sections (Featured / Bestsellers / etc.) are intentionally
        // not rendered — each corner already shows its own, so showing them again at
        // the root would duplicate. Server still returns them for API compatibility.
        return null;
      })}

    </>
  );
};

export default Home;
