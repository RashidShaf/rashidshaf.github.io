import { Helmet } from 'react-helmet-async';
import useLanguageStore from '../stores/useLanguageStore';

const SITE_URL = 'https://arkaan.qa';
const DEFAULT_IMAGE = `${SITE_URL}/arkaan-banner-logo.png`;
const DEFAULT_TITLE = 'Arkaan Bookstore — Books, Stationery & Printing in Doha, Qatar';
const DEFAULT_DESCRIPTION = "Arkaan Bookstore in Doha, Qatar. Shop Arabic & English books, Islamic literature, children's books, stationery and printing services. Cash on delivery across Qatar.";

const SEO = ({
  title,
  description,
  image,
  url,
  type = 'website',
  jsonLd,
  noindex = false,
}) => {
  const { language } = useLanguageStore();

  const finalTitle = title ? `${title} | Arkaan Bookstore` : DEFAULT_TITLE;
  const finalDescription = description || DEFAULT_DESCRIPTION;
  const finalImage = image || DEFAULT_IMAGE;
  const finalUrl = url || (typeof window !== 'undefined' ? window.location.href : SITE_URL);
  const locale = language === 'ar' ? 'ar_QA' : 'en_US';
  const altLocale = language === 'ar' ? 'en_US' : 'ar_QA';

  return (
    <Helmet>
      <html lang={language === 'ar' ? 'ar' : 'en'} dir={language === 'ar' ? 'rtl' : 'ltr'} />
      <title>{finalTitle}</title>
      <meta name="description" content={finalDescription} />
      <link rel="canonical" href={finalUrl} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content="Arkaan Bookstore" />
      <meta property="og:title" content={finalTitle} />
      <meta property="og:description" content={finalDescription} />
      <meta property="og:url" content={finalUrl} />
      <meta property="og:image" content={finalImage} />
      <meta property="og:locale" content={locale} />
      <meta property="og:locale:alternate" content={altLocale} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={finalTitle} />
      <meta name="twitter:description" content={finalDescription} />
      <meta name="twitter:image" content={finalImage} />

      {/* JSON-LD structured data */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
};

export default SEO;
