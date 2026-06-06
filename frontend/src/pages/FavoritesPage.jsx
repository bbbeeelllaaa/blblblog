import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { favoriteAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import ArticleCard from '../components/ArticleCard';

export default function FavoritesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  if (!user) {
    navigate('/login');
    return null;
  }

  useEffect(() => {
    loadFavorites();
  }, [page]);

  const loadFavorites = async () => {
    setLoading(true);
    try {
      const res = await favoriteAPI.list({ page, size: 20 });
      setFavorites(res.data.items);
      setTotal(res.data.total);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">My Favorites ({total})</h1>

      {loading ? (
        <div className="text-center py-8 text-gray-400">Loading...</div>
      ) : favorites.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">No favorites yet</p>
          <p className="text-sm mt-1">Browse articles and click the favorite button to save them here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {favorites.map((fav) => (
            <ArticleCard
              key={fav.id}
              article={{
                id: fav.article_id,
                title: fav.article_title,
                summary: fav.article_summary,
                author_id: fav.author_id,
                author_name: fav.author_name,
                author_avatar: fav.author_avatar,
                tags: fav.tags,
                view_count: fav.view_count,
                like_count: fav.like_count,
                comment_count: fav.comment_count,
                created_at: fav.created_at,
              }}
            />
          ))}
        </div>
      )}

      {total > 20 && (
        <div className="flex justify-center gap-3 mt-8">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary">
            Previous
          </button>
          <span className="text-gray-500 self-center">Page {page} / {Math.ceil(total / 20)}</span>
          <button onClick={() => setPage((p) => p + 1)} disabled={page >= Math.ceil(total / 20)} className="btn-secondary">
            Next
          </button>
        </div>
      )}
    </div>
  );
}
