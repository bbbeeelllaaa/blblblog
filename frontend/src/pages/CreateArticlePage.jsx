import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MDEditor from '@uiw/react-md-editor';
import { articleAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

export default function CreateArticlePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');
  const [tags, setTags] = useState('');
  const [saving, setSaving] = useState(false);

  if (!user) {
    navigate('/login');
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    try {
      const res = await articleAPI.create({
        title: title.trim(),
        content: content.trim(),
        summary: summary.trim() || null,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      });
      toast.success('Article published!');
      navigate(`/articles/${res.data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to publish');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Write a New Article</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Article title"
          className="input-field text-lg font-medium"
          required
        />
        <input
          type="text"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Short summary (optional)"
          className="input-field"
        />
        <input
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="Tags, comma separated (e.g. python, web, tutorial)"
          className="input-field"
        />
        <div data-color-mode="light">
          <MDEditor
            value={content}
            onChange={setContent}
            height={500}
            preview="live"
          />
        </div>
        <div className="flex gap-3">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Publishing...' : 'Publish'}
          </button>
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
