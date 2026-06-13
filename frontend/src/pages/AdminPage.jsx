import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { adminAPI, getErrorDetail } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import ConfirmModal from '../components/ConfirmModal';
import Pagination from '../components/Pagination';
import toast from 'react-hot-toast';

export default function AdminPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Stats');
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const TABS = [
    { key: 'Stats', label: t('admin.stats') },
    { key: 'Users', label: t('admin.users') },
    { key: 'Articles', label: t('admin.articles') },
    { key: 'Comments', label: t('admin.comments') },
  ];

  if (!user?.is_admin) {
    navigate('/');
    return null;
  }

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">{t('admin.adminPanel')}</h1>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        {TABS.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.key
                ? 'border-brand text-brand'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'Stats' && <StatsTab t={t} />}
      {activeTab === 'Users' && <UsersTab t={t} confirm={confirm} setConfirm={setConfirm} />}
      {activeTab === 'Articles' && <ArticlesTab t={t} confirm={confirm} setConfirm={setConfirm} />}
      {activeTab === 'Comments' && <CommentsTab t={t} confirm={confirm} setConfirm={setConfirm} />}

      <ConfirmModal
        isOpen={!!confirm}
        title={confirm?.title || ''}
        message={confirm?.message || ''}
        onConfirm={() => { confirm?.onConfirm(); setConfirm(null); }}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}

function StatsTab({ t }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    adminAPI.getStats().then((res) => setStats(res.data)).catch(() => toast.error(t('admin.failedToLoadStats')));
  }, [t]);

  if (!stats) return <div className="text-gray-400">{t('common.loading')}</div>;

  const cards = [
    { label: t('admin.totalUsers'), value: stats.total_users, color: 'bg-brand/10 text-brand' },
    { label: t('admin.totalArticles'), value: stats.total_articles, color: 'bg-green-50 text-green-700' },
    { label: t('admin.totalComments'), value: stats.total_comments, color: 'bg-warm/10 text-warm-hover' },
    { label: t('admin.totalLikes'), value: stats.total_likes, color: 'bg-rose/10 text-rose-hover' },
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

function UsersTab({ t, confirm, setConfirm }) {
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
    } catch { toast.error(t('admin.failedToLoadUsers')); }
    finally { setLoading(false); }
  };

  const handleToggleAdmin = async (u) => {
    const confirmMsg = u.is_admin
      ? t('admin.confirmDemote', { username: u.username })
      : t('admin.confirmPromote', { username: u.username });
    setConfirm({
      title: t('admin.adminPanel'),
      message: confirmMsg,
      onConfirm: async () => {
        try {
          await adminAPI.toggleUserAdmin(u.id, !u.is_admin);
          toast.success(t('admin.updated'));
          loadUsers();
        } catch (err) { toast.error(getErrorDetail(err, t('common.failed'))); }
      },
    });
  };

  const handleDelete = (u) => {
    setConfirm({
      title: t('admin.delete'),
      message: t('admin.confirmDeleteUser', { username: u.username }),
      onConfirm: async () => {
        try {
          await adminAPI.deleteUser(u.id);
          toast.success(t('admin.userDeleted'));
          loadUsers();
        } catch (err) { toast.error(getErrorDetail(err, t('common.failed'))); }
      },
    });
  };

  const totalPages = Math.ceil(total / size);

  return (
    <div>
      {loading ? <div className="text-gray-400">{t('common.loading')}</div> : (
        <>
          <div className="space-y-2">
            {users.map((u) => (
              <div key={u.id} className="bg-white rounded-lg border p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{u.username}</span>
                    {u.is_admin && <span className="text-xs bg-brand/20 text-brand px-2 py-0.5 rounded">{t('admin.admin')}</span>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleToggleAdmin(u)}
                      className="text-xs px-3 py-1 rounded border hover:bg-gray-50">
                      {u.is_admin ? t('admin.demote') : t('admin.makeAdmin')}
                    </button>
                    <button onClick={() => handleDelete(u)}
                      className="text-xs px-3 py-1 rounded border border-rose/20 text-rose hover:bg-rose/10">
                      {t('admin.delete')}
                    </button>
                  </div>
                </div>
                <div className="text-sm text-gray-400 mb-2">{u.email}</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="bg-gray-50 rounded p-2">
                    <span className="text-gray-400">{t('admin.articlesCount')}</span>
                    <span className="float-right font-medium">{u.article_count}</span>
                  </div>
                  <div className="bg-gray-50 rounded p-2">
                    <span className="text-gray-400">{t('admin.likesReceived')}</span>
                    <span className="float-right font-medium">{u.likes_received}</span>
                  </div>
                  <div className="bg-gray-50 rounded p-2">
                    <span className="text-gray-400">{t('admin.logins')}</span>
                    <span className="float-right font-medium">{u.login_count}</span>
                  </div>
                  <div className="bg-gray-50 rounded p-2">
                    <span className="text-gray-400">{t('admin.lastLogin')}</span>
                    <span className="float-right font-medium">
                      {u.last_login ? new Date(u.last_login).toLocaleDateString() : '-'}
                    </span>
                  </div>
                </div>
                <div className="text-xs text-gray-400 mt-2">
                  {t('admin.joined', { date: new Date(u.created_at).toLocaleDateString() })}
                </div>
              </div>
            ))}
            {users.length === 0 && <div className="text-gray-400 text-center py-8">{t('admin.noUsers')}</div>}
          </div>
          {totalPages > 1 && <Pagination page={page} total={totalPages} onPage={setPage} />}
        </>
      )}
    </div>
  );
}

