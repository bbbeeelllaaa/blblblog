import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MDEditor from '@uiw/react-md-editor';
import { articleAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

export default function EditArticlePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');
  const [tags, setTags] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadArticle();
  }, [id]);

  const loadArticle = async () => {
    try {
      const res = await articleAPI.get(id);
      const a = res.data;
      if (user && a.author_id !== user.id) {
        toast.error('Not authorized');
        navigate('/');
        return;
      }
      setTitle(a.title);
      setContent(a.content);
      setSummary(a.summary || '');
      setTags(a.tags?.map((t) => t.name).join(', ') || '');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await articleAPI.update(id, {
        title: title.trim(),
        content: content.trim(),
        summary: summary.trim() || null,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      });
      toast.success('Article updated!');
      navigate(`/articles/${id}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-16 text-gray-400">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Edit Article</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="Article title" className="input-field text-lg font-medium" required />
        <input type="text" value={summary} onChange={(e) => setSummary(e.target.value)}
          placeholder="Short summary (optional)" className="input-field" />
        <input type="text" value={tags} onChange={(e) => setTags(e.target.value)}
          placeholder="Tags, comma separated" className="input-field" />
        <div data-color-mode="light">
          <MDEditor value={content} onChange={setContent} height={500} preview="live" />
        </div>
        <div className="flex gap-3">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button type="button" onClick={() => navigate(`/articles/${id}`)} className="btn-secondary">Cancel</button>
        </div>
      </form>
    </div>
  );
}
