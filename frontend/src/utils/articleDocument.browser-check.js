import { articleSource, parseArticleSource, articleHtml } from './articleDocument';

// Run in a browser console: (await import('/src/utils/articleDocument.browser-check.js')).runArticleDocumentChecks()
export function runArticleDocumentChecks() {
  const checks = [];
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const equal = (actual, expected, label) => assert(actual === expected, `${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  const nodes = node => [node, ...(node.content || []).flatMap(nodes)];
  const text = node => (node.text || '') + (node.content || []).map(text).join('');
  const doc = content => ({ type: 'doc', content });
  const paragraph = (value, marks) => ({ type: 'paragraph', content: [{ type: 'text', text: value, ...(marks ? { marks } : {}) }] });
  const roundtrip = document => parseArticleSource(articleSource(document));
  const check = (name, run) => {
    try { run(); checks.push(name); } catch (error) { throw new Error(`${name}: ${error.message}`); }
  };

  check('Markdown headings, marks, tables and GFM checked tasks', () => {
    const document = parseArticleSource('# 标题\n\n**Bold** and *italic*.\n\n- [x] complete\n- [ ] pending\n\n| A | B |\n| --- | --- |\n| 1 | 2 |');
    const all = nodes(document);
    assert(all.some(node => node.type === 'heading' && node.attrs.level === 1), 'Heading was lost');
    assert(all.some(node => node.marks?.some(mark => mark.type === 'bold')), 'Bold was lost');
    assert(all.some(node => node.marks?.some(mark => mark.type === 'italic')), 'Italic was lost');
    assert(all.some(node => node.type === 'table'), 'GFM table was lost');
    const tasks = all.filter(node => node.type === 'taskItem');
    equal(tasks.length, 2, 'Task count');
    equal(tasks[0].attrs.checked, true, 'Completed task');
    equal(tasks[1].attrs.checked, false, 'Pending task');
    const saved = nodes(roundtrip(document)).filter(node => node.type === 'taskItem');
    equal(saved[0]?.attrs.checked, true, 'Completed task after source round trip');
    equal(saved[1]?.attrs.checked, false, 'Pending task after source round trip');
  });

  check('Cards retain title, link, cover, body and marks', () => {
    const attrs = { variant: 'link', title: '资料 <重要> "title"', href: 'https://example.com/path?q=one&two=2', cover: '/cover.webp', backgroundColor: 'rgb(255, 240, 230)', borderColor: 'rgb(160, 120, 90)' };
    const saved = nodes(roundtrip(doc([{ type: 'contentCard', attrs, content: [paragraph('卡片正文', [{ type: 'bold' }])] }])));
    const card = saved.find(node => node.type === 'contentCard');
    assert(card, 'Card was lost');
    for (const key of Object.keys(attrs)) equal(card.attrs[key], attrs[key], `Card ${key}`);
    equal(text(card), '卡片正文', 'Card body');
    assert(nodes(card).some(node => node.marks?.some(mark => mark.type === 'bold')), 'Card body marks were lost');
  });

  check('Fonts, size, colors, highlight and alignment survive HTML source', () => {
    const style = { color: '#bb3355', fontSize: '24px', fontFamily: 'Georgia, serif' };
    const content = paragraph('排版内容', [{ type: 'textStyle', attrs: style }, { type: 'highlight', attrs: { color: '#fff0ab' } }]);
    content.attrs = { textAlign: 'center' };
    const saved = roundtrip(doc([content]));
    equal(saved.content[0].attrs.textAlign, 'center', 'Paragraph alignment');
    const marked = nodes(saved).find(node => node.type === 'text' && node.text === '排版内容');
    assert(marked, 'Styled text was lost');
    const textStyle = marked.marks?.find(mark => mark.type === 'textStyle');
    assert(textStyle, 'Text style mark was lost');
    const color = value => { const span = document.createElement('span'); span.style.color = value; return span.style.color; };
    for (const key of Object.keys(style)) equal(key === 'color' ? color(textStyle.attrs[key]) : textStyle.attrs[key], key === 'color' ? color(style[key]) : style[key], `Text ${key}`);
    equal(color(marked.marks?.find(mark => mark.type === 'highlight')?.attrs.color), color('#fff0ab'), 'Highlight color');
  });

  check('Styled checked tasks survive the HTML fallback', () => {
    const saved = roundtrip(doc([{ type: 'taskList', content: [
      { type: 'taskItem', attrs: { checked: true }, content: [paragraph('complete', [{ type: 'textStyle', attrs: { color: '#bb3355' } }])] },
      { type: 'taskItem', attrs: { checked: false }, content: [paragraph('pending')] },
    ] }]));
    const tasks = nodes(saved).filter(node => node.type === 'taskItem');
    equal(tasks.length, 2, 'Styled task count');
    equal(tasks[0].attrs.checked, true, 'Styled completed task');
    equal(tasks[1].attrs.checked, false, 'Styled pending task');
    assert(nodes(tasks[0]).some(node => node.marks?.some(mark => mark.type === 'textStyle')), 'Task text style was lost');
  });

  check('Images retain special alt/title characters and resized width', () => {
    for (const width of [null, 480]) {
      const attrs = { src: '/api/upload/images/test.webp', alt: 'scan ].png', title: 'Photo "quoted" <title>', width, height: null };
      const image = nodes(roundtrip(doc([{ type: 'image', attrs }]))).find(node => node.type === 'image');
      assert(image, 'Image was lost');
      for (const key of ['src', 'alt', 'title']) equal(image.attrs[key], attrs[key], `Image ${key}`);
      if (width) equal(Number(image.attrs.width), width, 'Image width');
    }
  });

  check('Code blocks retain embedded triple backtick fences', () => {
    const value = 'before\n```\nafter';
    const saved = roundtrip(doc([{ type: 'codeBlock', attrs: { language: 'markdown' }, content: [{ type: 'text', text: value }] }]));
    equal(saved.content.length, 1, 'Code block count');
    equal(saved.content[0].type, 'codeBlock', 'Code block node');
    equal(saved.content[0].attrs.language, 'markdown', 'Code language');
    equal(text(saved.content[0]), value, 'Code body');
  });

  check('Literal Markdown block prefixes remain paragraphs', () => {
    for (const value of ['# heading', '- list', '1. numbered paragraph', 'Literal *stars* and [brackets]']) {
      const saved = roundtrip(doc([paragraph(value)]));
      equal(saved.content.length, 1, 'Literal paragraph count');
      equal(saved.content[0].type, 'paragraph', `Literal ${value} node`);
      equal(text(saved.content[0]), value, `Literal ${value} text`);
    }
  });

  const assertClean = html => {
    const body = new DOMParser().parseFromString(html, 'text/html').body;
    assert(!body.querySelector('script, iframe, object, embed, form, input'), 'Unsafe element survived');
    for (const element of body.querySelectorAll('*')) {
      for (const attr of element.attributes) {
        assert(!/^on/i.test(attr.name), `Event handler ${attr.name} survived`);
        if (['href', 'src', 'poster'].includes(attr.name)) assert(!/^(?:javascript|vbscript|data|blob):/i.test(attr.value.trim()), `Unsafe URL ${attr.name} survived`);
      }
    }
  };

  check('Source HTML removes scripts, handlers and dangerous URLs', () => {
    const source = '<script>window.__articleDocumentCheck = 1</script><p onclick="alert(1)">safe</p><img src="javascript:alert(1)" onerror="alert(1)"><a href="javascript:alert(1)">bad link</a><video src="/clip.mp4" poster="javascript:alert(1)" onerror="alert(1)"></video><iframe src="https://example.com"></iframe>';
    const html = articleHtml(parseArticleSource(source));
    assertClean(html);
    assert(html.includes('safe'), 'Safe content was removed');
  });

  check('JSON rendering removes dangerous media and link URLs', () => {
    const document = doc([
      paragraph('bad link', [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }]),
      { type: 'image', attrs: { src: 'javascript:alert(1)', alt: 'unsafe image' } },
      { type: 'video', attrs: { src: 'javascript:alert(1)', poster: 'javascript:alert(1)' } },
      { type: 'contentCard', attrs: { variant: 'link', title: '<script>not markup</script>', href: 'javascript:alert(1)', cover: 'javascript:alert(1)' }, content: [paragraph('Safe card body')] },
    ]);
    const html = articleHtml(document);
    assertClean(html);
    assert(html.includes('Safe card body'), 'Card body was removed');
  });

  return { passed: checks.length, checks };
}
