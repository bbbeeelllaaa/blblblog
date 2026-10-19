import { generateHTML, generateJSON } from '@tiptap/core';
import { MarkdownManager } from '@tiptap/markdown';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { createEditorExtensions } from '../components/editorExtensions';

let tools;
function documentTools() {
  if (!tools) {
    const extensions = createEditorExtensions();
    tools = { extensions, markdown: new MarkdownManager({ extensions }) };
  }
  return tools;
}

export function cleanArticleHtml(html) {
  const clean = DOMPurify.sanitize(html, { ADD_TAGS: ['video', 'source'], ADD_ATTR: ['controls', 'preload', 'playsinline', 'poster'], FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed', 'form'] });
  const body = new DOMParser().parseFromString(clean, 'text/html').body;
  body.querySelectorAll('input').forEach(input => {
    if (input.type !== 'checkbox') input.remove();
    else input.setAttribute('disabled', '');
  });
  return body.innerHTML;
}

export function parseArticleSource(source) {
  const container = new DOMParser().parseFromString(marked.parse(source || '', { gfm: true }), 'text/html').body;
  container.querySelectorAll('li').forEach(li => {
    const checkbox = [...li.querySelectorAll('input[type="checkbox"]')].find(input => input.closest('li') === li);
    if (!checkbox) return;
    li.setAttribute('data-type', 'taskItem');
    li.setAttribute('data-checked', String(checkbox.checked));
    li.parentElement.setAttribute('data-type', 'taskList');
    checkbox.remove();
  });
  return generateJSON(cleanArticleHtml(container.innerHTML), documentTools().extensions);
}

function needsHtml(node) {
  if (['contentCard', 'video', 'attachment', 'uploadPlaceholder', 'image'].includes(node.type)) return true;
  const text = (node.content || []).map(child => child.text || (child.type === 'hardBreak' ? '\n' : '')).join('');
  // Markdown's serializer cannot represent every literal delimiter without ambiguity.
  if (node.type === 'text' && /[\\`*_[\]<>~]|&(?:#?\w+);/.test(node.text || '')) return true;
  if (node.type === 'codeBlock' && /(?:^|\n)[ \t]{0,3}`{3,}/.test(text)) return true;
  if (node.type === 'paragraph' && /(?:^|\n)[ \t]{0,3}(?:#{1,6}\s|[-+*]\s|\d+[.)]\s|>\s?)/.test(text)) return true;
  if (node.attrs && Object.entries(node.attrs).some(([key, value]) => value != null && value !== '' && !['level', 'language', 'start', 'checked', 'src', 'alt', 'title'].includes(key))) return true;
  if (node.marks?.some(mark => ['textStyle', 'highlight', 'underline', 'subscript', 'superscript'].includes(mark.type))) return true;
  if (node.marks?.some(mark => mark.type === 'link' && /["\n\\]/.test(mark.attrs?.title || ''))) return true;
  return node.content?.some(needsHtml) || false;
}

export function articleSource(doc) {
  const { markdown, extensions } = documentTools();
  return (doc.content || []).map(node => {
    if (node.type === 'uploadPlaceholder') return '';
    const single = { type: 'doc', content: [node] };
    return needsHtml(node) ? generateHTML(single, extensions) : markdown.serialize(single);
  }).join('\n\n').trim();
}

export function articleHtml(doc) {
  return cleanArticleHtml(generateHTML(doc, documentTools().extensions));
}

export function containsPendingMedia(doc) {
  if (!doc) return false;
  return doc.type === 'uploadPlaceholder' || Object.values(doc.attrs || {}).some(value => typeof value === 'string' && value.startsWith('blob:')) || doc.content?.some(containsPendingMedia) || false;
}
