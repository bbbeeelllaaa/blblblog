import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { userAPI, articleAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import ArticleCard from '../components/ArticleCard';
import Pagination from '../components/Pagination';
import Avatar from '../components/Avatar';
import { formatDate, formatDateTime } from '../utils/dateFormat';
import toast from 'react-hot-toast';

export default function UserProfilePage() {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [articles, setArticles] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);

  const isSelf = user && profile && user.id === profile.id;

  useEffect(() => {
    loadProfile();
    loadArticles();
  }, [id]);

  useEffect(() => {
    if (isSelf) {
      loadDrafts();
    }
  }, [isSelf, id]);

  const loadProfile = async () => {
    try {
      const res = await userAPI.getUser(id);
      setProfile(res.data);
    } catch { /* ignore */ }
  };

  const loadArticles = async () => {
    try {
      const res = await articleAPI.list({ author_id: id, page: 1, size: 50 });
      setArticles(res.data.items);
    } finally {
      setLoading(false);
    }
  };

  const loadDrafts = async () => {
    try {
      const res = await articleAPI.list({ author_id: id, status: 'draft' });
      setDrafts(res.data.items);
    } catch { /* ignore */ }
  };

  const handlePublish = async (articleId) => {
    try {
      await articleAPI.update(articleId, { is_published: true });
      toast.success(t('article.articlePublishedToast'));
      loadArticles();
      loadDrafts();
    } catch (err) {
      toast.error(t('article.failedToPublish'));
    }
  };

  if (!profile && !loading) {
    return <div className="text-center py-16 text-gray-400">{t('profile.userNotFound')}</div>;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="card-brand mb-8">
        <div className="flex items-center gap-6">
          <Avatar src={profile?.avatar} letter={profile?.username?.[0]?.toUpperCase()} size="w-24 h-24" />
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{profile?.username}</h1>
              {isSelf && (
                <Link to="/profile" className="text-xs text-brand hover:text-brand-hover border border-brand/30 rounded-full px-3 py-0.5 transition-colors">
                  {t('common.edit')}
                </Link>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {t('profile.joined', { date: formatDate(profile?.created_at, i18n.language, { year: 'numeric', month: 'long' }) })}
            </p>
          </div>
        </div>
        {profile?.bio && <p className="mt-4 text-gray-700 text-sm">{profile.bio}</p>}
        {profile?.interests && (
          <div className="mt-3">
            <span className="text-xs text-gray-400">{t('profile.interests')}</span>
            <span className="text-sm text-gray-600 whitespace-pre-wrap">{profile.interests}</span>
          </div>
        )}
        {profile?.experience && (
          <div className="mt-3">
            <span className="text-xs text-gray-400">{t('profile.experience')}</span>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{profile.experience}</p>
          </div>
        )}
      </div>

      {/* Drafts section - only visible to self */}
      {isSelf && drafts.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            {t('article.drafts')}
            <span className="text-sm font-normal text-gray-400">({drafts.length})</span>
          </h2>
          <div className="space-y-3">
            {drafts.map((draft) => (
              <div key={draft.id} className="rounded-xl shadow-sm border-dashed border-warm/30 bg-warm/15 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">{draft.title}</h3>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDateTime(draft.updated_at, i18n.language, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0 ml-4">
                    <button
                      onClick={() => navigate(`/articles/${draft.id}/edit`)}
                      className="text-xs text-brand hover:text-brand-hover font-medium"
                    >
                      {t('common.edit')}
                    </button>
                    <button
                      onClick={() => handlePublish(draft.id)}
                      className="text-xs text-green-600 hover:text-green-700 font-medium"
                    >
                      {t('article.publish')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 className="text-xl font-semibold mb-4">{t('article.articlesCount', { count: articles.length })}</h2>
      {loading ? (
        <div className="text-center py-8 text-gray-400">{t('common.loading')}</div>
      ) : articles.length === 0 ? (
        <div className="text-center py-8 text-gray-400">{t('article.noArticlesUser')}</div>
      ) : (
        <div className="space-y-4">
          {articles.map((a, i) => <ArticleCard key={a.id} article={a} index={i} />)}
        </div>
      )}
    </div>
  );
}
