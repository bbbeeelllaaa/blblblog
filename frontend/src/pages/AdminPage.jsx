import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI, getErrorDetail } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

const TABS = ['Stats', 'Users', 'Articles', 'Comments'];

export default function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Stats');
  const [loading, setLoading] = useState(false);

  if (!user?.is_admin) {
    navigate('/');
    return null;
  }

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Admin Panel</h1>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        {TABS.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'Stats' && <StatsTab />}
      {activeTab === 'Users' && <UsersTab />}
      {activeTab === 'Articles' && <ArticlesTab />}
      {activeTab === 'Comments' && <CommentsTab />}
    </div>
  );
}

function StatsTab() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    adminAPI.getStats().then((res) => setStats(res.data)).catch(() => toast.error('Failed to load stats'));
  }, []);

  if (!stats) return <div className="text-gray-400">Loading...</div>;

  const cards = [
    { label: 'Total Users', value: stats.total_users, color: 'bg-blue-50 text-blue-700' },
    { label: 'Total Articles', value: stats.total_articles, color: 'bg-green-50 text-green-700' },
    { label: 'Total Comments', value: stats.total_comments, color: 'bg-yellow-50 text-yellow-700' },
    { label: 'Total Likes', value: stats.total_likes, color: 'bg-red-50 text-red-700' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((c) => (
        <div key={c.label} className={`rounded-lg p-6 ${c.color}`}>
          <div className="text-3xl font-bold">{c.value}</div>
          <div className="text-sm mt-1 opacity-75">{c.label}</div>
        </div>
      ))}
    </div>
  );
}

