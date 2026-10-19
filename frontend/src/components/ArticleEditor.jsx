import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import DragHandle from '@tiptap/extension-drag-handle';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { createEditorExtensions, safeUrl } from './editorExtensions';
import { articleSource, containsPendingMedia, parseArticleSource } from '../utils/articleDocument';
import useEditorUploads from '../hooks/useEditorUploads';
import EditorUploads from './EditorUploads';
import './article-editor.css';

const acceptedFiles = 'image/jpeg,image/png,image/gif,image/webp,image/bmp,video/mp4,video/webm,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,.csv,.json,.zip,.rar,.7z,.tar,.gz';
const cardNames = { note: ['笔记', 'Note'], tip: ['提示', 'Tip'], warning: ['注意', 'Warning'], link: ['链接', 'Link'], image: ['图文', 'Image'] };
function colorHex(value, fallback = '#493e48') {
  if (/^#[\da-f]{6}$/i.test(value || '')) return value;
  if (/^#[\da-f]{3}$/i.test(value || '')) return '#' + [...value.slice(1)].map(char => char + char).join('');
  const rgb = String(value || '').match(/^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
  return rgb ? '#' + rgb.slice(1, 4).map(channel => Math.min(255, Number(channel)).toString(16).padStart(2, '0')).join('') : fallback;
}

export default function ArticleEditor({ value, document: savedDocument, onChange, onUploadingChange, disabled }) {
  const { i18n } = useTranslation();
  const zh = i18n.language.startsWith('zh');
  const label = (cn, en) => zh ? cn : en;
  const callbacks = useRef({ onChange, onUploadingChange });
  callbacks.current = { onChange, onUploadingChange };
  const editorRef = useRef(null);
  const enqueueRef = useRef(null);
  const fileRef = useRef(null);
  const importRef = useRef(null);
  const [mode, setMode] = useState('visual');
  const [source, setSource] = useState('');
  const [sourceError, setSourceError] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [slash, setSlash] = useState(null);
  const slashRef = useRef(null);
  const actionsRef = useRef([]);
  slashRef.current = slash;
  const [, refreshToolbar] = useState(0);
  const initial = useMemo(() => savedDocument || parseArticleSource(value), []);
  const extensions = useMemo(() => [
    ...createEditorExtensions({ editable: true, placeholder: label('开始写作，输入 / 插入内容，或拖入图片和视频…', 'Start writing, type / to insert, or drop images and videos…') }),
    DragHandle.configure({ nested: true, render: () => {
      const handle = window.document.createElement('button');
      handle.type = 'button'; handle.className = 'editor-drag-handle'; handle.textContent = '⠿';
      handle.setAttribute('aria-label', zh ? '拖动内容块' : 'Drag block');
      return handle;
    } }),
  ], []);
  const emit = useCallback(current => {
    const doc = current.getJSON();
    callbacks.current.onChange(articleSource(doc), doc);
  }, []);
  const editor = useEditor({
    extensions, content: initial, editable: !disabled,
    editorProps: {
      attributes: { class: 'article-prose article-editor-content', 'aria-label': label('文章正文', 'Article content'), role: 'textbox', 'aria-multiline': 'true' },
      handleDrop(view, event, _slice, moved) {
        if (moved || !event.dataTransfer?.files?.length || !editorRef.current?.isEditable) return false;
        event.preventDefault();
        enqueueRef.current?.(event.dataTransfer.files, view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos);
        return true;
      },
      handleDOMEvents: {
        paste(_view, event) {
          if (!event.clipboardData?.files?.length || !editorRef.current?.isEditable) return false;
          event.preventDefault(); enqueueRef.current?.(event.clipboardData.files); return true;
        },
      },
      handleKeyDown(view, event) {
        const menu = slashRef.current;
        if (!menu || event.isComposing) return false;
        const choices = actionsRef.current.filter(action => `${action.name} ${action.terms}`.toLowerCase().includes(menu.query));
        if (event.key === 'Escape') { setSlash(null); return true; }
        if (choices.length && ['ArrowDown', 'ArrowUp'].includes(event.key)) {
          setSlash({ ...menu, index: ((menu.index || 0) + (event.key === 'ArrowDown' ? 1 : -1) + choices.length) % choices.length }); return true;
        }
        if (choices.length && event.key === 'Enter') {
          view.dispatch(view.state.tr.delete(menu.from, menu.to)); setSlash(null); choices[menu.index || 0].run(); return true;
        }
        return false;
      },
    },
    onUpdate({ editor: current }) {
      emit(current);
      const { $from } = current.state.selection;
      const match = $from.parent.textBetween(0, $from.parentOffset, '\n').match(/(?:^|\s)\/([^\s/]*)$/);
      if (match) {
        const coords = current.view.coordsAtPos($from.pos);
        setSlash({ from: $from.pos - match[1].length - 1, to: $from.pos, query: match[1].toLowerCase(), index: 0, top: Math.max(8, Math.min(coords.bottom + 6, window.innerHeight - 320)), left: Math.max(8, Math.min(coords.left, window.innerWidth - 270)) });
      } else setSlash(null);
    },
    onSelectionUpdate() { refreshToolbar(tick => tick + 1); },
  });
  editorRef.current = editor;
  const updatePlaceholder = useCallback((task, data, remove = false) => {
    const current = editorRef.current;
    if (!current || current.isDestroyed) return;
    let found;
    current.state.doc.descendants((node, pos) => { if (node.type.name === 'uploadPlaceholder' && node.attrs.uploadId === task.id) found = { node, pos }; });
    if (!found) return;
    const range = { from: found.pos, to: found.pos + found.node.nodeSize };
    const transaction = current.chain().command(({ tr }) => { tr.setMeta('addToHistory', false); return true; });
    if (remove) transaction.deleteRange(range).run();
    else {
      const node = task.type === 'image' ? { type: 'image', attrs: { src: data.url, alt: data.name || task.name } }
        : task.type === 'video' ? { type: 'video', attrs: { src: data.url, title: data.name || task.name } }
          : { type: 'attachment', attrs: { src: data.url, name: data.name || task.name, size: data.size, type: 'file' } };
      transaction.insertContentAt(range, node, { updateSelection: false }).run();
    }
  }, []);
  const uploads = useEditorUploads({
    onInsert(tasks, position) {
      const current = editorRef.current;
      if (!current) return;
      const nodes = tasks.map(task => ({ type: 'uploadPlaceholder', attrs: { uploadId: task.id, name: task.name, kind: task.type, previewUrl: task.previewUrl || '' } }));
      current.chain().focus().insertContentAt(position ?? current.state.selection.from, [...nodes, { type: 'paragraph' }]).run();
    },
    onUploaded: updatePlaceholder,
    onRemoved: task => updatePlaceholder(task, null, true),
    onUploadingChange: uploading => callbacks.current.onUploadingChange(uploading || sourceError || containsPendingMedia(editorRef.current?.getJSON())),
  });
  enqueueRef.current = uploads.enqueue;
  useEffect(() => { editor?.setEditable(!disabled && mode === 'visual'); }, [editor, disabled, mode]);
  const pendingMedia = editor ? containsPendingMedia(editor.getJSON()) : false;
  useEffect(() => { callbacks.current.onUploadingChange(uploads.hasPendingUploads || uploads.hasUnresolvedUploads || pendingMedia || sourceError); }, [uploads.hasPendingUploads, uploads.hasUnresolvedUploads, pendingMedia, sourceError]);
  useEffect(() => {
    const preventClose = event => { event.preventDefault(); event.returnValue = ''; };
    if (uploads.hasPendingUploads) window.addEventListener('beforeunload', preventClose);
    return () => window.removeEventListener('beforeunload', preventClose);
  }, [uploads.hasPendingUploads]);

  function changeMode(next) {
    if ((uploads.hasPendingUploads || uploads.hasUnresolvedUploads || pendingMedia) && next !== 'visual') { toast.error(label('请先完成、重试或移除待处理的上传', 'Finish, retry, or remove pending uploads first')); return; }
    if (sourceError && next !== 'source') { toast.error(label('请先修正源码', 'Correct the source first')); return; }
    if (mode === 'visual') setSource(articleSource(editor.getJSON()));
    setMode(next); setSlash(null);
  }
  function updateSource(next) {
    setSource(next);
    try {
      const doc = parseArticleSource(next);
      editor.commands.setContent(doc, { emitUpdate: false });
      callbacks.current.onChange(next, doc); setSourceError(false);
    } catch { setSourceError(true); }
  }
  function insertCard(variant = 'note') {
    const title = label(...cardNames[variant]);
    const href = variant === 'link' ? safeUrl(window.prompt(label('输入链接地址（https://…）', 'Link URL (https://…)'))) : '';
    if (variant === 'link' && !href) return;
    if (editor.state.selection.$from.parent.textContent || !editor.state.selection.empty) {
      if (editor.chain().focus().wrapIn('contentCard', { variant, title, href }).run()) return;
    }
    editor.chain().focus().insertContent({ type: 'contentCard', attrs: { variant, title, href }, content: [{ type: 'paragraph', content: [{ type: 'text', text: label('在这里输入内容…', 'Write here…') }] }] }).run();
  }
  function exportMarkdown() {
    const url = URL.createObjectURL(new Blob([articleSource(editor.getJSON())], { type: 'text/markdown;charset=utf-8' }));
    const link = window.document.createElement('a'); link.href = url; link.download = 'article.md'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const actions = editor ? [
    ...[1, 2, 3].map(level => ({ name: `${label('标题', 'Heading')} ${level}`, terms: `h${level} heading biaoti`, run: () => editor.chain().focus().toggleHeading({ level }).run() })),
    { name: label('项目列表', 'Bullet list'), terms: 'list bullet liebiao', run: () => editor.chain().focus().toggleBulletList().run() },
    { name: label('任务清单', 'Task list'), terms: 'todo task renwu', run: () => editor.chain().focus().toggleTaskList().run() },
    { name: label('表格', 'Table'), terms: 'table biaoge', run: () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
    { name: label('代码块', 'Code block'), terms: 'code daima', run: () => editor.chain().focus().toggleCodeBlock().run() },
    ...Object.keys(cardNames).map(variant => ({ name: `${label(...cardNames[variant])} ${label('卡片', 'card')}`, terms: `card kapian ${variant}`, run: () => insertCard(variant) })),
    { name: label('图片 / 视频 / 附件', 'Images / videos / files'), terms: 'image video file upload tupian shipin fujian', run: () => fileRef.current?.click() },
  ] : [];
  actionsRef.current = actions;
  const button = (name, action, active = false, text = name) => <button key={name} type="button" title={name} aria-label={name} aria-pressed={active} disabled={disabled || mode !== 'visual'} onMouseDown={event => event.preventDefault()} onClick={action} className={active ? 'is-active' : ''}>{text}</button>;
  if (!editor) return null;
  return <section className={`article-editor tiptap-composer ${fullscreen ? 'composer-fullscreen' : ''}`} aria-label={label('文章编辑器', 'Article editor')}>
    <div className="article-editor-heading">
      <div><h2>{label('写作空间', 'Writing studio')}</h2><p>{label('自由排版 · / 插入内容 · 拖动内容块', 'Format freely · / to insert · Drag blocks')}</p></div>
      <div className="composer-modes" role="group" aria-label={label('编辑模式', 'Editor mode')}>
        {[['visual', label('编辑', 'Edit')], ['source', 'Markdown'], ['preview', label('预览', 'Preview')]].map(([key, name]) => <button type="button" key={key} aria-pressed={mode === key} onClick={() => changeMode(key)}>{name}</button>)}
        <button type="button" aria-label={label('切换全屏', 'Toggle fullscreen')} onClick={() => setFullscreen(current => !current)}>{fullscreen ? '↙' : '↗'}</button>
      </div>
    </div>
    <input ref={fileRef} type="file" multiple accept={acceptedFiles} hidden onChange={event => { uploads.enqueue(event.target.files); event.target.value = ''; }} aria-label={label('选择图片、视频或附件', 'Select images, videos, or attachments')} />
    <input ref={importRef} type="file" accept=".md,.markdown,.txt" hidden onChange={async event => { const file = event.target.files[0]; event.target.value = ''; if (uploads.hasPendingUploads || uploads.hasUnresolvedUploads || pendingMedia) return; if (file && window.confirm(label('用此 Markdown 文件替换当前正文？', 'Replace current content with this Markdown file?'))) { updateSource(await file.text()); setMode('visual'); } }} />
    {mode === 'visual' && <>
      <div className="composer-toolbar" role="toolbar" aria-label={label('文字排版', 'Text formatting')}>
        <select aria-label={label('段落格式', 'Block format')} value={editor.isActive('heading') ? `h${editor.getAttributes('heading').level}` : 'p'} onChange={event => { const level = Number(event.target.value.slice(1)); level ? editor.chain().focus().setHeading({ level }).run() : editor.chain().focus().setParagraph().run(); }}><option value="p">{label('正文', 'Paragraph')}</option>{[1, 2, 3, 4].map(level => <option key={level} value={`h${level}`}>H{level}</option>)}</select>
        <select aria-label={label('字体', 'Font family')} value={editor.getAttributes('textStyle').fontFamily || ''} onChange={event => event.target.value ? editor.chain().focus().setFontFamily(event.target.value).run() : editor.chain().focus().unsetFontFamily().run()}><option value="">{label('默认字体', 'Default font')}</option><option value="SimSun, serif">{label('宋体', 'Serif')}</option><option value="Microsoft YaHei, sans-serif">{label('黑体', 'Sans serif')}</option><option value="Georgia, serif">Georgia</option><option value="Consolas, monospace">Consolas</option></select>
        <select aria-label={label('字号', 'Font size')} value={editor.getAttributes('textStyle').fontSize || ''} onChange={event => event.target.value ? editor.chain().focus().setFontSize(event.target.value).run() : editor.chain().focus().unsetFontSize().run()}><option value="">{label('字号', 'Size')}</option>{[12, 14, 16, 18, 20, 24, 28, 32, 40].map(size => <option key={size} value={`${size}px`}>{size}</option>)}</select>
        {button(label('加粗', 'Bold'), () => editor.chain().focus().toggleBold().run(), editor.isActive('bold'), <b>B</b>)}
        {button(label('斜体', 'Italic'), () => editor.chain().focus().toggleItalic().run(), editor.isActive('italic'), <i>I</i>)}
        {button(label('下划线', 'Underline'), () => editor.chain().focus().toggleUnderline().run(), editor.isActive('underline'), <u>U</u>)}
        {button(label('删除线', 'Strikethrough'), () => editor.chain().focus().toggleStrike().run(), editor.isActive('strike'), <s>S</s>)}
        <label className="composer-color" title={label('文字颜色', 'Text color')}>A<input type="color" aria-label={label('文字颜色', 'Text color')} value={colorHex(editor.getAttributes('textStyle').color)} onChange={event => editor.chain().focus().setColor(event.target.value).run()} /></label>
        {button(label('高亮', 'Highlight'), () => editor.chain().focus().toggleHighlight({ color: '#fff0ab' }).run(), editor.isActive('highlight'), '▰')}
        {['left', 'center', 'right', 'justify'].map((align, index) => button(label(['左对齐', '居中', '右对齐', '两端对齐'][index], align), () => editor.chain().focus().setTextAlign(align).run(), editor.isActive({ textAlign: align }), ['≡←', '≡', '→≡', '☰'][index]))}
        {button(label('无序列表', 'Bullet list'), () => editor.chain().focus().toggleBulletList().run(), editor.isActive('bulletList'), '• ≡')}
        {button(label('有序列表', 'Ordered list'), () => editor.chain().focus().toggleOrderedList().run(), editor.isActive('orderedList'), '1. ≡')}
        {button(label('任务清单', 'Task list'), () => editor.chain().focus().toggleTaskList().run(), editor.isActive('taskList'), '☑')}
        {button(label('引用', 'Quote'), () => editor.chain().focus().toggleBlockquote().run(), editor.isActive('blockquote'), '❝')}
        {button(label('链接', 'Link'), () => { const href = window.prompt(label('链接地址（留空移除）', 'Link URL (leave empty to remove)'), editor.getAttributes('link').href || ''); if (href === null) return; if (!href) editor.chain().focus().extendMarkRange('link').unsetLink().run(); else if (safeUrl(href)) editor.chain().focus().extendMarkRange('link').setLink({ href: safeUrl(href) }).run(); }, editor.isActive('link'), '↗')}
        {button(label('代码块', 'Code block'), () => editor.chain().focus().toggleCodeBlock().run(), editor.isActive('codeBlock'), '</>')}
        {button(label('插入表格', 'Insert table'), () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(), false, '▦')}
        {button(label('撤销', 'Undo'), () => editor.chain().focus().undo().run(), false, '↶')}
        {button(label('重做', 'Redo'), () => editor.chain().focus().redo().run(), false, '↷')}
        {button(label('清除格式', 'Clear formatting'), () => editor.chain().focus().unsetAllMarks().clearNodes().run(), false, 'Tx')}
      </div>
      <div className="composer-insert-bar">
        <button type="button" disabled={disabled} onClick={() => fileRef.current?.click()}>＋ {label('图片 / 视频 / 附件', 'Images / videos / files')}</button>
        <select aria-label={label('插入卡片', 'Insert card')} value="" onChange={event => insertCard(event.target.value)}><option value="" disabled>＋ {label('卡片', 'Card')}</option>{Object.entries(cardNames).map(([variant, names]) => <option key={variant} value={variant}>{label(...names)}</option>)}</select>
        <button type="button" disabled={disabled || uploads.hasPendingUploads || uploads.hasUnresolvedUploads || pendingMedia} onClick={() => importRef.current?.click()}>{label('导入 .md', 'Import .md')}</button>
        <button type="button" onClick={exportMarkdown}>{label('导出 .md', 'Export .md')}</button>
        <span>{editor.getText().length} {label('字', 'characters')}</span>
      </div>
      {editor.isActive('table') && <div className="composer-context-bar">{[[label('添加行', 'Add row'), 'addRowAfter'], [label('添加列', 'Add column'), 'addColumnAfter'], [label('删除行', 'Delete row'), 'deleteRow'], [label('删除列', 'Delete column'), 'deleteColumn'], [label('合并单元格', 'Merge cells'), 'mergeCells'], [label('拆分单元格', 'Split cell'), 'splitCell'], [label('删除表格', 'Delete table'), 'deleteTable']].map(([name, command]) => button(name, () => editor.chain().focus()[command]().run()))}</div>}
      {editor.isActive('image') && <div className="composer-context-bar"><span>{label('拖动图片边角缩放，或设置宽度', 'Drag image corners to resize, or set width')}</span>{[240, 480, 720].map(width => button(`${width}px`, () => editor.chain().focus().updateAttributes('image', { width, height: null }).run()))}{button(label('原始宽度', 'Original width'), () => editor.chain().focus().updateAttributes('image', { width: null, height: null }).run())}</div>}
      {editor.isActive('contentCard') && <div className="composer-context-bar"><span>{label('卡片样式', 'Card style')}</span>{Object.entries(cardNames).map(([variant, names]) => button(label(...names), () => editor.chain().focus().updateAttributes('contentCard', { variant }).run(), editor.getAttributes('contentCard').variant === variant))}
        <label>{label('背景', 'Background')} <input type="color" aria-label={label('卡片背景色', 'Card background color')} value={colorHex(editor.getAttributes('contentCard').backgroundColor, '#f5eff8')} onChange={event => editor.chain().focus().updateAttributes('contentCard', { backgroundColor: event.target.value }).run()} /></label>
        <label>{label('边框', 'Border')} <input type="color" aria-label={label('卡片边框色', 'Card border color')} value={colorHex(editor.getAttributes('contentCard').borderColor, '#dfd0e7')} onChange={event => editor.chain().focus().updateAttributes('contentCard', { borderColor: event.target.value }).run()} /></label>
        {button(label('修改卡片链接', 'Edit card link'), () => { const href = window.prompt(label('卡片链接', 'Card link'), editor.getAttributes('contentCard').href || ''); if (href !== null) editor.chain().focus().updateAttributes('contentCard', { href: safeUrl(href) }).run(); })}{button(label('修改封面', 'Edit cover'), () => { const cover = window.prompt(label('封面图片地址', 'Cover image URL'), editor.getAttributes('contentCard').cover || ''); if (cover !== null) editor.chain().focus().updateAttributes('contentCard', { cover: safeUrl(cover) }).run(); })}</div>}
    </>}
    <div className="composer-body" hidden={mode === 'source'}>
      <EditorContent editor={editor} />
      {slash && mode === 'visual' && <div className="composer-slash-menu" role="menu" aria-label={label('插入内容', 'Insert content')} style={{ left: slash.left, top: slash.top }}>{actions.filter(action => `${action.name} ${action.terms}`.toLowerCase().includes(slash.query)).map((action, index) => <button type="button" role="menuitem" className={index === (slash.index || 0) ? 'is-active' : ''} key={action.name} onMouseDown={event => event.preventDefault()} onClick={() => { editor.chain().focus().deleteRange({ from: slash.from, to: slash.to }).run(); setSlash(null); action.run(); }}>{action.name}</button>)}</div>}
    </div>
    {mode === 'source' && <div className="composer-source"><p>{label('标准内容使用 Markdown；颜色、卡片、视频等高级格式以 HTML 保留。', 'Standard content uses Markdown; advanced formatting, cards, and videos are preserved as HTML.')}</p><textarea value={source} onChange={event => updateSource(event.target.value)} aria-label={label('Markdown 源码', 'Markdown source')} spellCheck={false} disabled={disabled} />{sourceError && <p role="alert">{label('内容暂时无法解析，请修正后保存。', 'Content could not be parsed. Correct it before saving.')}</p>}</div>}
    <EditorUploads {...uploads} />
    <footer className="article-editor-footer">{label('支持批量选择、拖拽和粘贴图片。上传时可以继续写作。', 'Select multiple files, drop files, or paste images. Keep writing while uploads finish.')}</footer>
  </section>;
}
