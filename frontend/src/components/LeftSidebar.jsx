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

      {/* Tags */}
      {tags.length > 0 && (
        <section className="sidebar-card">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Tags</h3>
          {tags.map((group, gi) => (
            <div key={gi} className="mb-3 last:mb-0">
              {group.category && (
                <div className="text-xs text-gray-400 font-medium mb-1.5">{group.category}</div>
              )}
              <div className="flex flex-wrap gap-1.5">
                {group.tags.map((tag) => (
                  <Link
                    key={tag.id}
                    to={`/?tag=${tag.name}`}
                    className={`inline-block text-xs px-2.5 py-1 rounded-full transition-colors ${
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
