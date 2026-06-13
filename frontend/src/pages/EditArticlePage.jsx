import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MDEditor from '@uiw/react-md-editor';
import api, { articleAPI, getErrorDetail } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import TagInput from '../components/TagInput';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

export default function EditArticlePage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');
  const [tags, setTags] = useState([]);
  const [saving, setSaving] = useState(false);
  const [isDraft, setIsDraft] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef(null);
  const contentRef = useRef(content);
  contentRef.current = content;

  const uploadFile = useCallback(async (file) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await api.post('/upload/image', form);
      const md = `![](${res.data.url})`;
      const ta = document.querySelector('.w-md-editor-text-input');
      const cursorPos = ta ? ta.selectionStart : contentRef.current.length;
      setContent((prev) => {
        const start = Math.min(cursorPos, prev.length);
        return prev.substring(0, start) + md + prev.substring(start);
      });
      setTimeout(() => {
        const ta = document.querySelector('.w-md-editor-text-input');
        if (ta) {
          const newPos = cursorPos + md.length;
          ta.selectionStart = ta.selectionEnd = newPos;
          ta.focus();
        }
      }, 50);
      toast.success(t('article.imageUploaded'));
    } catch (err) {
      const msg = getErrorDetail(err, t('article.uploadFailed'));
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  }, []);

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadFile(file);
    e.target.value = '';
  };

  const imageCommand = {
    name: 'upload-image',
    keyCommand: 'uploadImage',
    buttonProps: { 'aria-label': t('article.uploadFromLocal') },
    icon: (
      <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    execute: () => fileRef.current?.click(),
  };

  useEffect(() => {
    const editor = document.querySelector('.w-md-editor');
    const ta = document.querySelector('.w-md-editor-text-input');
    if (!editor || !ta) return;

    const onPaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          uploadFile(item.getAsFile());
          break;
        }
      }
    };

    const onDragOver = (e) => e.preventDefault();

    const onDrop = (e) => {
      const file = e.dataTransfer?.files?.[0];
      if (!file || !file.type.startsWith('image/')) return;
      e.preventDefault();
      uploadFile(file);
    };

    ta.addEventListener('paste', onPaste);
    editor.addEventListener('dragover', onDragOver);
    editor.addEventListener('drop', onDrop);

    return () => {
      ta.removeEventListener('paste', onPaste);
      editor.removeEventListener('dragover', onDragOver);
      editor.removeEventListener('drop', onDrop);
    };
  }, [uploadFile]);

  useEffect(() => {
    loadArticle();
  }, [id]);

  const loadArticle = async () => {
    try {
      const res = await articleAPI.get(id);
      const a = res.data;
      if (user && a.author_id !== user.id) {
        toast.error(t('article.notAuthorized'));
        navigate('/');
        return;
      }
      setTitle(a.title);
      setContent(a.content);
      setSummary(a.summary || '');
      setTags(a.tags?.map((t) => t.name) || []);
      setIsDraft(!a.is_published);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e, publishStatus = null) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = {
        title: title.trim(),
        content: content.trim(),
        summary: summary.trim() || null,
        tags: tags,
      };
      if (publishStatus !== null) {
        data.is_published = publishStatus;
      }
      await articleAPI.update(id, data);
      toast.success(t('article.saved'));
      navigate(`/articles/${id}`);
    } catch (err) {
      toast.error(getErrorDetail(err, t('article.failedToSave')));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-16 text-gray-400">{t('common.loading')}</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">{t('article.editArticle')}</h1>
      <form onSubmit={(e) => handleSubmit(e)} className="space-y-4">
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder={t('article.titlePlaceholder')} className="input-field text-lg font-medium" required />
        <input type="text" value={summary} onChange={(e) => setSummary(e.target.value)}
          placeholder={t('article.summaryPlaceholder')} className="input-field" />
        <TagInput value={tags} onChange={setTags} placeholder={t('article.tagsPlaceholder')} />
        <input type="file" ref={fileRef} accept="image/*" onChange={handleImageUpload} className="hidden" />
        <div data-color-mode="light">
          <MDEditor
            value={content}
            onChange={setContent}
            height={500}
            preview="live"
            extraCommands={[imageCommand]}
          />
        </div>
        <div className="flex gap-3 items-center flex-wrap">
          {uploading && <span className="text-xs text-gray-400">{t('article.uploadingImage')}</span>}
          {isDraft ? (
            <>
              <button type="button" onClick={(e) => handleSubmit(e, true)} className="btn-primary" disabled={saving}>
                {saving ? t('article.savingDraft') : t('article.publish')}
              </button>
              <button type="button" onClick={(e) => handleSubmit(e, false)} className="btn-secondary" disabled={saving}>
                {saving ? t('article.savingDraft') : t('article.saveDraft')}
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={(e) => handleSubmit(e)} className="btn-primary" disabled={saving}>
                {saving ? t('article.savingChanges') : t('article.saveChanges')}
              </button>
              <button type="button" onClick={(e) => handleSubmit(e, false)} className="btn-secondary" disabled={saving}>
                {saving ? t('article.unpublishing') : t('article.unpublish')}
              </button>
            </>
          )}
          <button type="button" onClick={() => navigate(`/articles/${id}`)} className="text-gray-500 text-sm hover:underline">{t('common.cancel')}</button>
        </div>
      </form>
    </div>
  );
}
