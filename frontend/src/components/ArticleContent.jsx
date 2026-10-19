import { useMemo } from 'react';
import { marked } from 'marked';
import { articleHtml, cleanArticleHtml } from '../utils/articleDocument';
import './article-editor.css';

export default function ArticleContent({ content, document }) {
  const html = useMemo(() => {
    if (document) {
      try { return articleHtml(document); } catch { /* Preserve legacy text if an old document format is encountered. */ }
    }
    return cleanArticleHtml(marked.parse(content || '', { gfm: true }));
  }, [document, content]);
  return <div className="article-prose article-reader" dangerouslySetInnerHTML={{ __html: html }} />;
}
