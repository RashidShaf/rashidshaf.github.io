import { Link } from 'react-router-dom';
import { FiMail, FiMapPin, FiPhone, FiSend, FiInstagram } from 'react-icons/fi';
import { FaWhatsapp, FaFacebookF, FaTiktok, FaLinkedinIn, FaXTwitter, FaPinterestP } from 'react-icons/fa6';
import useLanguageStore from '../../stores/useLanguageStore';

const Footer = () => {
  const { t, language } = useLanguageStore();

  const quickLinks = [
    { to: '/', label: t('nav.home') },
    { to: '/books', label: t('nav.books') },
    { to: '/about', label: t('nav.about') },
    { to: '/contact', label: t('nav.contact') },
    { to: '/cart', label: t('nav.cart') },
  ];

  return (
    <footer className="bg-primary text-background">
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
          {/* About */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="mb-4">
              <span className="text-2xl font-display font-bold tracking-[0.15em] text-background">
                {language === 'ar' ? 'أركان' : 'ARKAAN'}
              </span>
              <div className="h-0.5 w-8 bg-accent rounded-full mt-1" />
            </div>
            <p className="text-background/70 text-sm leading-relaxed max-w-xs mb-5">
              {t('footer.about')}
            </p>
            <p className="text-xs font-semibold uppercase tracking-wider text-accent mb-3">{language === 'ar' ? 'تابعنا' : 'Follow Us'}</p>
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { href: 'https://www.instagram.com/arkaan.bookstore?igsh=bW9qZmh0M3h5Ymd0', icon: FiInstagram, label: 'Instagram', bg: 'bg-gradient-to-br from-pink-500 to-orange-400' },
                { href: 'https://wa.me/97459943131', icon: FaWhatsapp, label: 'WhatsApp', bg: 'bg-green-500' },
                { href: 'https://www.facebook.com/profile.php?id=61569754228280', icon: FaFacebookF, label: 'Facebook', bg: 'bg-blue-600' },
                { href: 'https://www.tiktok.com/@arkaan.qa', icon: FaTiktok, label: 'TikTok', bg: 'bg-black' },
                { href: 'https://www.linkedin.com/in/arkaan-store-a97810347/', icon: FaLinkedinIn, label: 'LinkedIn', bg: 'bg-sky-700' },
                { href: 'https://x.com/Arkaanqa', icon: FaXTwitter, label: 'X', bg: 'bg-black' },
                { href: 'https://www.pinterest.com/arkaanqa/', icon: FaPinterestP, label: 'Pinterest', bg: 'bg-red-600' },
              ].map((s) => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className={`w-8 h-8 flex items-center justify-center rounded-full ${s.bg} text-white transition-all duration-300 hover:opacity-80 hover:scale-110`} aria-label={s.label}>
                  <s.icon className="w-3.5 h-3.5" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-accent mb-4">
              {t('footer.quickLinks')}
            </h4>
            <ul className="space-y-2.5">
              {quickLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-background/70 hover:text-accent transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-accent mb-4">
              {t('footer.contact')}
            </h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm text-background/70">
                <FiMapPin className="w-4 h-4 mt-0.5 text-accent flex-shrink-0" />
                <span>{t('footer.address')}</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-background/70">
                <FiPhone className="w-4 h-4 text-accent flex-shrink-0" />
                <span dir="ltr">+974 5994 3131</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-background/70">
                <FiMail className="w-4 h-4 text-accent flex-shrink-0" />
                <span>info@arkaan.com</span>
              </li>
            </ul>
          </div>

          {/* Newsletter + Social */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-accent mb-4">
              {t('home.newsletter')}
            </h4>
            <p className="text-sm text-background/70 mb-4">
              {t('home.heroSubtitle')}
            </p>
            <form
              onSubmit={(e) => e.preventDefault()}
              className="flex"
            >
              <input
                type="email"
                placeholder={t('home.newsletterPlaceholder')}
                className="flex-1 px-4 py-2.5 bg-primary-light text-background placeholder:text-background/40 text-sm rounded-l-lg rtl:rounded-l-none rtl:rounded-r-lg border border-background/10 focus:outline-none focus:border-accent transition-colors"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-accent text-white rounded-r-lg rtl:rounded-r-none rtl:rounded-l-lg hover:bg-accent-light transition-colors"
                aria-label={t('home.subscribe')}
              >
                <FiSend className="w-4 h-4" />
              </button>
            </form>

          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-background/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-background/50">
            &copy; {new Date().getFullYear()} Arkaan Bookstore. {t('footer.rights')}
          </p>
          <div className="flex items-center gap-4 text-xs text-background/50">
            <span>Doha, Qatar</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
