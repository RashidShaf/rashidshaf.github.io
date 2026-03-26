import { Link } from 'react-router-dom';
import { FiAlertCircle } from 'react-icons/fi';
import PageTransition from '../animations/PageTransition';
import useLanguageStore from '../stores/useLanguageStore';

const NotFound = () => {
  const { t } = useLanguageStore();

  return (
    <PageTransition>
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <FiAlertCircle className="w-20 h-20 text-accent mb-6" />
        <h1 className="text-6xl font-display font-bold text-foreground mb-2">404</h1>
        <p className="text-xl text-muted mb-8">Page Not Found</p>
        <Link
          to="/"
          className="px-6 py-3 bg-accent text-white rounded-lg font-medium hover:bg-accent-light transition-colors"
        >
          {t('nav.home')}
        </Link>
      </div>
    </PageTransition>
  );
};

export default NotFound;
