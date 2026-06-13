import { Link } from 'react-router-dom';
import Avatar from './Avatar';

// Left accent border colors cycling through the morandi palette
const ACCENTS = ['border-l-brand', 'border-l-warm', 'border-l-rose', 'border-l-brand-light'];
const BG_STYLES = [
  'bg-white',
  'bg-brand-light/35',
  'bg-warm/20',
];

export default function ArticleCard({ article, index = 0, hero = false }) {
  const date = new Date(article.created_at).toLocaleString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const accent = ACCENTS[index % ACCENTS.length];
  const bg = BG_STYLES[index % BG_STYLES.length];

  if (hero) {
    return (
      <article className={`${bg} rounded-xl shadow-sm border border-brand-light/20 border-l-[3px] ${accent} p-6 md:p-8 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200`}>
        {/* Top accent bar */}
        <div className={`h-1 rounded-full w-16 mb-5 ${index % 4 === 0 ? 'bg-brand' : index % 4 === 1 ? 'bg-warm' : index % 4 === 2 ? 'bg-rose' : 'bg-brand-light'}`} />

        <div className="flex items-center gap-3 mb-4">
          <Link to={`/users/${article.author_id}`} className="flex items-center gap-2 hover:opacity-80">
            <Avatar src={article.author_avatar} letter={article.author_name?.[0]?.toUpperCase()} size="w-10 h-10" ring="ring-2 ring-white" />
            <div>
              <span className="text-sm font-medium text-gray-800">{article.author_name}</span>
              <span className="text-xs text-gray-500 ml-2">{date}</span>
            </div>
          </Link>
        </div>

        <Link to={`/articles/${article.id}`}>
          <h2 className="text-2xl font-bold text-gray-900 mb-3 hover:text-brand transition-colors leading-snug">
            {article.title}
          </h2>
        </Link>

        {article.summary && (
          <p className="text-gray-700 text-sm mb-4 line-clamp-3 leading-relaxed">{article.summary}</p>
        )}

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-2 flex-wrap">
            {article.tags?.map((tag) => (
              <Link
                key={tag.id}
                to={`/?tag=${tag.name}`}
                className="text-xs bg-brand/10 text-brand px-2.5 py-1 rounded-full hover:bg-brand/20 transition-colors"
              >
                {tag.name}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-5 text-sm text-gray-500">
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {article.view_count}
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {article.like_count || 0}
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {article.comment_count || 0}
            </span>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className={`${bg} rounded-xl shadow-sm border border-brand-light/20 border-l-[3px] ${accent} p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200`}>
      <div className="flex items-center gap-3 mb-3">
        <Link to={`/users/${article.author_id}`} className="flex items-center gap-2 hover:opacity-80 shrink-0">
          <Avatar src={article.author_avatar} letter={article.author_name?.[0]?.toUpperCase()} size="w-7 h-7" ring="ring-1 ring-white" />
          <span className="text-sm text-gray-700">{article.author_name}</span>
        </Link>
        <span className="text-xs text-gray-500 ml-auto">{date}</span>
      </div>

      <Link to={`/articles/${article.id}`}>
        <h2 className="text-lg font-semibold text-gray-900 mb-1.5 hover:text-brand transition-colors leading-snug">
          {article.title}
        </h2>
      </Link>

      {article.summary && (
        <p className="text-gray-600 text-sm mb-3 line-clamp-2 leading-relaxed">{article.summary}</p>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1.5 flex-wrap">
          {article.tags?.map((tag) => (
            <Link
              key={tag.id}
              to={`/?tag=${tag.name}`}
              className="text-xs bg-brand/10 text-brand px-2 py-0.5 rounded-full hover:bg-brand/20 transition-colors"
            >
              {tag.name}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            {article.view_count}
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            {article.like_count || 0}
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {article.comment_count || 0}
          </span>
        </div>
      </div>
    </article>
  );
}
