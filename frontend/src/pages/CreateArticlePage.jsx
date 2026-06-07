import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import MDEditor from '@uiw/react-md-editor';
import api, { articleAPI } from '../services/api';
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
  const [uploading, setUploading] = useState(false);
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
      toast.success('Image uploaded');
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Upload failed';
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
    buttonProps: { 'aria-label': 'Upload image from local' },
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
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="Article title" className="input-field text-lg font-medium" required />
        <input type="text" value={summary} onChange={(e) => setSummary(e.target.value)}
          placeholder="Short summary (optional)" className="input-field" />
        <input type="text" value={tags} onChange={(e) => setTags(e.target.value)}
          placeholder="Tags, comma separated" className="input-field" />
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
        <div className="flex gap-3 items-center">
          {uploading && <span className="text-xs text-gray-400">Uploading image...</span>}
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Publishing...' : 'Publish'}
          </button>
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
        </div>
      </form>
    </div>
  );
}
