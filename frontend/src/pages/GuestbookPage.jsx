import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api, { guestbookAPI, getErrorDetail } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { formatDateTime } from '../utils/dateFormat';
import Pagination from '../components/Pagination';
import ConfirmModal from '../components/ConfirmModal';
import toast from 'react-hot-toast';

const CARD_ACCENTS = ['border-l-brand', 'border-l-warm', 'border-l-rose', 'border-l-brand-light'];
const CARD_BGS = ['bg-white', 'bg-brand-light/35', 'bg-warm/20'];

export default function GuestbookPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const totalPages = Math.ceil(total / 20);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const res = await guestbookAPI.list({ page, size: 20 });
      setMessages(res.data.items);
      setTotal(res.data.total);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, [page]);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error(t('guestbook.imageTypeError'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('guestbook.fileTooLarge'));
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await api.post('/upload/image', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImageUrl(res.data.url);
    } catch {
      toast.error(t('guestbook.uploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error(t('guestbook.pleaseLogin'));
      navigate('/login');
      return;
    }
    if (!content.trim()) return;
    setPosting(true);
    try {
      await guestbookAPI.create({
        content: content.trim(),
        image_url: imageUrl || null,
      });
      setContent('');
      setImageUrl('');
      toast.success(t('guestbook.posted'));
      setPage(1);
      loadMessages();
    } catch (err) {
      toast.error(getErrorDetail(err, t('guestbook.failedToPost')));
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = (msg) => {
    setConfirmDelete({
      title: t('guestbook.delete'),
      message: t('guestbook.confirmDelete'),
      onConfirm: async () => {
        try {
          await guestbookAPI.delete(msg.id);
          toast.success(t('guestbook.deleted'));
          loadMessages();
        } catch (err) {
          toast.error(getErrorDetail(err, t('common.failed')));
        }
      },
    });
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{t('guestbook.title')}</h1>
        <p className="text-gray-500 mt-1">{t('guestbook.description', { total })}</p>
      </div>

      {/* Post form */}
      <div className="card-brand mb-8">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">{t('guestbook.leaveMessage')}</h3>
        <form onSubmit={handleSubmit}>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={user ? t('guestbook.writePlaceholder') : t('guestbook.loginToPost')}
            rows={3}
            className="input-field resize-none"
            maxLength={2000}
          />
          <div className="flex items-center gap-3 mt-2">
            <button type="submit" className="btn-primary text-sm" disabled={posting || !content.trim()}>
              {posting ? t('guestbook.posting') : t('guestbook.postMessage')}
            </button>
            <label className={`cursor-pointer text-sm transition-colors ${uploading ? 'text-gray-400' : 'text-gray-400 hover:text-gray-600'}`}>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
              {uploading ? (
                <span className="inline-flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {t('guestbook.uploadingImage')}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {t('guestbook.addImage')}
                </span>
              )}
            </label>
          </div>
          {imageUrl && (
            <div className="mt-2 relative inline-block">
              <img src={imageUrl} alt="preview" className="max-w-xs max-h-32 rounded object-cover border border-gray-200" />
              <button
                type="button"
                onClick={() => setImageUrl('')}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-600 text-white rounded-full text-xs flex items-center justify-center hover:bg-gray-700"
              >
                &times;
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Messages */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-gray-300/50 rounded-full" />
                <div className="h-4 bg-gray-300/50 rounded w-24" />
              </div>
              <div className="h-4 bg-gray-300/50 rounded w-full mb-2" />
              <div className="h-4 bg-gray-300/50 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : messages.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">💬</div>
          <p className="text-gray-400 text-lg">{t('guestbook.noMessages')}</p>
          <p className="text-gray-400 text-sm mt-1">{t('guestbook.beFirst')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((msg, i) => (
            <div
              key={msg.id}
              className={`${CARD_BGS[i % 3]} rounded-xl shadow-sm border border-brand-light/20 border-l-[3px] ${CARD_ACCENTS[i % 4]} p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200`}
            >
              <div className="flex items-start gap-3">
                <Link to={`/users/${msg.user_id}`} className="shrink-0">
                  {msg.user_avatar ? (
                    <img src={msg.user_avatar} alt="" className="w-9 h-9 rounded-full object-cover ring-1 ring-white" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-brand flex items-center justify-center text-white text-sm font-medium ring-1 ring-white">
                      {msg.username?.[0]?.toUpperCase()}
                    </div>
                  )}
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Link to={`/users/${msg.user_id}`} className="text-sm font-medium text-gray-800 hover:text-brand">
                      {msg.username}
                    </Link>
                    <span className="text-xs text-gray-400">
                      {formatDateTime(msg.created_at, i18n.language)}
                    </span>
                    {(user?.id === msg.user_id || user?.is_admin) && (
                      <button
                        onClick={() => handleDelete(msg)}
                        className="ml-auto text-xs text-gray-400 hover:text-rose transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <p className="text-gray-700 text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                  {msg.image_url && (
                    <img
                      src={msg.image_url}
                      alt={t('guestbook.messageImage')}
                      className="mt-3 max-w-sm rounded-lg object-cover max-h-64 border border-gray-100"
                    />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <ConfirmModal
        isOpen={!!confirmDelete}
        title={confirmDelete?.title || ''}
        message={confirmDelete?.message || ''}
        onConfirm={() => { confirmDelete?.onConfirm(); setConfirmDelete(null); }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
