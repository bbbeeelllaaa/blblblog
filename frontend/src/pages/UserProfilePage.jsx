import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { userAPI, articleAPI } from '../services/api';
import ArticleCard from '../components/ArticleCard';

export default function UserProfilePage() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
    loadArticles();
  }, [id]);

  const loadProfile = async () => {
    try {
      const res = await userAPI.getUser(id);
      setProfile(res.data);
    } catch { /* ignore */ }
  };

  const loadArticles = async () => {
    setLoading(true);
    try {
      const res = await articleAPI.list({ author_id: id, page: 1, size: 50 });
      setArticles(res.data.items);
    } finally {
      setLoading(false);
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
            <span className="text-sm text-gray-600">{profile.interests}</span>
          </div>
        )}
        {profile?.experience && (
          <div className="mt-3">
            <span className="text-xs text-gray-400">Experience: </span>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{profile.experience}</p>
          </div>
        )}
      </div>

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
