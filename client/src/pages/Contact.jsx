import { useState } from 'react';
import { FiPhone, FiMail, FiMapPin, FiSend, FiInstagram } from 'react-icons/fi';
import { FaWhatsapp, FaFacebookF, FaTiktok, FaLinkedinIn, FaXTwitter, FaPinterestP } from 'react-icons/fa6';
import { toast } from 'react-toastify';
import PageTransition from '../animations/PageTransition';
import useLanguageStore from '../stores/useLanguageStore';

const Contact = () => {
  const { t, language } = useLanguageStore();
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);

  const contactInfo = [
    { icon: FiPhone, label: t('contact.phone'), value: '+974 5994 3131', dir: 'ltr' },
    { icon: FiMail, label: t('contact.email'), value: 'info@arkaan.com' },
    { icon: FiMapPin, label: t('contact.location'), value: t('contact.locationText') },
  ];

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSending(true);
    setTimeout(() => {
      toast.success(t('contact.sent'));
      setForm({ name: '', email: '', subject: '', message: '' });
      setSending(false);
    }, 800);
  };

  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        {/* Header */}
        <div className="text-center mb-14">
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-3">
            {t('contact.title')}
          </h1>
          <p className="text-lg text-foreground/70 max-w-xl mx-auto">
            {t('contact.subtitle')}
          </p>
          <div className="h-1 w-16 bg-accent rounded-full mx-auto mt-6" />
        </div>

        <div className="grid lg:grid-cols-5 gap-6 lg:gap-10">
          {/* Contact Info */}
          <div className="lg:col-span-2 space-y-5">
            <div>
              <h2 className="text-xl font-display font-bold text-foreground mb-2">
                {t('contact.getInTouch')}
              </h2>
              <p className="text-sm text-foreground/70 leading-relaxed mb-6">
                {t('contact.getInTouchText')}
              </p>
            </div>

            {contactInfo.map((item, i) => (
              <div key={i} className="flex items-start gap-3 sm:gap-4 bg-surface rounded-xl p-3 sm:p-4 border border-muted/10">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-xs text-foreground/70 uppercase tracking-wider font-medium mb-0.5">
                    {item.label}
                  </p>
                  <p className="text-foreground text-sm font-medium" dir={item.dir || undefined}>
                    {item.value}
                  </p>
                </div>
              </div>
            ))}

            {/* Social Links */}
            <div className="bg-surface rounded-xl p-4 border border-muted/10">
              <p className="text-xs text-foreground/70 uppercase tracking-wider font-medium mb-3">
                {language === 'ar' ? 'تابعنا' : 'Follow Us'}
              </p>
              <div className="flex items-center gap-2.5 flex-wrap">
                {[
                  { href: 'https://www.instagram.com/arkaan.qa?igsh=b3l5Mmwyc3Bndm5j', icon: FiInstagram, label: 'Instagram', bg: 'bg-gradient-to-br from-pink-500 to-orange-400' },
                  { href: 'https://wa.me/97459943131', icon: FaWhatsapp, label: 'WhatsApp', bg: 'bg-green-500' },
                  { href: 'https://www.facebook.com/profile.php?id=61569754228280', icon: FaFacebookF, label: 'Facebook', bg: 'bg-blue-600' },
                  { href: 'https://www.tiktok.com/@arkaan.qa', icon: FaTiktok, label: 'TikTok', bg: 'bg-black' },
                  { href: 'https://www.linkedin.com/in/arkaan-store-a97810347/', icon: FaLinkedinIn, label: 'LinkedIn', bg: 'bg-sky-700' },
                  { href: 'https://x.com/Arkaanqa', icon: FaXTwitter, label: 'X', bg: 'bg-black' },
                  { href: 'https://www.pinterest.com/arkaanqa/', icon: FaPinterestP, label: 'Pinterest', bg: 'bg-red-600' },
                ].map((s) => (
                  <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className={`w-9 h-9 flex items-center justify-center rounded-full ${s.bg} text-white transition-all duration-300 hover:opacity-80 hover:scale-110`} aria-label={s.label}>
                    <s.icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-3">
            <div className="bg-surface rounded-2xl p-6 sm:p-8 border border-muted/10">
              <h2 className="text-xl font-display font-bold text-foreground mb-6">
                {t('contact.sendMessage')}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      {t('contact.name')}
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2.5 bg-background border border-muted/15 rounded-lg text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-accent transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      {t('contact.emailAddress')}
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2.5 bg-background border border-muted/15 rounded-lg text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-accent transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    {t('contact.subject')}
                  </label>
                  <input
                    type="text"
                    name="subject"
                    value={form.subject}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2.5 bg-background border border-muted/15 rounded-lg text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    {t('contact.message')}
                  </label>
                  <textarea
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    required
                    rows={5}
                    className="w-full px-4 py-2.5 bg-background border border-muted/15 rounded-lg text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-accent transition-colors resize-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={sending}
                  className="flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-2.5 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-light transition-colors disabled:opacity-60"
                >
                  <FiSend className="w-4 h-4" />
                  {sending ? t('common.loading') : t('contact.send')}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default Contact;