function UsersTab() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const size = 20;

  useEffect(() => { loadUsers(); }, [page]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.listUsers({ page, size });
      setUsers(res.data.items);
      setTotal(res.data.total);
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  };

  const handleToggleAdmin = async (u) => {
    if (!window.confirm(`${u.is_admin ? 'Remove' : 'Grant'} admin for ${u.username}?`)) return;
    try {
      await adminAPI.toggleUserAdmin(u.id, !u.is_admin);
      toast.success('Updated');
      loadUsers();
    } catch (err) { toast.error(getErrorDetail(err, 'Failed')); }
  };

  const handleDelete = async (u) => {
    if (!window.confirm(`Delete user "${u.username}"? This cannot be undone!`)) return;
    try {
      await adminAPI.deleteUser(u.id);
      toast.success('User deleted');
      loadUsers();
    } catch (err) { toast.error(getErrorDetail(err, 'Failed')); }
  };

  const totalPages = Math.ceil(total / size);

  return (
    <div>
      {loading ? <div className="text-gray-400">Loading...</div> : (
        <>
          <div className="space-y-2">
            {users.map((u) => (
              <div key={u.id} className="bg-white rounded-lg border p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{u.username}</span>
                    {u.is_admin && <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded">Admin</span>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleToggleAdmin(u)}
                      className="text-xs px-3 py-1 rounded border hover:bg-gray-50">
                      {u.is_admin ? 'Demote' : 'Make Admin'}
                    </button>
                    <button onClick={() => handleDelete(u)}
                      className="text-xs px-3 py-1 rounded border border-red-200 text-red-500 hover:bg-red-50">
                      Delete
                    </button>
                  </div>
                </div>
                <div className="text-sm text-gray-400 mb-2">{u.email}</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="bg-gray-50 rounded p-2">
                    <span className="text-gray-400">Articles</span>
                    <span className="float-right font-medium">{u.article_count}</span>
                  </div>
                  <div className="bg-gray-50 rounded p-2">
                    <span className="text-gray-400">Likes received</span>
                    <span className="float-right font-medium">{u.likes_received}</span>
                  </div>
                  <div className="bg-gray-50 rounded p-2">
                    <span className="text-gray-400">Logins</span>
                    <span className="float-right font-medium">{u.login_count}</span>
                  </div>
                  <div className="bg-gray-50 rounded p-2">
                    <span className="text-gray-400">Last login</span>
                    <span className="float-right font-medium">
                      {u.last_login ? new Date(u.last_login).toLocaleDateString() : '-'}
                    </span>
                  </div>
                </div>
                <div className="text-xs text-gray-400 mt-2">
                  Joined {new Date(u.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
            {users.length === 0 && <div className="text-gray-400 text-center py-8">No users</div>}
          </div>
          {totalPages > 1 && <Pagination page={page} total={totalPages} onPage={setPage} />}
        </>
      )}
    </div>
  );
}

function ArticlesTab() {
  const [articles, setArticles] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const size = 20;

  useEffect(() => { loadArticles(); }, [page]);

  const loadArticles = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.listArticles({ page, size });
      setArticles(res.data.items);
      setTotal(res.data.total);
    } catch { toast.error('Failed to load articles'); }
    finally { setLoading(false); }
  };

  const handleDelete = async (a) => {
    if (!window.confirm(`Delete "${a.title}"?`)) return;
    try {
      await adminAPI.deleteArticle(a.id);
      toast.success('Article deleted');
      loadArticles();
    } catch (err) { toast.error(getErrorDetail(err, 'Failed')); }
  };

  const totalPages = Math.ceil(total / size);

  return (
    <div>
      {loading ? <div className="text-gray-400">Loading...</div> : (
        <>
          <div className="space-y-2">
            {articles.map((a) => (
              <div key={a.id} className="flex items-center gap-4 bg-white rounded-lg border p-4">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{a.title}</div>
                  <div className="text-sm text-gray-400">
                    by {a.author_name} &middot; {a.view_count} views &middot; {a.is_published ? 'Published' : 'Draft'}
                  </div>
                </div>
                <div className="text-xs text-gray-400">
                  {new Date(a.created_at).toLocaleDateString()}
                </div>
                <button onClick={() => handleDelete(a)}
                  className="text-xs px-3 py-1 rounded border border-red-200 text-red-500 hover:bg-red-50">
                  Delete
                </button>
              </div>
            ))}
            {articles.length === 0 && <div className="text-gray-400 text-center py-8">No articles</div>}
          </div>
          {totalPages > 1 && <Pagination page={page} total={totalPages} onPage={setPage} />}
        </>
      )}
    </div>
  );
}

function CommentsTab() {
  const [comments, setComments] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const size = 20;

  useEffect(() => { loadComments(); }, [page]);

  const loadComments = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.listComments({ page, size });
      setComments(res.data.items);
      setTotal(res.data.total);
    } catch { toast.error('Failed to load comments'); }
    finally { setLoading(false); }
  };

  const handleDelete = async (c) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await adminAPI.deleteComment(c.id);
      toast.success('Comment deleted');
      loadComments();
    } catch (err) { toast.error(getErrorDetail(err, 'Failed')); }
  };

  const totalPages = Math.ceil(total / size);

  return (
    <div>
      {loading ? <div className="text-gray-400">Loading...</div> : (
        <>
          <div className="space-y-2">
            {comments.map((c) => (
              <div key={c.id} className="bg-white rounded-lg border p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-700 line-clamp-2">{c.content}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      by {c.username} on "{c.article_title}" &middot; {c.is_deleted ? '(deleted)' : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-gray-400">{new Date(c.created_at).toLocaleDateString()}</span>
                    <button onClick={() => handleDelete(c)}
                      className="text-xs px-3 py-1 rounded border border-red-200 text-red-500 hover:bg-red-50">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {comments.length === 0 && <div className="text-gray-400 text-center py-8">No comments</div>}
          </div>
          {totalPages > 1 && <Pagination page={page} total={totalPages} onPage={setPage} />}
        </>
      )}
    </div>
  );
}

function Pagination({ page, total, onPage }) {
  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button disabled={page <= 1} onClick={() => onPage(page - 1)}
        className="px-3 py-1 rounded border text-sm disabled:opacity-30 hover:bg-gray-50">
        Prev
      </button>
      <span className="text-sm text-gray-500">Page {page} / {total}</span>
      <button disabled={page >= total} onClick={() => onPage(page + 1)}
        className="px-3 py-1 rounded border text-sm disabled:opacity-30 hover:bg-gray-50">
        Next
      </button>
    </div>
  );
}
