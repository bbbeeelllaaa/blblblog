import { Link } from 'react-router-dom';

export default function ArticleCard({ article }) {
  const date = new Date(article.created_at).toLocaleString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <article className="card hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-3">
        <Link to={`/users/${article.author_id}`} className="flex items-center gap-2 hover:opacity-80">
          {article.author_avatar ? (
            <img src={article.author_avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium">
              {article.author_name?.[0]?.toUpperCase()}
            </div>
          )}
          <span className="text-sm text-gray-600">{article.author_name}</span>
        </Link>
        <span className="text-xs text-gray-400">{date}</span>
      </div>

      <Link to={`/articles/${article.id}`}>
        <h2 className="text-xl font-semibold text-gray-900 mb-2 hover:text-blue-600 transition-colors">
          {article.title}
        </h2>
      </Link>

      {article.summary && (
        <p className="text-gray-600 text-sm mb-3 line-clamp-3">{article.summary}</p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          {article.tags?.map((tag) => (
            <Link
              key={tag.id}
              to={`/?tag=${tag.name}`}
              className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full hover:bg-blue-100"
            >
              {tag.name}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            {article.view_count}
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            {article.like_count || 0}
          </span>
          <span className="flex items-center gap-1">
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
