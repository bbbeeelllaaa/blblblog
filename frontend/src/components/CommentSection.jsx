import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { commentAPI, likeAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

export default function CommentSection({ articleId, refreshTrigger }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [comments, setComments] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [content, setContent] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadComments = async () => {
    setLoading(true);
    try {
      const res = await commentAPI.list(articleId, { page, size: 20 });
      setComments(res.data.items);
      setTotal(res.data.total);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComments();
  }, [articleId, page, refreshTrigger]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please login first');
      navigate('/login');
      return;
    }
    if (!content.trim()) return;
    try {
      await commentAPI.create(articleId, {
        content: content.trim(),
        parent_id: replyTo?.id || null,
      });
      setContent('');
      setReplyTo(null);
      toast.success('Comment posted');
      loadComments();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to post comment');
    }
  };

  const handleLike = async (commentId) => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      await likeAPI.toggleComment(commentId);
      loadComments();
    } catch {
      toast.error('Failed');
    }
  };

  const renderComment = (comment, isReply = false) => (
    <div key={comment.id} className={`${isReply ? 'ml-8 mt-2' : 'border-b border-gray-100 py-4'}`}>
      <div className="flex items-start gap-3">
        {comment.user_avatar ? (
          <img src={comment.user_avatar} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-white text-xs font-medium shrink-0">
            {comment.username?.[0]?.toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-gray-900">{comment.username}</span>
            <span className="text-xs text-gray-400">
              {new Date(comment.created_at).toLocaleDateString('zh-CN')}
            </span>
          </div>
          <p className="text-gray-700 text-sm whitespace-pre-wrap break-words">{comment.content}</p>
          <div className="flex items-center gap-4 mt-2">
            <button
              onClick={() => handleLike(comment.id)}
              className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill={comment.is_liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {comment.like_count || 0}
            </button>
            {!isReply && (
              <button
                onClick={() => setReplyTo(replyTo?.id === comment.id ? null : comment)}
                className="text-xs text-gray-400 hover:text-blue-500"
              >
                Reply
              </button>
            )}
          </div>
          {replyTo?.id === comment.id && (
            <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
              <input
                type="text"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={`Reply to ${comment.username}...`}
                className="input-field text-sm flex-1"
                autoFocus
              />
              <button type="submit" className="btn-primary text-xs px-3">Reply</button>
              <button type="button" onClick={() => { setReplyTo(null); setContent(''); }} className="btn-secondary text-xs px-3">
                Cancel
              </button>
            </form>
          )}
        </div>
      </div>
      {comment.replies?.map((reply) => renderComment(reply, true))}
    </div>
  );

  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold mb-4">Comments ({total})</h3>

      {/* New comment form */}
      {!replyTo && (
        <form onSubmit={handleSubmit} className="mb-6">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={user ? "Write a comment..." : "Login to comment"}
            rows={3}
            className="input-field resize-none"
          />
          <button type="submit" className="btn-primary mt-2 text-sm" disabled={!content.trim()}>
            Post Comment
          </button>
        </form>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-400">Loading comments...</div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 text-gray-400">No comments yet. Be the first!</div>
      ) : (
        <div>{comments.map((c) => renderComment(c))}</div>
      )}

      {total > 20 && (
        <div className="flex justify-center gap-2 mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary text-sm"
          >
            Prev
          </button>
          <span className="text-sm text-gray-500 self-center">
            Page {page} / {Math.ceil(total / 20)}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= Math.ceil(total / 20)}
            className="btn-secondary text-sm"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
