import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiList, FiPlus, FiTrash2, FiBook, FiChevronRight } from 'react-icons/fi';
import { toast } from 'react-toastify';
import PageTransition from '../animations/PageTransition';
import useLanguageStore from '../stores/useLanguageStore';
import api from '../utils/api';

const ReadingLists = () => {
  const { t, language } = useLanguageStore();
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    api.get('/reading-lists').then((res) => setLists(res.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      const res = await api.post('/reading-lists', { name: newName });
      setLists([res.data, ...lists]);
      setNewName('');
      setShowCreate(false);
      toast.success(language === 'ar' ? 'تم إنشاء القائمة' : 'List created');
    } catch (err) {
      toast.error('Failed to create list');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(language === 'ar' ? 'هل أنت متأكد؟' : 'Are you sure?')) return;
    try {
      await api.delete(`/reading-lists/${id}`);
      setLists(lists.filter((l) => l.id !== id));
      toast.success(language === 'ar' ? 'تم حذف القائمة' : 'List deleted');
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-display font-bold text-foreground">{t('profile.myReadingLists')}</h1>
          <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-light transition-colors">
            <FiPlus size={16} /> {language === 'ar' ? 'قائمة جديدة' : 'New List'}
          </button>
        </div>

        {showCreate && (
          <motion.form initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleCreate} className="flex gap-3 mb-6">
            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={language === 'ar' ? 'اسم القائمة' : 'List name'} autoFocus className="flex-1 px-4 py-2.5 bg-surface border border-muted/20 rounded-lg text-foreground text-sm focus:outline-none focus:border-accent" />
            <button type="submit" className="px-5 py-2.5 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-light">{t('common.save')}</button>
            <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2.5 text-muted text-sm hover:text-foreground">{t('common.cancel')}</button>
          </motion.form>
        )}

        {loading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-surface-alt rounded-xl animate-pulse" />)}</div>
        ) : lists.length === 0 ? (
          <div className="text-center py-16">
            <FiList className="w-14 h-14 text-muted/30 mx-auto mb-4" />
            <p className="text-muted">{t('common.noResults')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {lists.map((list) => (
              <motion.div key={list.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4 p-4 bg-surface rounded-xl border border-muted/10 hover:border-accent/20 transition-all">
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center text-accent flex-shrink-0">
                  <FiBook size={20} />
                </div>
                <Link to={`/reading-lists/${list.id}`} className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-foreground hover:text-accent transition-colors">{list.name}</h3>
                  <p className="text-xs text-muted mt-0.5">{list._count?.items || 0} {language === 'ar' ? 'كتب' : 'books'}</p>
                </Link>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleDelete(list.id)} className="p-2 text-muted hover:text-red-500 transition-colors"><FiTrash2 size={16} /></button>
                  <Link to={`/reading-lists/${list.id}`}><FiChevronRight size={18} className="text-muted" /></Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
};

export default ReadingLists;
