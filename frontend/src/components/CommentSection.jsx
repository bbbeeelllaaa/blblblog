import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api, { commentAPI, likeAPI, getErrorDetail } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { formatDateTime } from '../utils/dateFormat';
import Pagination from './Pagination';
import toast from 'react-hot-toast';

export default function CommentSection({ articleId, refreshTrigger }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [comments, setComments] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('newest');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await api.post('/upload/image', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImageUrl(res.data.url);
    } catch {
      toast.error(t('comment.imageUploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  const loadComments = async () => {
    setLoading(true);
    try {
      const res = await commentAPI.list(articleId, { page, size: 20, sort });
      setComments(res.data.items);
      setTotal(res.data.total);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComments();
  }, [articleId, page, sort, refreshTrigger]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error(t('comment.pleaseLogin'));
      navigate('/login');
      return;
    }
    if (!content.trim()) return;
    try {
      await commentAPI.create(articleId, {
        content: content.trim(),
        parent_id: replyTo?.id || null,
        image_url: imageUrl || null,
      });
      setContent('');
      setImageUrl('');
      setReplyTo(null);
      toast.success(t('comment.posted'));
      loadComments();
    } catch (err) {
      toast.error(getErrorDetail(err, t('comment.failedToPost')));
    }
  };

  const handleLike = async (commentId) => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      await likeAPI.toggleComment(commentId);
      loadComments();
    } catch {
      toast.error(t('comment.failed'));
    }
  };

  const renderComment = (comment, isReply = false) => (
    <div key={comment.id} className={`${isReply ? 'ml-8 mt-2' : 'border-b border-gray-100 py-4'}`}>
      <div className="flex items-start gap-3">
        <Link to={`/users/${comment.user_id}`}>
          {comment.user_avatar ? (
            <img src={comment.user_avatar} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-white text-xs font-medium shrink-0">
              {comment.username?.[0]?.toUpperCase()}
            </div>
          )}
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Link to={`/users/${comment.user_id}`} className="text-sm font-medium text-gray-900 hover:text-brand">{comment.username}</Link>
            <span className="text-xs text-gray-400">
              {formatDateTime(comment.created_at, i18n.language)}
            </span>
          </div>
          <p className="text-gray-700 text-sm whitespace-pre-wrap break-words">{comment.content}</p>
          {comment.image_url && (
            <img src={comment.image_url} alt={t('comment.commentImage')} className="mt-2 max-w-xs rounded-lg object-cover max-h-48" />
          )}
          <div className="flex items-center gap-4 mt-2">
            <button
              onClick={() => handleLike(comment.id)}
              className="text-xs text-gray-400 hover:text-rose flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill={comment.is_liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {comment.like_count || 0}
            </button>
            {!isReply && (
              <button
                onClick={() => setReplyTo(replyTo?.id === comment.id ? null : comment)}
                className="text-xs text-gray-400 hover:text-brand"
              >
                {t('comment.reply')}
              </button>
            )}
          </div>
          {replyTo?.id === comment.id && (
            <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
              <input
                type="text"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t('comment.replyTo', { username: comment.username })}
                className="input-field text-sm flex-1"
                autoFocus
              />
              <button type="submit" className="btn-primary text-xs px-3">{t('comment.reply')}</button>
              <button type="button" onClick={() => { setReplyTo(null); setContent(''); }} className="btn-secondary text-xs px-3">
                {t('common.cancel')}
              </button>
            </form>
          )}
        </div>
      </div>
      {comment.replies?.map((reply) => renderComment(reply, true))}
    </div>
  );

  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold mb-4">{t('comment.comments', { total })}</h3>

      {/* Sort selector */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-gray-400">{t('comment.sortBy')}</span>
        <button
          onClick={() => { setSort('newest'); setPage(1); }}
          className={`text-xs px-3 py-1 rounded-full transition-colors ${sort === 'newest' ? 'bg-brand text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
        >
          {t('comment.newest')}
        </button>
        <button
          onClick={() => { setSort('most_liked'); setPage(1); }}
          className={`text-xs px-3 py-1 rounded-full transition-colors ${sort === 'most_liked' ? 'bg-brand text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
        >
          {t('comment.mostLiked')}
        </button>
      </div>

      {/* New comment form */}
      {!replyTo && (
        <form onSubmit={handleSubmit} className="mb-6">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={user ? t('comment.writeComment') : t('comment.loginToComment')}
            rows={3}
            className="input-field resize-none"
          />
          <div className="flex items-center gap-2 mt-2">
            <button type="submit" className="btn-primary text-sm" disabled={!content.trim()}>
              {t('comment.postComment')}
            </button>
            <label className="cursor-pointer text-sm text-gray-400 hover:text-gray-600">
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              {uploading ? t('comment.uploading') : t('comment.image')}
            </label>
          </div>
          {imageUrl && (
            <div className="mt-2 relative inline-block">
              <img src={imageUrl} alt="preview" className="max-w-xs max-h-32 rounded object-cover" />
              <button onClick={() => setImageUrl('')} className="absolute -top-1 -right-1 w-5 h-5 bg-gray-500 text-white rounded-full text-xs flex items-center justify-center">x</button>
            </div>
          )}
        </form>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-400">{t('comment.loading')}</div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 text-gray-400">{t('comment.noComments')}</div>
      ) : (
        <div>{comments.map((c) => renderComment(c))}</div>
      )}

      <Pagination page={page} totalPages={Math.ceil(total / 20)} onPageChange={setPage} />
    </div>
  );
}
