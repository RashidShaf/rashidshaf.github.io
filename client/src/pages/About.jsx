import { FiBookOpen, FiGlobe, FiTruck, FiHeart } from 'react-icons/fi';
import PageTransition from '../animations/PageTransition';
import useLanguageStore from '../stores/useLanguageStore';

const About = () => {
  const { t } = useLanguageStore();

  const values = [
    { icon: FiBookOpen, title: t('about.value1Title'), text: t('about.value1Text') },
    { icon: FiGlobe, title: t('about.value2Title'), text: t('about.value2Text') },
    { icon: FiTruck, title: t('about.value3Title'), text: t('about.value3Text') },
    { icon: FiHeart, title: t('about.value4Title'), text: t('about.value4Text') },
  ];

  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-3">
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
            <h2 className="text-xl font-display font-bold text-foreground mb-4">
              {t('about.story')}
            </h2>
            <p className="text-foreground/70 leading-relaxed text-[15px]">
              {t('about.storyText')}
            </p>
          </div>
          <div className="bg-surface rounded-2xl p-8 border border-muted/10 h-full">
            <h2 className="text-xl font-display font-bold text-foreground mb-4">
              {t('about.mission')}
            </h2>
            <p className="text-foreground/70 leading-relaxed text-[15px]">
              {t('about.missionText')}
            </p>
          </div>
        </div>

        {/* Values */}
        <h2 className="text-2xl font-display font-bold text-foreground text-center mb-10">
          {t('about.values')}
        </h2>
        <div className="grid sm:grid-cols-2 gap-6">
          {values.map((item, i) => (
            <div key={i} className="flex gap-5 bg-surface rounded-xl p-6 border border-muted/10">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                <item.icon className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
                <p className="text-sm text-foreground/70 leading-relaxed">{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageTransition>
  );
};

export default About;
