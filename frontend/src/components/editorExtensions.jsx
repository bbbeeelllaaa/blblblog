import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Node, mergeAttributes } from '@tiptap/core';
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyleKit } from '@tiptap/extension-text-style';
import TextAlign from '@tiptap/extension-text-align';
import Image from '@tiptap/extension-image';
import { TableKit } from '@tiptap/extension-table';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Highlight from '@tiptap/extension-highlight';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';

export function safeUrl(value, allowBlob = false) {
  const url = String(value || '').trim();
  if (/^https?:\/\//i.test(url) || /^\/(?!\/)/.test(url) || /^#[\w-]+$/.test(url)) return url;
  if (allowBlob && url.startsWith('blob:')) return url;
  return '';
}

const cardColor = value => /^(?:#[\da-f]{3,8}|rgba?\([\d.,%\s]+\))$/i.test(value || '') ? value : '';

function CardView({ node, updateAttributes, editor, selected }) {
  const attrs = node.attrs;
  const { i18n } = useTranslation();
  const zh = i18n.language.startsWith('zh');
  const [editable, setEditable] = useState(editor.isEditable);
  useEffect(() => {
    const update = () => setEditable(editor.isEditable);
    editor.on('update', update);
    update();
    return () => editor.off('update', update);
  }, [editor]);
  return (
    <NodeViewWrapper className={`content-card content-card--${attrs.variant} ${selected ? 'is-selected' : ''}`} style={{ backgroundColor: cardColor(attrs.backgroundColor) || undefined, borderColor: cardColor(attrs.borderColor) || undefined }}>
      {attrs.cover && <img className="content-card-cover" src={safeUrl(attrs.cover)} alt="" contentEditable={false} />}
      <div className="content-card-heading" contentEditable={false}>
        <span aria-hidden="true">{({ note: '✦', tip: '💡', warning: '!', link: '↗', image: '▧' })[attrs.variant] || '✦'}</span>
        {editable ? <input aria-label={zh ? '卡片标题' : 'Card title'} value={attrs.title}
          onChange={(event) => updateAttributes({ title: event.target.value })} /> : <strong>{attrs.title}</strong>}
      </div>
      <NodeViewContent className="content-card-body" />
      {attrs.href && <a className="content-card-link" href={safeUrl(attrs.href)} target="_blank" rel="noopener noreferrer" contentEditable={false}>{attrs.href} ↗</a>}
    </NodeViewWrapper>
  );
}

const ContentCard = Node.create({
  name: 'contentCard', group: 'block', content: 'block+', defining: true, draggable: true,
  addAttributes() {
    return {
      variant: { default: 'note', parseHTML: el => el.getAttribute('data-variant') || 'note', rendered: false },
      title: { default: '', parseHTML: el => el.getAttribute('data-title') || '', rendered: false },
      href: { default: '', parseHTML: el => safeUrl(el.getAttribute('data-href')), rendered: false },
      cover: { default: '', parseHTML: el => safeUrl(el.getAttribute('data-cover')), rendered: false },
      backgroundColor: { default: '', parseHTML: el => cardColor(el.style.backgroundColor), rendered: false },
      borderColor: { default: '', parseHTML: el => cardColor(el.style.borderColor), rendered: false },
    };
  },
  parseHTML() { return [{ tag: 'aside[data-content-card]', contentElement: '[data-card-body]' }]; },
  renderHTML({ node }) {
    const { variant, title, href, cover } = node.attrs;
    const children = [];
    if (safeUrl(cover)) children.push(['img', { class: 'content-card-cover', src: safeUrl(cover), alt: '' }]);
    children.push(['div', { class: 'content-card-heading' }, ['strong', {}, title]], ['div', { 'data-card-body': '', class: 'content-card-body' }, 0]);
    if (safeUrl(href)) children.push(['a', { class: 'content-card-link', href: safeUrl(href), target: '_blank', rel: 'noopener noreferrer' }, href]);
    const styles = [cardColor(node.attrs.backgroundColor) && `background-color: ${cardColor(node.attrs.backgroundColor)}`, cardColor(node.attrs.borderColor) && `border-color: ${cardColor(node.attrs.borderColor)}`].filter(Boolean).join('; ');
    return ['aside', { 'data-content-card': '', 'data-variant': variant, 'data-title': title, 'data-href': safeUrl(href), 'data-cover': safeUrl(cover), class: `content-card content-card--${variant}`, ...(styles ? { style: styles } : {}) }, ...children];
  },
  addNodeView() { return ReactNodeViewRenderer(CardView); },
});

const Video = Node.create({
  name: 'video', group: 'block', atom: true, draggable: true,
  addAttributes() {
    return {
      src: { default: '', parseHTML: el => safeUrl(el.getAttribute('src')) },
      title: { default: '' }, poster: { default: '', parseHTML: el => safeUrl(el.getAttribute('poster')) },
      width: { default: null },
    };
  },
  parseHTML() { return [{ tag: 'video[src]' }]; },
  renderHTML({ node, HTMLAttributes }) {
    return ['video', mergeAttributes(HTMLAttributes, { src: safeUrl(node.attrs.src), poster: safeUrl(node.attrs.poster), controls: true, preload: 'metadata', playsinline: true, class: 'article-video' })];
  },
});

const Attachment = Node.create({
  name: 'attachment', group: 'block', atom: true, draggable: true,
  addAttributes() {
    return {
      src: { default: '', parseHTML: el => safeUrl(el.getAttribute('href')), rendered: false },
      name: { default: '', parseHTML: el => el.getAttribute('data-name') || el.textContent, rendered: false },
      size: { default: 0, parseHTML: el => Number(el.getAttribute('data-size')) || 0, rendered: false },
      type: { default: 'file', rendered: false },
    };
  },
  parseHTML() { return [{ tag: 'a[data-attachment]' }]; },
  renderHTML({ node }) {
    const { src, name, size } = node.attrs;
    return ['a', { 'data-attachment': '', 'data-name': name, 'data-size': size, href: safeUrl(src), class: 'article-attachment', target: '_blank', rel: 'noopener noreferrer', download: name },
      ['span', { class: 'article-attachment-icon' }, '↧'], ['span', {}, ['strong', {}, name], ['small', {}, size ? `${(size / 1024 / 1024).toFixed(2)} MB` : '']]];
  },
});

const UploadPlaceholder = Node.create({
  name: 'uploadPlaceholder', group: 'block', atom: true, draggable: true,
  addAttributes() { return { uploadId: { default: '' }, name: { default: '' }, kind: { default: 'file' }, previewUrl: { default: '' } }; },
  parseHTML() { return []; },
  renderHTML({ node }) { return ['div', { class: 'upload-placeholder' }, node.attrs.name]; },
  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('figure');
      dom.className = 'upload-placeholder';
      dom.contentEditable = 'false';
      if (node.attrs.kind === 'image' && safeUrl(node.attrs.previewUrl, true)) {
        const img = document.createElement('img');
        img.src = node.attrs.previewUrl;
        img.alt = node.attrs.name;
        dom.append(img);
      }
      const label = document.createElement('figcaption');
      label.textContent = `↑ ${node.attrs.name}`;
      dom.append(label);
      return { dom };
    };
  },
});

const ArticleImage = Image.extend({
  addAttributes() {
    return { ...this.parent?.(), src: { default: '', parseHTML: el => safeUrl(el.getAttribute('src')), renderHTML: attrs => ({ src: safeUrl(attrs.src) }) } };
  },
});

export function createEditorExtensions({ editable = false, placeholder = '' } = {}) {
  return [
    StarterKit.configure({ codeBlock: false, link: { openOnClick: !editable, HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' } } }),
    TextStyleKit, TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ArticleImage.configure({ resize: editable ? { enabled: true, alwaysPreserveAspectRatio: true, minWidth: 64, minHeight: 32 } : false }),
    TableKit.configure({ table: { resizable: editable } }), TaskList, TaskItem.configure({ nested: true }),
    Highlight.configure({ multicolor: true }), CodeBlockLowlight.configure({ lowlight: createLowlight(common) }),
    ContentCard, Video, Attachment, UploadPlaceholder,
    ...(editable ? [Placeholder.configure({ placeholder })] : []),
  ];
}
