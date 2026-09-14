import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MDXEditor, headingsPlugin, listsPlugin, quotePlugin, linkPlugin,
  linkDialogPlugin, imagePlugin, tablePlugin, thematicBreakPlugin,
  codeBlockPlugin, codeMirrorPlugin, markdownShortcutPlugin, diffSourcePlugin,
  toolbarPlugin, UndoRedo, BlockTypeSelect, BoldItalicUnderlineToggles,
  ListsToggle, CreateLink, InsertImage, InsertTable, InsertCodeBlock,
  CodeToggle, Separator, DiffSourceToggleWrapper,
} from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';
import api, { getErrorDetail } from '../services/api';
import toast from 'react-hot-toast';

const attachmentTypes = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,.csv,.json,.zip,.rar,.7z,.tar,.gz';

export default function ArticleEditor({ value, onChange, onUploadingChange, disabled }) {
  const { t } = useTranslation();
  const editorRef = useRef(null);
  const fileRef = useRef(null);
  const initialValue = useRef(value);
  const [pendingUploads, setPendingUploads] = useState(0);

  useEffect(() => {
    onUploadingChange(pendingUploads > 0);
  }, [pendingUploads, onUploadingChange]);

  const upload = useCallback(async (file, endpoint) => {
    setPendingUploads((count) => count + 1);
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post(endpoint, form, { timeout: 60000 });
      return data;
    } catch (error) {
      toast.error(getErrorDetail(error, t('article.uploadFailed')));
      throw error;
    } finally {
      setPendingUploads((count) => count - 1);
    }
  }, [t]);

  const uploadAttachment = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const data = await upload(file, '/upload/file');
      // Escape the filename so punctuation cannot change the Markdown link.
      const label = data.name.replace(/[\\`*_[\]<>]/g, '\\$&');
      editorRef.current?.focus(() => {
        editorRef.current?.insertMarkdown(`[${label}](${data.url})`);
      });
      toast.success(t('editor.fileUploaded'));
    } catch { /* upload already displays the error */ }
  };

  return (
    <section className="article-editor" aria-label={t('editor.label')}>
      <div className="article-editor-heading">
        <div>
          <h2>{t('editor.label')}</h2>
          <p>{t('editor.hint')}</p>
        </div>
        <span className="article-editor-count">{t('editor.characters', { count: value.length })}</span>
      </div>
      <input ref={fileRef} type="file" accept={attachmentTypes} onChange={uploadAttachment}
        aria-label={t('editor.attachFile')} className="hidden" />
      <MDXEditor
        ref={editorRef}
        markdown={initialValue.current}
        onChange={(markdown, initialNormalize) => { if (!initialNormalize) onChange(markdown); }}
        readOnly={disabled}
        placeholder={t('editor.placeholder')}
        contentEditableClassName="article-editor-content"
        translation={(key, defaultValue, options) => t(`editor.ui.${key}`, { ...options, defaultValue })}
        plugins={[
          headingsPlugin(), listsPlugin(), quotePlugin(), linkPlugin(), linkDialogPlugin(),
          imagePlugin({ imageUploadHandler: async (file) => (await upload(file, '/upload/image')).url }),
          tablePlugin(), thematicBreakPlugin(),
          codeBlockPlugin({ defaultCodeBlockLanguage: 'text' }),
          codeMirrorPlugin({ codeBlockLanguages: {
            text: 'Text', js: 'JavaScript', ts: 'TypeScript', jsx: 'JSX', tsx: 'TSX',
            python: 'Python', py: 'Python', html: 'HTML', css: 'CSS', json: 'JSON',
            bash: 'Bash', sql: 'SQL', '': 'Text',
          } }),
          markdownShortcutPlugin(), diffSourcePlugin({ viewMode: 'rich-text' }),
          toolbarPlugin({
            toolbarContents: () => (
              <DiffSourceToggleWrapper options={['rich-text', 'source']}>
                <UndoRedo />
                <Separator />
                <BlockTypeSelect />
                <BoldItalicUnderlineToggles options={['Bold', 'Italic']} />
                <CodeToggle />
                <Separator />
                <ListsToggle />
                <CreateLink />
                <InsertImage />
                <InsertTable />
                <InsertCodeBlock />
                <button type="button" className="article-editor-attachment"
                  disabled={disabled || pendingUploads > 0}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => fileRef.current?.click()}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 11-8.5 8.5a6 6 0 0 1-8.5-8.5l9-9a4 4 0 0 1 5.7 5.7l-9 9a2 2 0 0 1-2.8-2.8L15 6" />
                  </svg>
                  {t('editor.attachFile')}
                </button>
              </DiffSourceToggleWrapper>
            ),
          }),
        ]}
      />
      <div className="article-editor-footer" role="status">
        {pendingUploads > 0 ? t('editor.uploading') : t('editor.attachmentHint')}
      </div>
    </section>
  );
}
