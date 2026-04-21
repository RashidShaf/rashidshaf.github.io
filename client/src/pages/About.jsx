import { Link } from 'react-router-dom';
import { FiBookOpen, FiGlobe, FiTruck, FiHeart, FiDollarSign, FiArrowRight, FiArrowLeft } from 'react-icons/fi';
import SEO from '../components/SEO';
import useLanguageStore from '../stores/useLanguageStore';

const About = () => {
  const { t, language } = useLanguageStore();
  const isRTL = language === 'ar';

  const values = [
    { icon: FiBookOpen, title: t('about.value1Title'), text: t('about.value1Text') },
    { icon: FiGlobe, title: t('about.value2Title'), text: t('about.value2Text') },
    { icon: FiTruck, title: t('about.value3Title'), text: t('about.value3Text') },
    { icon: FiHeart, title: t('about.value4Title'), text: t('about.value4Text') },
  ];

  const whyUs = [
    { icon: FiDollarSign, title: t('about.cod'), text: t('about.codText'), bg: 'bg-emerald-600' },
    { icon: FiTruck, title: t('about.fastDelivery'), text: t('about.fastDeliveryText'), bg: 'bg-blue-600' },
    { icon: FiGlobe, title: t('about.bilingual'), text: t('about.bilingualText'), bg: 'bg-violet-600' },
  ];

  return (
    <>
      <SEO
        title="About Us"
        description="Learn about Arkaan Bookstore — your trusted bookstore in Doha, Qatar. Serving Arabic & English readers with cash-on-delivery across Qatar."
        url="https://arkaan.qa/about"
      />
      <div className="mx-auto px-4 sm:px-6 lg:px-6 xl:px-8 3xl:px-12 py-12 lg:py-16">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-3xl sm:text-4xl 3xl:text-6xl font-display font-bold text-foreground mb-3">
            {t('about.title')}
          </h1>
          <p className="text-lg text-foreground/70 max-w-xl mx-auto">
            {t('about.subtitle')}
          </p>
          <div className="h-1 w-16 bg-accent rounded-full mx-auto mt-6" />
        </div>

        {/* Story + Mission */}
        <div className="grid md:grid-cols-2 gap-10 mb-20">
          <div className="bg-surface rounded-2xl p-8 border border-muted/10 h-full">
            <h2 className="text-xl 3xl:text-3xl font-display font-bold text-foreground mb-4">
              {t('about.story')}
            </h2>
            <p className="text-foreground/70 leading-relaxed text-[15px] 3xl:text-lg">
              {t('about.storyText')}
            </p>
          </div>
          <div className="bg-surface rounded-2xl p-8 border border-muted/10 h-full">
            <h2 className="text-xl 3xl:text-3xl font-display font-bold text-foreground mb-4">
              {t('about.mission')}
            </h2>
            <p className="text-foreground/70 leading-relaxed text-[15px] 3xl:text-lg">
              {t('about.missionText')}
            </p>
          </div>
        </div>

        {/* Values */}
        <h2 className="text-2xl 3xl:text-4xl font-display font-bold text-foreground text-center mb-10">
          {t('about.values')}
        </h2>
        <div className="grid sm:grid-cols-2 gap-6 mb-20">
          {values.map((item, i) => (
            <div key={i} className="flex gap-5 bg-surface rounded-xl p-6 border border-muted/10">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                <item.icon className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
                <p className="text-sm 3xl:text-lg text-foreground/70 leading-relaxed">{item.text}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Why Choose Us */}
        <h2 className="text-2xl 3xl:text-4xl font-display font-bold text-foreground text-center mb-10">
          {t('about.whyChoose')}
        </h2>
        <div className="grid sm:grid-cols-3 gap-6 mb-20">
          {whyUs.map((item, i) => (
            <div key={i} className="bg-surface rounded-2xl p-6 border border-muted/10 text-center">
              <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-xl ${item.bg} flex items-center justify-center mx-auto mb-4`}>
                <item.icon className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
              </div>
              <h3 className="font-bold text-foreground mb-2">{item.title}</h3>
              <p className="text-sm 3xl:text-lg text-foreground/60">{item.text}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center py-8">
          <h2 className="text-2xl sm:text-3xl 3xl:text-5xl font-display font-bold text-foreground mb-3">
            {t('about.ctaTitle')}
          </h2>
          <p className="text-foreground/50 mb-8 max-w-md mx-auto">
            {t('about.ctaSubtitle')}
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              to="/books"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-accent text-white font-semibold rounded-xl hover:bg-accent-light transition-colors"
            >
              {t('about.browseBooks')} {isRTL ? <FiArrowLeft size={18} /> : <FiArrowRight size={18} />}
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-8 py-3.5 border-2 border-muted/20 text-foreground font-semibold rounded-xl hover:border-accent hover:text-accent transition-colors"
            >
              {t('about.contactUs')}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default About;
