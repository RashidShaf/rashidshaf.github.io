import { useState, useEffect, useCallback } from 'react';
import { FiStar } from 'react-icons/fi';
import { toast } from 'react-toastify';
import useLanguageStore from '../../stores/useLanguageStore';
import useAuthStore from '../../stores/useAuthStore';
import ConfirmModal from '../common/ConfirmModal';
import { formatDate, formatDateAr } from '../../utils/formatters';
import api from '../../utils/api';

const StarRating = ({ rating, size = 16 }) => (
  <div className="flex items-center gap-0.5">
    {[...Array(5)].map((_, i) => (
      <FiStar
        key={i}
        size={size}
        className={i < rating ? 'text-yellow-500 fill-yellow-500' : 'text-muted/30'}
      />
    ))}
  </div>
);

const StarSelector = ({ rating, hovered, onHover, onLeave, onSelect }) => (
  <div className="flex items-center gap-1" onMouseLeave={onLeave}>
    {[1, 2, 3, 4, 5].map((star) => (
      <button
        key={star}
        type="button"
        onClick={() => onSelect(star)}
        onMouseEnter={() => onHover(star)}
        className="p-0.5 transition-colors"
      >
        <FiStar
          size={24}
          className={
            star <= (hovered || rating)
              ? 'text-yellow-500 fill-yellow-500'
              : 'text-muted/30'
          }
        />
      </button>
    ))}
  </div>
);

const ReviewForm = ({ bookId, existingReview, onSuccess, onCancel, isGuest }) => {
  const { t } = useLanguageStore();
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [comment, setComment] = useState(existingReview?.comment || '');
  const [guestName, setGuestName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isEdit = !!existingReview;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error(t('book.ratingRequired'));
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit) {
        await api.put(`/reviews/${existingReview.id}`, { rating, comment });
        toast.success(t('book.reviewUpdated'));
      } else {
        const data = { rating, comment };
        if (isGuest) data.guestName = guestName.trim();
        await api.post(`/reviews/books/${bookId}`, data);
        toast.success(t('book.reviewSubmitted'));
      }
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-surface border border-muted/10 rounded-xl p-3 sm:p-5 space-y-4">
      <h4 className="text-base font-semibold text-foreground">
        {isEdit ? t('book.editReview') : t('book.writeReview')}
      </h4>

      {isGuest && (
        <input
          type="text"
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          className="w-full bg-surface-alt border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-1 focus:ring-accent"
          placeholder={t('contact.name')}
        />
      )}

      <div>
        <StarSelector
          rating={rating}
          hovered={hoveredStar}
          onHover={setHoveredStar}
          onLeave={() => setHoveredStar(0)}
          onSelect={setRating}
        />
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={4}
        className="w-full bg-surface-alt border border-gray-300 rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-1 focus:ring-accent resize-none"
        placeholder={t('book.writeReview') + '...'}
      />

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="px-5 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-light transition-colors disabled:opacity-50"
        >
          {submitting ? t('common.loading') : (isEdit ? t('common.save') : t('common.submit'))}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2 text-sm text-foreground/60 hover:text-foreground transition-colors"
          >
            {t('common.cancel')}
          </button>
        )}
      </div>
    </form>
  );
};

