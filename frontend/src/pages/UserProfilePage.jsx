import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { userAPI, articleAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import ArticleCard from '../components/ArticleCard';
import toast from 'react-hot-toast';

export default function UserProfilePage() {
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
      toast.success('Article published!');
      loadArticles();
      loadDrafts();
    } catch (err) {
      toast.error('Failed to publish');
    }
  };

  if (!profile && !loading) {
    return <div className="text-center py-16 text-gray-400">User not found</div>;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="card mb-8">
        <div className="flex items-center gap-6">
          {profile?.avatar ? (
            <img src={profile.avatar} alt="" className="w-24 h-24 rounded-full object-cover" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-blue-500 flex items-center justify-center text-white text-3xl font-medium">
              {profile?.username?.[0]?.toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold">{profile?.username}</h1>
            <p className="text-sm text-gray-500 mt-1">
              Joined {new Date(profile?.created_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })}
            </p>
          </div>
        </div>
        {profile?.bio && <p className="mt-4 text-gray-700 text-sm">{profile.bio}</p>}
        {profile?.interests && (
          <div className="mt-3">
            <span className="text-xs text-gray-400">Interests: </span>
            <span className="text-sm text-gray-600 whitespace-pre-wrap">{profile.interests}</span>
          </div>
        )}
        {profile?.experience && (
          <div className="mt-3">
            <span className="text-xs text-gray-400">Experience: </span>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{profile.experience}</p>
          </div>
        )}
      </div>

      {/* Drafts section - only visible to self */}
      {isSelf && drafts.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            Drafts
            <span className="text-sm font-normal text-gray-400">({drafts.length})</span>
          </h2>
          <div className="space-y-3">
            {drafts.map((draft) => (
              <div key={draft.id} className="card border-dashed border-amber-200 bg-amber-50/50">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">{draft.title}</h3>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(draft.updated_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0 ml-4">
                    <button
                      onClick={() => navigate(`/articles/${draft.id}/edit`)}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handlePublish(draft.id)}
                      className="text-xs text-green-600 hover:text-green-700 font-medium"
                    >
                      Publish
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 className="text-xl font-semibold mb-4">Articles ({articles.length})</h2>
      {loading ? (
        <div className="text-center py-8 text-gray-400">Loading...</div>
      ) : articles.length === 0 ? (
        <div className="text-center py-8 text-gray-400">No articles yet</div>
      ) : (
        <div className="space-y-4">
          {articles.map((a) => <ArticleCard key={a.id} article={a} />)}
        </div>
      )}
    </div>
  );
}
