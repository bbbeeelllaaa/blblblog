import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import MDEditor from '@uiw/react-md-editor';
import { useAuth } from '../hooks/useAuth';
import { siteAPI, getErrorDetail } from '../services/api';
import toast from 'react-hot-toast';

export default function LeftSidebar() {
  const { user } = useAuth();
  const [sidebar, setSidebar] = useState(null);
  const [loading, setLoading] = useState(true);

  // Bio editing
  const [editingBio, setEditingBio] = useState(false);
  const [bioText, setBioText] = useState('');
  // Intro editing
  const [editingIntro, setEditingIntro] = useState(false);
  const [introText, setIntroText] = useState('');
  // Links editing
  const [editingLinks, setEditingLinks] = useState(false);
  const [linksJson, setLinksJson] = useState('');
  // Featured cards editing
  const [editingCards, setEditingCards] = useState(false);
  const [cardsJson, setCardsJson] = useState('');
  const [saving, setSaving] = useState(false);

  const isOwner = user?.is_admin && sidebar?.owner && user.id === sidebar.owner.id;

  const loadSidebar = useCallback(async () => {
    try {
      const res = await siteAPI.getSidebar();
      setSidebar(res.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSidebar();
  }, [loadSidebar]);

  const saveOwner = async (data) => {
    setSaving(true);
    try {
      await siteAPI.updateOwner(data);
      toast.success('Saved');
      loadSidebar();
    } catch (err) {
      toast.error(getErrorDetail(err, 'Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <aside className="space-y-4 animate-pulse">
        <div className="h-16 bg-gray-200 rounded-lg" />
        <div className="h-24 bg-gray-200 rounded-lg" />
        <div className="h-32 bg-gray-200 rounded-lg" />
      </aside>
    );
  }

  if (!sidebar?.owner) {
    return <aside className="text-sm text-gray-400 py-8">No content yet</aside>;
  }

  const { owner, tags = [] } = sidebar;
  const links = parseJson(owner.links);
  const cards = parseJson(owner.featured_cards);
  const params = new URLSearchParams(window.location.search);
  const currentTag = params.get('tag');

  return (
    <aside className="space-y-6 text-sm">
      {/* Owner info */}
      <section>
        <Link to={`/users/${owner.id}`} className="flex items-center gap-3 mb-2">
          {owner.avatar ? (
            <img src={owner.avatar} alt="" className="w-12 h-12 rounded-full object-cover" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white text-lg font-medium">
              {owner.username?.[0]?.toUpperCase()}
            </div>
          )}
          <div>
            <div className="font-semibold text-gray-900">{owner.username}</div>
            {!editingBio && (
              <p className="text-xs text-gray-500 mt-0.5">{owner.bio || 'No bio yet'}</p>
            )}
          </div>
        </Link>
        {isOwner && !editingBio && (
          <button
            onClick={() => { setBioText(owner.bio || ''); setEditingBio(true); }}
            className="text-xs text-gray-400 hover:text-blue-500 mt-1"
          >
            Edit bio
          </button>
        )}
        {editingBio && (
          <div className="mt-2 space-y-1">
            <textarea value={bioText} onChange={(e) => setBioText(e.target.value)}
              rows={2} className="input-field text-xs" placeholder="Short bio..." />
            <div className="flex gap-1">
              <button onClick={() => { saveOwner({ bio: bioText }); setEditingBio(false); }} disabled={saving} className="text-xs text-blue-500">Save</button>
              <button onClick={() => setEditingBio(false)} className="text-xs text-gray-400">Cancel</button>
            </div>
          </div>
        )}
      </section>

      {/* Intro (Markdown) */}
      {!editingIntro && (
        <section className="sidebar-card">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-800">About</h3>
            {isOwner && (
              <button onClick={() => { setIntroText(owner.intro || ''); setEditingIntro(true); }} className="text-xs text-gray-400 hover:text-blue-500">
                Edit
              </button>
            )}
          </div>
          {owner.intro ? (
            <div data-color-mode="light">
              <MDEditor.Markdown source={owner.intro} />
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic">Nothing written yet</p>
          )}
        </section>
      )}
      {editingIntro && (
        <section className="sidebar-card">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">About</h3>
          <div className="space-y-2" data-color-mode="light">
            <MDEditor value={introText} onChange={setIntroText} height={200} preview="edit" />
            <div className="flex gap-2">
              <button onClick={() => { saveOwner({ intro: introText }); setEditingIntro(false); }} disabled={saving} className="btn-primary text-xs py-1 px-3">Save</button>
              <button onClick={() => setEditingIntro(false)} className="btn-secondary text-xs py-1 px-3">Cancel</button>
            </div>
          </div>
        </section>
      )}

      {/* Featured Cards */}
      <section className="sidebar-card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-800">Featured</h3>
          {isOwner && (
            <button
              onClick={() => { setCardsJson(JSON.stringify(cards, null, 2)); setEditingCards(!editingCards); }}
              className="text-xs text-gray-400 hover:text-blue-500"
            >
              {editingCards ? 'Cancel' : 'Edit'}
            </button>
          )}
        </div>
        {editingCards ? (
          <div className="space-y-2">
            <textarea
              value={cardsJson}
              onChange={(e) => setCardsJson(e.target.value)}
              rows={8}
              className="input-field text-xs font-mono"
              placeholder='[{"image":"https://...","title":"Title","description":"Brief description","url":"https://..."}]'
            />
            <button onClick={() => { saveOwner({ featured_cards: cardsJson }); setEditingCards(false); }} disabled={saving} className="btn-primary text-xs py-1 px-3">Save</button>
          </div>
        ) : cards.length > 0 ? (
          <div className="space-y-3">
            {cards.map((card, i) => (
              <a
                key={i}
                href={card.url || '#'}
                target={card.url ? '_blank' : undefined}
                rel={card.url ? 'noopener noreferrer' : undefined}
                className="block rounded-lg overflow-hidden border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all bg-white"
              >
                {card.image && (
                  <img src={card.image} alt={card.title} className="w-full h-32 object-cover" />
                )}
                <div className="p-3">
                  {card.title && <div className="font-semibold text-gray-800 text-sm">{card.title}</div>}
                  {card.description && <div className="text-gray-500 text-xs mt-1 line-clamp-2">{card.description}</div>}
                </div>
              </a>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic">No featured content</p>
        )}
      </section>

      {/* Links */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide">Links</h3>
          {isOwner && (
            <button onClick={() => { setLinksJson(JSON.stringify(links, null, 2)); setEditingLinks(!editingLinks); }} className="text-xs text-gray-400 hover:text-blue-500">
              {editingLinks ? 'Cancel' : 'Edit'}
            </button>
          )}
        </div>
        {editingLinks ? (
          <div className="space-y-1">
            <textarea value={linksJson} onChange={(e) => setLinksJson(e.target.value)}
              rows={5} className="input-field text-xs font-mono"
              placeholder='[{"title":"GitHub","url":"https://github.com/..."}]' />
            <button onClick={() => { saveOwner({ links: linksJson }); setEditingLinks(false); }} disabled={saving} className="btn-primary text-xs py-1 px-3">Save</button>
          </div>
        ) : links.length > 0 ? (
          <div className="space-y-1">
            {links.map((link, i) => (
              <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors text-xs">
                <LinkIcon title={link.title} />
                <span>{link.title}</span>
              </a>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic">No links</p>
        )}
      </section>

      {/* Tags */}
      {tags.length > 0 && (
        <section>
          <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Tags</h3>
          {tags.map((group, gi) => (
            <div key={gi} className="mb-3">
              {group.category && (
                <div className="text-xs text-gray-400 font-medium mb-1">{group.category}</div>
              )}
              <div className="flex flex-wrap gap-1">
                {group.tags.map((tag) => (
                  <Link
                    key={tag.id}
                    to={`/?tag=${tag.name}`}
                    className={`inline-block text-xs px-2 py-0.5 rounded-full transition-colors ${
                      currentTag === tag.name
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {tag.name}
                    <span className="ml-1 opacity-50">{tag.count}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}
    </aside>
  );
}

function parseJson(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function LinkIcon({ title }) {
  const t = (title || '').toLowerCase();
  if (t.includes('github')) {
    return (
      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
      </svg>
    );
  }
  if (t.includes('twitter') || t.includes('x.com')) {
    return (
      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    );
  }
  if (t.includes('email') || t.includes('mail')) {
    return (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    );
  }
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  );
}
