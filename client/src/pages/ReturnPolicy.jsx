import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiArrowLeft } from 'react-icons/fi';
import SEO from '../components/SEO';
import useLanguageStore from '../stores/useLanguageStore';
import api from '../utils/api';

const ReturnPolicy = () => {
  const { t, language } = useLanguageStore();
  const isRTL = language === 'ar';
  const [policy, setPolicy] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.get('/settings/public').then((res) => {
      if (cancelled) return;
      const s = res.data || {};
      const text = language === 'ar'
        ? (s.returnPolicyAr || s.returnPolicy || '')
        : (s.returnPolicy || s.returnPolicyAr || '');
      setPolicy(text);
    }).catch(() => {}).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [language]);

  return (
    <>
      <SEO
        title={t('returnPolicy.title')}
        description={t('returnPolicy.subtitle')}
        url="https://arkaan.qa/return-policy"
      />
      <div className="mx-auto px-4 sm:px-6 lg:px-6 xl:px-8 3xl:px-12 py-12 lg:py-16">
        {/* Hero */}
        <div className="text-center mb-12 sm:mb-16">
          <h1 className="text-3xl sm:text-4xl 3xl:text-6xl font-display font-bold text-foreground mb-3">
            {t('returnPolicy.title')}
          </h1>
          <p className="text-lg text-foreground/70 max-w-xl mx-auto">
            {t('returnPolicy.subtitle')}
          </p>
          <div className="h-1 w-16 bg-accent rounded-full mx-auto mt-6" />
        </div>

        {/* Policy text — single full-width card */}
        <div className="max-w-3xl mx-auto bg-surface rounded-2xl p-6 sm:p-8 3xl:p-10 border border-muted/10 mb-16 sm:mb-20">
          <h2 className="text-xl 3xl:text-3xl font-display font-bold text-foreground mb-4">
            {t('returnPolicy.policyHeading')}
          </h2>
          {loading ? (
            <div className="space-y-3">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-4 bg-surface-alt rounded animate-pulse" />
              ))}
            </div>
          ) : policy ? (
            <div className="text-foreground/75 text-[15px] 3xl:text-lg leading-relaxed whitespace-pre-line">
              {policy}
            </div>
          ) : (
            <p className="text-foreground/60 text-[15px] leading-relaxed">
              {t('returnPolicy.placeholder')}
            </p>
          )}
        </div>

        {/* CTA */}
        <div className="text-center bg-surface rounded-2xl p-8 sm:p-10 border border-muted/10">
          <h2 className="text-xl sm:text-2xl 3xl:text-4xl font-display font-bold text-foreground mb-2">
            {t('returnPolicy.ctaTitle')}
          </h2>
          <p className="text-foreground/60 mb-6 max-w-md mx-auto">
            {t('returnPolicy.ctaSubtitle')}
          </p>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-3.5 bg-accent text-white font-semibold rounded-xl hover:bg-accent-light transition-colors"
          >
            {t('returnPolicy.ctaButton')} {isRTL ? <FiArrowLeft size={18} /> : <FiArrowRight size={18} />}
          </Link>
        </div>
      </div>
    </>
  );
};

export default ReturnPolicy;
