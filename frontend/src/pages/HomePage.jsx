import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { articleAPI } from '../services/api';
import ArticleCard from '../components/ArticleCard';
import Pagination from '../components/Pagination';

export default function HomePage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [articles, setArticles] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const tag = searchParams.get('tag');
  const category = searchParams.get('category') || 'life';

  const categories = [
    { key: 'tech', label: t('category.tech') },
    { key: 'study', label: t('category.study') },
    { key: 'life', label: t('category.life') },
  ];

  const totalPages = Math.ceil(total / 20);

  // 切换分类/标签时回到第一页
  useEffect(() => {
    setPage(1);
  }, [tag, category]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    articleAPI
      .list({ page, size: 20, tag, category })
      .then((res) => {
        if (!active) return;
        setArticles(res.data.items);
        setTotal(res.data.total);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page, tag, category]);

  return (
    <div>
      <div className="mb-6">
        {tag ? (
          <h1 className="text-3xl font-bold text-gray-900">
            {t('article.tagFilter', { tag })}
          </h1>
        ) : (
          <div>
            <h1 className="text-3xl font-bold text-gray-900 leading-snug">
              The wheel turns, nothing is ever new.
            </h1>
            <p className="text-gray-500 mt-1 italic">
              — Sherlock Holmes
            </p>
          </div>
        )}
        <p className="text-gray-500 mt-1">
          {total} {t('article.published')}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map((c) => {
          const active = category === c.key;
          return (
            <Link
              key={c.key}
              to={`/?category=${c.key}`}
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
          <p className="text-gray-400 text-lg">
            {tag ? t('article.noArticles') : t('category.empty')}
          </p>
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
