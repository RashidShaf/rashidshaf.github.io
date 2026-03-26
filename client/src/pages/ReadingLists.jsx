import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiList, FiPlus, FiTrash2, FiBook, FiChevronRight, FiX } from 'react-icons/fi';
import { toast } from 'react-toastify';
import PageTransition from '../animations/PageTransition';
import AccountLayout from '../components/common/AccountLayout';
import useLanguageStore from '../stores/useLanguageStore';
import api from '../utils/api';

const ReadingLists = () => {
  const { t, language } = useLanguageStore();
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchLists = async () => {
    try {
      const res = await api.get('/reading-lists');
      setLists(res.data.data || res.data);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchLists(); }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await api.post('/reading-lists', { name: newName });
      toast.success(language === 'ar' ? 'تم إنشاء القائمة' : 'List created');
      setNewName('');
      setShowModal(false);
      fetchLists();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create');
    } finally { setCreating(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm(language === 'ar' ? 'حذف هذه القائمة؟' : 'Delete this list?')) return;
    try {
      await api.delete(`/reading-lists/${id}`);
      toast.success(language === 'ar' ? 'تم حذف القائمة' : 'List deleted');
      fetchLists();
    } catch { toast.error('Failed to delete'); }
  };

  return (
    <PageTransition>
      <AccountLayout>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">{t('profile.myReadingLists')}</h1>
            {lists.length > 0 && <p className="text-sm text-foreground/50 mt-1">{lists.length} {language === 'ar' ? 'قوائم' : 'lists'}</p>}
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-accent text-white text-sm font-semibold rounded-xl hover:bg-accent-light transition-colors"
          >
            <FiPlus size={16} /> {language === 'ar' ? 'قائمة جديدة' : 'New List'}
          </button>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {[...Array(3)].map((_, i) => <div key={i} className="h-36 bg-surface-alt rounded-xl animate-pulse" />)}
          </div>
        ) : lists.length === 0 ? (
          <div className="text-center py-20">
            <FiList className="w-16 h-16 text-foreground/15 mx-auto mb-4" />
            <p className="text-foreground/50 text-lg font-medium mb-2">{language === 'ar' ? 'لا توجد قوائم قراءة' : 'No reading lists yet'}</p>
            <p className="text-foreground/40 text-sm">{language === 'ar' ? 'أنشئ قائمة لتنظيم كتبك المفضلة' : 'Create a list to organize your favorite books'}</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {lists.map((list) => (
              <div key={list.id} className="bg-surface rounded-xl border border-muted/10 shadow-sm p-5 hover:shadow-lg hover:border-accent/20 transition-all group">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center">
                    <FiBook className="w-5 h-5 text-accent" />
                  </div>
                  <button
                    onClick={() => handleDelete(list.id)}
                    className="p-1.5 text-foreground/30 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <FiTrash2 size={15} />
                  </button>
                </div>
                <h3 className="text-base font-bold text-foreground mb-1">{list.name}</h3>
                <p className="text-xs text-foreground/50 mb-4">
                  {list.items?.length || 0} {language === 'ar' ? 'كتب' : 'books'}
                </p>
                <Link
                  to={`/reading-lists/${list.id}`}
                  className="flex items-center gap-1 text-sm font-medium text-accent hover:text-accent-light transition-colors"
                >
                  {language === 'ar' ? 'عرض القائمة' : 'View List'} <FiChevronRight size={14} className="rtl:rotate-180" />
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* Create Modal */}
        <AnimatePresence>
          {showModal && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="fixed inset-0 bg-black/50 z-40" />
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="bg-surface rounded-2xl border border-muted/10 shadow-2xl w-full max-w-md p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-lg font-bold text-foreground">{language === 'ar' ? 'قائمة جديدة' : 'New Reading List'}</h3>
                    <button onClick={() => setShowModal(false)} className="p-1 text-foreground/40 hover:text-foreground"><FiX size={18} /></button>
                  </div>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder={language === 'ar' ? 'اسم القائمة' : 'List name'}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                    autoFocus
                    className="w-full px-4 py-3 bg-background border border-muted/15 rounded-xl text-foreground text-sm focus:outline-none focus:border-accent mb-4"
                  />
                  <div className="flex gap-3">
                    <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-muted/15 text-foreground/60 rounded-xl text-sm font-medium hover:bg-surface-alt transition-colors">
                      {t('common.cancel')}
                    </button>
                    <button onClick={handleCreate} disabled={creating || !newName.trim()} className="flex-1 py-2.5 bg-accent text-white rounded-xl text-sm font-semibold hover:bg-accent-light transition-colors disabled:opacity-50">
                      {creating ? t('common.loading') : t('common.create')}
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </AccountLayout>
    </PageTransition>
  );
};

export default ReadingLists;