const ReviewCard = ({ review, isOwn, onEdit, onDelete }) => {
  const { t, language } = useLanguageStore();

  const userName = review.user
    ? `${review.user.firstName} ${review.user.lastName ? review.user.lastName.charAt(0) + '.' : ''}`
    : (review.guestName || 'Guest');

  const dateStr = language === 'ar'
    ? formatDateAr(review.createdAt)
    : formatDate(review.createdAt);

  return (
    <div className={`bg-surface border rounded-xl p-3 sm:p-5 ${isOwn ? 'border-accent/30 ring-1 ring-accent/10' : 'border-muted/10'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <StarRating rating={review.rating} size={14} />
            <span className="text-sm font-medium text-foreground">{userName}</span>
            <span className="text-xs text-foreground/60">{dateStr}</span>
            {review.isVerified && (
              <span className="text-xs text-secondary font-medium flex items-center gap-1">
                {t('book.verifiedPurchase')}
              </span>
            )}
          </div>
          {review.comment && (
            <p className="mt-3 text-sm text-foreground/70 leading-relaxed">{review.comment}</p>
          )}
        </div>

        {isOwn && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={onEdit}
              className="text-xs text-accent hover:text-accent-light transition-colors"
            >
              {t('common.edit')}
            </button>
            <button
              onClick={onDelete}
              className="text-xs text-red-500 hover:text-red-400 transition-colors"
            >
              {t('common.delete')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const ReviewSection = ({ bookId, book, onReviewChange }) => {
  const { t, language } = useLanguageStore();
  const user = useAuthStore((s) => s.user);

  const [reviews, setReviews] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [editingReview, setEditingReview] = useState(null);

  const LIMIT = 5;

  const fetchReviews = useCallback(async (pageNum = 1, append = false) => {
    try {
      setLoading(true);
      const res = await api.get(`/reviews/books/${bookId}?page=${pageNum}&limit=${LIMIT}`);
      const data = res.data;

      const reviewsList = data.data || data.reviews || [];
      if (append) {
        setReviews((prev) => [...prev, ...reviewsList]);
      } else {
        setReviews(reviewsList);
      }

      setTotalPages(data.pagination?.totalPages || data.totalPages || 1);
      setPage(pageNum);
    } catch (err) {
      console.error('Failed to load reviews:', err);
    } finally {
      setLoading(false);
    }
  }, [bookId]);

  useEffect(() => {
    if (bookId) {
      fetchReviews(1);
    }
  }, [bookId, fetchReviews]);

  const userReview = user
    ? reviews.find((r) => r.user?.id === user.id)
    : null;

  const hasGuestReviewed = !user && (() => {
    try { return (JSON.parse(localStorage.getItem('guestReviews') || '[]')).includes(bookId); } catch { return false; }
  })();

  const handleReviewSuccess = () => {
    setEditingReview(null);
    if (!user) {
      try {
        const reviewed = JSON.parse(localStorage.getItem('guestReviews') || '[]');
        if (!reviewed.includes(bookId)) { reviewed.push(bookId); localStorage.setItem('guestReviews', JSON.stringify(reviewed)); }
      } catch {}
    }
    fetchReviews(1);
    onReviewChange?.();
  };

  const [deleteId, setDeleteId] = useState(null);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/reviews/${deleteId}`);
      toast.success(t('book.reviewDeleted'));
      setDeleteId(null);
      fetchReviews(1);
      onReviewChange?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete review');
      setDeleteId(null);
    }
  };

  const handleLoadMore = () => {
    fetchReviews(page + 1, true);
  };

  return (
    <div>
      {/* User review form or status */}
      {user ? (
        userReview && !editingReview ? (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-accent mb-2">{t('book.yourReview')}</h4>
            <ReviewCard
              review={userReview}
              isOwn={true}
              onEdit={() => setEditingReview(userReview)}
              onDelete={() => setDeleteId(userReview.id)}
            />
          </div>
        ) : editingReview ? (
          <div className="mb-6">
            <ReviewForm
              bookId={bookId}
              existingReview={editingReview}
              onSuccess={handleReviewSuccess}
              onCancel={() => setEditingReview(null)}
            />
          </div>
        ) : !userReview ? (
          <div className="mb-6">
            <ReviewForm
              bookId={bookId}
              onSuccess={handleReviewSuccess}
            />
          </div>
        ) : null
      ) : hasGuestReviewed ? (
        <div className="mb-6 bg-surface border border-muted/10 rounded-xl p-3 sm:p-5 text-center">
          <p className="text-sm text-foreground/60">{t('book.reviewSubmitted')}</p>
        </div>
      ) : (
        <div className="mb-6">
          <ReviewForm
            bookId={bookId}
            onSuccess={handleReviewSuccess}
            isGuest={true}
          />
        </div>
      )}

      {/* Reviews list */}
      {loading && reviews.length === 0 ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-surface border border-muted/10 rounded-xl p-5 animate-pulse">
              <div className="h-4 bg-surface-alt rounded w-1/3 mb-3" />
              <div className="h-3 bg-surface-alt rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-foreground/60">{t('book.noReviews')}</p>
      ) : (
        <div className="space-y-3">
          {reviews
            .filter((r) => !userReview || r.id !== userReview.id)
            .map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                isOwn={false}
              />
            ))}
        </div>
      )}

      {/* Load more */}
      {page < totalPages && (
        <div className="mt-4 text-center">
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className="px-6 py-2 text-sm font-medium text-accent hover:text-accent-light border border-accent/20 rounded-lg hover:border-accent/40 transition-colors disabled:opacity-50"
          >
            {loading ? '...' : t('book.loadMore')}
          </button>
        </div>
      )}
      <ConfirmModal
        open={!!deleteId}
        title={t('book.deleteReview')}
        message={t('common.confirmDelete')}
        confirmText={t('common.delete')}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
};

export default ReviewSection;
