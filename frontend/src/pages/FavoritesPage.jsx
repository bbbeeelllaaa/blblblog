import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { favoriteAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import ArticleCard from '../components/ArticleCard';
import Pagination from '../components/Pagination';

export default function FavoritesPage() {
  const { t } = useTranslation();
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
      <h1 className="text-2xl font-bold mb-6">{t('favorites.myFavorites', { total })}</h1>

      {loading ? (
        <div className="text-center py-8 text-gray-400">{t('favorites.loading')}</div>
      ) : favorites.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">{t('favorites.noFavorites')}</p>
          <p className="text-sm mt-1">{t('favorites.noFavoritesHint')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {favorites.map((fav, i) => (
            <ArticleCard
              key={fav.id}
              index={i}
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

      <Pagination
        page={page}
        totalPages={Math.ceil(total / 20)}
        onPageChange={setPage}
      />
    </div>
  );
}
