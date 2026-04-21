import { Link } from 'react-router-dom';
import { FiAlertCircle } from 'react-icons/fi';
import PageTransition from '../animations/PageTransition';
import SEO from '../components/SEO';
import useLanguageStore from '../stores/useLanguageStore';

const NotFound = () => {
  const { t } = useLanguageStore();

  return (
    <PageTransition>
      <SEO title="Page not found" noindex />
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <FiAlertCircle className="w-20 h-20 3xl:w-24 3xl:h-24 text-accent mb-6" />
        <h1 className="text-6xl 3xl:text-8xl font-display font-bold text-foreground mb-2">404</h1>
        <p className="text-xl 3xl:text-2xl text-foreground/60 mb-8">Page Not Found</p>
        <Link
          to="/"
          className="px-6 py-3 3xl:px-8 3xl:py-4 bg-accent text-white rounded-lg font-medium 3xl:text-lg hover:bg-accent-light transition-colors"
        >
          {t('nav.home')}
        </Link>
      </div>
    </PageTransition>
  );
};

export default NotFound;
