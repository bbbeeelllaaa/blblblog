import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { articleAPI } from '../services/api';
import ArticleCard from '../components/ArticleCard';
import Pagination from '../components/Pagination';

export default function HomePage() {
  const { t } = useTranslation();
  const [articles, setArticles] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const params = new URLSearchParams(window.location.search);
  const tag = params.get('tag');

  const totalPages = Math.ceil(total / 20);

  const loadArticles = async () => {
    setLoading(true);
    try {
      const res = await articleAPI.list({ page, size: 20, tag });
      setArticles(res.data.items);
      setTotal(res.data.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadArticles();
  }, [page, tag]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {tag ? t('article.tagFilter', { tag }) : t('article.latestArticles')}
        </h1>
        <p className="text-gray-500 mt-1">
          {total} {t('article.published')}
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
              <div className="h-6 bg-gray-200 rounded w-2/3 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-full" />
            </div>
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400 text-lg">{t('article.noArticles')}</p>
          <p className="text-gray-400 text-sm mt-1">{t('article.beFirst')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
