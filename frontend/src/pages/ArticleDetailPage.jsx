import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import MDEditor from '@uiw/react-md-editor';
import { articleAPI, likeAPI, favoriteAPI, statsAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import CommentSection from '../components/CommentSection';
import toast from 'react-hot-toast';

export default function ArticleDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [onlineStats, setOnlineStats] = useState(null);
  const [commentRefresh, setCommentRefresh] = useState(0);

  useEffect(() => {
    loadArticle();
    recordView();
    loadOnlineStats();
  }, [id]);

  const loadArticle = async () => {
    setLoading(true);
    try {
      const res = await articleAPI.get(id);
      setArticle(res.data);
    } finally {
      setLoading(false);
    }
  };

  const recordView = async () => {
    try {
      const res = await statsAPI.recordView(id, user?.id?.toString() || 'anonymous');
      setOnlineStats(res.data);
    } catch { /* ignore */ }
  };

  const loadOnlineStats = async () => {
    try {
      const res = await statsAPI.online();
      setOnlineStats((prev) => ({ ...prev, ...res.data }));
    } catch { /* ignore */ }
  };

  const handleLike = async () => {
    if (!user) { navigate('/login'); return; }
    try {
      const res = await likeAPI.toggleArticle(id);
      setArticle((prev) => ({ ...prev, is_liked: res.data.liked, like_count: res.data.like_count }));
    } catch { toast.error('Failed'); }
  };

  const handleFavorite = async () => {
    if (!user) { navigate('/login'); return; }
    try {
      const res = await favoriteAPI.toggle(id);
      setArticle((prev) => ({ ...prev, is_favorited: res.data.favorited }));
      toast.success(res.data.favorited ? 'Added to favorites' : 'Removed from favorites');
    } catch { toast.error('Failed'); }
  };

  const handleAISummary = async () => {
    setSummaryLoading(true);
    try {
      const res = await articleAPI.getSummary(id);
      setSummary(res.data);
    } catch { toast.error('Failed to generate summary'); }
    finally { setSummaryLoading(false); }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-2/3 mb-4" />
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-8" />
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-3/4" />
        </div>
      </div>
    );
  }

  if (!article) {
    return <div className="text-center py-16 text-gray-400">Article not found</div>;
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Online stats badge */}
      {onlineStats && (
        <div className="flex items-center gap-3 text-xs text-gray-400 mb-4">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            {onlineStats.online_users || 0} online
          </span>
          {onlineStats.article_uv !== undefined && (
            <span>{onlineStats.article_uv} unique readers</span>
          )}
        </div>
      )}

      {/* Title */}
      <h1 className="text-3xl font-bold text-gray-900 mb-4">{article.title}</h1>

      {/* Author & Meta */}
      <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
        <Link to={`/users/${article.author_id}`} className="flex items-center gap-2">
          {article.author_avatar ? (
            <img src={article.author_avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
              {article.author_name?.[0]?.toUpperCase()}
            </div>
          )}
          <div>
            <div className="text-sm font-medium text-gray-900">{article.author_name}</div>
            <div className="text-xs text-gray-400">
              {new Date(article.created_at).toLocaleString('zh-CN', {
                year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
              })}
            </div>
          </div>
        </Link>
        <div className="flex-1" />
        <div className="flex items-center gap-1 text-sm text-gray-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          {article.view_count} views
        </div>
      </div>

      {/* Tags */}
      {article.tags?.length > 0 && (
        <div className="flex gap-2 mb-6">
          {article.tags.map((tag) => (
            <Link key={tag.id} to={`/?tag=${tag.name}`}
              className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full hover:bg-blue-100">
              {tag.name}
            </Link>
          ))}
        </div>
      )}

      {/* AI Summary */}
      <div className="mb-6">
        {!summary ? (
          <button onClick={handleAISummary} disabled={summaryLoading}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
            {summaryLoading ? (
              'Generating summary...'
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                AI Summary
              </>
            )}
          </button>
        ) : (
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-blue-600 font-medium">
                AI Summary ({summary.method === 'ai' ? 'GPT' : 'Extractive'})
              </span>
              <button onClick={() => setSummary(null)} className="text-xs text-gray-400 hover:text-gray-600">Dismiss</button>
            </div>
            <p className="text-sm text-gray-700">{summary.summary}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={handleLike}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
            article.is_liked ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
          }`}>
          <svg className="w-5 h-5" fill={article.is_liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          {article.like_count || 0}
        </button>
        <button onClick={handleFavorite}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
            article.is_favorited ? 'bg-yellow-50 text-yellow-500' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
          }`}>
          <svg className="w-5 h-5" fill={article.is_favorited ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          {article.is_favorited ? 'Favorited' : 'Favorite'}
        </button>
        {user?.id === article.author_id && (
          <Link to={`/articles/${id}/edit`}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-gray-50 text-gray-500 hover:bg-gray-100">
            Edit
          </Link>
        )}
      </div>

      {/* Content */}
      <div className="mb-8" data-color-mode="light">
        <MDEditor.Markdown source={article.content} />
      </div>

      {/* Comments */}
      <CommentSection articleId={id} refreshTrigger={commentRefresh} />
    </div>
  );
}
