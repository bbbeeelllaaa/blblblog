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
      <div className="journal-heading">
        <div>
          <p className="eyebrow">{t('journal.collection')}</p>
          <h2>{tag ? t('article.tagFilter', { tag }) : t('journal.latest')}</h2>
        </div>
        <span className="journal-total">{total} {t('article.published')}</span>
      </div>
      <nav className="category-tabs" aria-label={t('category.label')}>
        {categories.map((c) => (
          <Link key={c.key} to={`/?category=${c.key}`} aria-current={category === c.key ? 'page' : undefined}
            className={category === c.key ? 'category-tab active' : 'category-tab'}>
            {c.label}
          </Link>
        ))}
      </nav>

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
        <div className="journal-empty text-center py-16">
          <span className="empty-flower" aria-hidden="true">❀</span>
          <p className="text-gray-500 text-sm">
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