function ArticlesTab({ t, confirm, setConfirm }) {
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
    } catch { toast.error(t('admin.failedToLoadArticles')); }
    finally { setLoading(false); }
  };

  const handleDelete = (a) => {
    setConfirm({
      title: t('admin.delete'),
      message: t('admin.confirmDeleteArticle', { title: a.title }),
      onConfirm: async () => {
        try {
          await adminAPI.deleteArticle(a.id);
          toast.success(t('admin.articleDeleted'));
          loadArticles();
        } catch (err) { toast.error(getErrorDetail(err, t('common.failed'))); }
      },
    });
  };

  const totalPages = Math.ceil(total / size);

  return (
    <div>
      {loading ? <div className="text-gray-400">{t('common.loading')}</div> : (
        <>
          <div className="space-y-2">
            {articles.map((a) => (
              <div key={a.id} className="flex items-center gap-4 bg-white rounded-lg border p-4">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{a.title}</div>
                  <div className="text-sm text-gray-400">
                    {t('admin.byAuthor', { name: a.author_name, count: a.view_count })} &middot; {a.is_published ? t('admin.published') : t('admin.draft')}
                  </div>
                </div>
                <div className="text-xs text-gray-400">
                  {new Date(a.created_at).toLocaleDateString()}
                </div>
                <button onClick={() => handleDelete(a)}
                  className="text-xs px-3 py-1 rounded border border-rose/20 text-rose hover:bg-rose/10">
                  {t('admin.delete')}
                </button>
              </div>
            ))}
            {articles.length === 0 && <div className="text-gray-400 text-center py-8">{t('admin.noArticles')}</div>}
          </div>
          {totalPages > 1 && <Pagination page={page} total={totalPages} onPage={setPage} />}
        </>
      )}
    </div>
  );
}

function CommentsTab({ t, confirm, setConfirm }) {
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
    } catch { toast.error(t('admin.failedToLoadComments')); }
    finally { setLoading(false); }
  };

  const handleDelete = (c) => {
    setConfirm({
      title: t('admin.delete'),
      message: t('admin.confirmDeleteComment'),
      onConfirm: async () => {
        try {
          await adminAPI.deleteComment(c.id);
          toast.success(t('admin.commentDeleted'));
          loadComments();
        } catch (err) { toast.error(getErrorDetail(err, t('common.failed'))); }
      },
    });
  };

  const totalPages = Math.ceil(total / size);

  return (
    <div>
      {loading ? <div className="text-gray-400">{t('common.loading')}</div> : (
        <>
          <div className="space-y-2">
            {comments.map((c) => (
              <div key={c.id} className="bg-white rounded-lg border p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-700 line-clamp-2">{c.content}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {t('admin.onArticle', { username: c.username, title: c.article_title })} &middot; {c.is_deleted ? t('admin.deleted') : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-gray-400">{new Date(c.created_at).toLocaleDateString()}</span>
                    <button onClick={() => handleDelete(c)}
                      className="text-xs px-3 py-1 rounded border border-rose/20 text-rose hover:bg-rose/10">
                      {t('admin.delete')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {comments.length === 0 && <div className="text-gray-400 text-center py-8">{t('admin.noComments')}</div>}
          </div>
          {totalPages > 1 && <Pagination page={page} total={totalPages} onPage={setPage} />}
        </>
      )}
    </div>
  );
}

