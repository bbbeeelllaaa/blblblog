import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  const category = params.get('category');

  const categories = [
    { key: null, label: t('category.all') },
    { key: 'tech', label: t('category.tech') },
    { key: 'study', label: t('category.study') },
    { key: 'life', label: t('category.life') },
  ];

  const totalPages = Math.ceil(total / 20);

  const loadArticles = async () => {
    setLoading(true);
    try {
      const res = await articleAPI.list({ page, size: 20, tag, category });
      setArticles(res.data.items);
      setTotal(res.data.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadArticles();
  }, [page, tag, category]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          {tag ? t('article.tagFilter', { tag }) : t('article.latestArticles')}
        </h1>
        <p className="text-gray-500 mt-1">
          {total} {t('article.published')}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map((c) => {
          const active = category === c.key || (c.key === null && !category);
          return (
            <Link
              key={c.key ?? 'all'}
              to={c.key ? `/?category=${c.key}` : '/'}
              className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
                active ? 'bg-brand text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {c.label}
            </Link>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="card animate-pulse !p-8">
            <div className="h-3 bg-gray-300/50 rounded-full w-16 mb-5" />
            <div className="h-4 bg-gray-300/50 rounded w-1/4 mb-4" />
            <div className="h-7 bg-gray-300/50 rounded w-3/4 mb-3" />
            <div className="h-4 bg-gray-300/50 rounded w-full mb-2" />
            <div className="h-4 bg-gray-300/50 rounded w-2/3" />
          </div>
          {[1, 2].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-4 bg-gray-300/50 rounded w-1/3 mb-3" />
              <div className="h-5 bg-gray-300/50 rounded w-2/3 mb-2" />
              <div className="h-4 bg-gray-300/50 rounded w-full" />
            </div>
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400 text-lg">{t('article.noArticles')}</p>
          <p className="text-gray-400 text-sm mt-1">{t('article.beFirst')}</p>
        </div>
      ) : (
        <div className="space-y-5">
          {articles.map((article, i) => (
            <ArticleCard key={article.id} article={article} index={i} hero={i === 0} />
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
