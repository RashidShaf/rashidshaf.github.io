import { useState } from 'react';
import { FiPhone, FiMail, FiMapPin, FiClock, FiSend } from 'react-icons/fi';
import { toast } from 'react-toastify';
import PageTransition from '../animations/PageTransition';
import useLanguageStore from '../stores/useLanguageStore';

const Contact = () => {
  const { t } = useLanguageStore();
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);

  const contactInfo = [
    { icon: FiPhone, label: t('contact.phone'), value: '+974 5994 3131', dir: 'ltr' },
    { icon: FiMail, label: t('contact.email'), value: 'info@arkaan.com' },
    { icon: FiMapPin, label: t('contact.location'), value: t('contact.locationText') },
    { icon: FiClock, label: t('contact.hours'), value: t('contact.hoursText') },
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

        <div className="grid lg:grid-cols-5 gap-10">
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
              <div key={i} className="flex items-start gap-4 bg-surface rounded-xl p-4 border border-muted/10">
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
