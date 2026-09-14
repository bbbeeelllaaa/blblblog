import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ArticleEditor from '../components/ArticleEditor';
import { articleAPI, getErrorDetail } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import TagInput from '../components/TagInput';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

export default function CreateArticlePage() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');
  const [tags, setTags] = useState([]);
  const [category, setCategory] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  if (authLoading) return <div className="text-center py-16 text-gray-400">{t('common.loading')}</div>;

  if (!user) {
    navigate('/login');
    return null;
  }
  if (!user.is_admin) {
    navigate('/');
    return null;
  }

  const handleSubmit = async (e, isDraft = false) => {
    e.preventDefault();
    if (saving || uploading) return;
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    try {
      const res = await articleAPI.create({
        title: title.trim(),
        content: content.trim(),
        summary: summary.trim() || null,
        tags: tags,
        category: category,
        is_published: !isDraft,
      });
      toast.success(isDraft ? t('article.draftSaved') : t('article.articlePublished'));
      navigate(`/articles/${res.data.id}`);
    } catch (err) {
      toast.error(getErrorDetail(err, t('article.failedToSave')));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">{t('article.writeNew')}</h1>
      <div className="space-y-4">
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder={t('article.titlePlaceholder')} className="input-field text-lg font-medium" required />
        <input type="text" value={summary} onChange={(e) => setSummary(e.target.value)}
          placeholder={t('article.summaryPlaceholder')} className="input-field" />
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-field" required>
          <option value="" disabled>{t('category.selectPlaceholder')}</option>
          <option value="tech">{t('category.tech')}</option>
          <option value="study">{t('category.study')}</option>
          <option value="life">{t('category.life')}</option>
        </select>
        <TagInput value={tags} onChange={setTags} placeholder={t('article.tagsPlaceholder')} />
        <ArticleEditor value={content} onChange={setContent} onUploadingChange={setUploading} disabled={saving} />
        <div className="flex gap-3 items-center">
          <button type="button" onClick={(e) => handleSubmit(e, false)} className="btn-primary" disabled={saving || uploading}>
            {saving ? t('article.publishing') : t('article.publish')}
          </button>
          <button type="button" onClick={(e) => handleSubmit(e, true)} className="btn-secondary" disabled={saving || uploading}>
            {saving ? t('article.savingDraft') : t('article.saveDraft')}
          </button>
          <button type="button" onClick={() => navigate(-1)} className="text-gray-500 text-sm hover:underline">{t('common.cancel')}</button>
        </div>
      </div>
    </div>
  );
}
