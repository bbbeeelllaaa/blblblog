import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MDEditor from '@uiw/react-md-editor';
import { useAuth } from '../hooks/useAuth';
import { siteAPI, getErrorDetail } from '../services/api';
import { parseJsonArray } from '../utils/json';
import FeaturedCardsEditor from './FeaturedCardsEditor';
import Avatar from './Avatar';
import toast from 'react-hot-toast';

export default function LeftSidebar() {
  const { t } = useTranslation();
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
  const [expandedCard, setExpandedCard] = useState(null);
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
      toast.success(t('common.save'));
      loadSidebar();
    } catch (err) {
      toast.error(getErrorDetail(err, t('common.failed')));
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
    return <aside className="text-sm text-gray-400 py-8">{t('sidebar.noContent')}</aside>;
  }

  const { owner, tags = [] } = sidebar;
  const cards = parseJsonArray(owner.featured_cards);
  const params = new URLSearchParams(window.location.search);
  const currentTag = params.get('tag');

  // Rotate card colors: warm → rose → brand → repeat
  const cardColors = [
    'bg-warm/15 border-warm/30 hover:border-warm',
    'bg-rose/10 border-rose/20 hover:border-rose',
    'bg-brand-light/30 border-brand/25 hover:border-brand',
  ];

  return (
    <aside className="space-y-6 text-sm">
      {/* Owner info */}
      <section>
        <Link to={`/users/${owner.id}`} className="flex items-center gap-3 mb-2">
          <Avatar src={owner.avatar} letter={owner.username?.[0]?.toUpperCase()} size="w-12 h-12" />
          <div>
            <div className="font-semibold text-gray-900">{owner.username}</div>
            {!editingBio && (
              <p className="text-xs text-gray-600 mt-0.5">{owner.bio || t('sidebar.noBio')}</p>
            )}
          </div>
        </Link>
        {isOwner && !editingBio && (
          <button
            onClick={() => { setBioText(owner.bio || ''); setEditingBio(true); }}
            className="text-xs text-gray-400 hover:text-brand mt-1"
          >
            {t('sidebar.editBio')}
          </button>
        )}
        {editingBio && (
          <div className="mt-2 space-y-1">
            <textarea value={bioText} onChange={(e) => setBioText(e.target.value)}
              rows={2} className="input-field text-xs" placeholder={t('sidebar.shortBio')} />
            <div className="flex gap-1">
              <button onClick={() => { saveOwner({ bio: bioText }); setEditingBio(false); }} disabled={saving} className="text-xs text-brand">{t('common.save')}</button>
              <button onClick={() => setEditingBio(false)} className="text-xs text-gray-400">{t('common.cancel')}</button>
            </div>
          </div>
        )}
      </section>

      {/* Intro (Markdown) */}
      {!editingIntro && (
        <section className="sidebar-card">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-800">{t('sidebar.about')}</h3>
            {isOwner && (
              <button onClick={() => { setIntroText(owner.intro || ''); setEditingIntro(true); }} className="text-xs text-gray-400 hover:text-brand">
                {t('common.edit')}
              </button>
            )}
          </div>
          {owner.intro ? (
            <div data-color-mode="light" className="sidebar-about-content">
              <MDEditor.Markdown source={owner.intro} />
            </div>
          ) : (
            <p className="text-xs text-gray-500 italic">{t('sidebar.nothingWritten')}</p>
          )}
        </section>
      )}
      {editingIntro && (
        <section className="sidebar-card">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">{t('sidebar.about')}</h3>
          <div className="space-y-2" data-color-mode="light">
            <MDEditor value={introText} onChange={setIntroText} height={200} preview="edit" />
            <div className="flex gap-2">
              <button onClick={() => { saveOwner({ intro: introText }); setEditingIntro(false); }} disabled={saving} className="btn-primary text-xs py-1 px-3">{t('common.save')}</button>
              <button onClick={() => setEditingIntro(false)} className="btn-secondary text-xs py-1 px-3">{t('common.cancel')}</button>
            </div>
          </div>
        </section>
      )}

      {/* Featured / Daily Push */}
      <section className="sidebar-card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-800">{t('sidebar.dailyPush')}</h3>
          {isOwner && (
            <button
              onClick={() => setEditingCards(!editingCards)}
              className="text-xs text-gray-400 hover:text-brand"
            >
              {editingCards ? t('common.cancel') : t('common.edit')}
            </button>
          )}
        </div>
        {editingCards ? (
          <FeaturedCardsEditor
            cards={cards}
            onSave={async (jsonStr) => {
              await saveOwner({ featured_cards: jsonStr });
              setEditingCards(false);
            }}
            onCancel={() => setEditingCards(false)}
            saving={saving}
          />
        ) : cards.length > 0 ? (
          <div className="space-y-3">
            {cards.map((card, i) => (
              <div
                key={i}
                onClick={() => setExpandedCard(card)}
                className={`block rounded-lg overflow-hidden border hover:shadow-md transition-all cursor-pointer group relative ${cardColors[i % 3]}`}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') setExpandedCard(card); }}
              >
                {card.image && (
                  <div className="relative">
                    <img src={card.image} alt={card.title} className="w-full h-32 object-cover" />
                    {/* Expand hint overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <svg className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                      </svg>
                    </div>
                  </div>
                )}
                <div className="p-3">
                  {card.title && <div className="font-semibold text-gray-800 text-sm truncate">{card.title}</div>}
                  {card.description && <div className="text-gray-600 text-xs mt-1 line-clamp-2">{card.description}</div>}
                  {!card.image && (
                    <div className="text-xs text-gray-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      Click to expand →
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic">{t('sidebar.noFeatured')}</p>
        )}

        {/* Card detail modal */}
        {expandedCard && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" onClick={() => setExpandedCard(null)}>
            <div className="absolute inset-0 bg-black/50" />
            <div
              className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => setExpandedCard(null)}
                className="absolute top-3 right-3 z-10 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors"
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {expandedCard.image && (
                <img
                  src={expandedCard.image}
                  alt={expandedCard.title}
                  className="w-full max-h-64 object-cover"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              )}

              <div className="p-6">
                {expandedCard.title && (
                  <h2 className="text-lg font-bold text-gray-900 mb-2">{expandedCard.title}</h2>
                )}
                {expandedCard.description && (
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{expandedCard.description}</p>
                )}
                {expandedCard.url && (
                  <a
                    href={expandedCard.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-4 text-sm font-medium text-white bg-brand hover:bg-brand-hover px-4 py-2 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Visit Link
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Tags */}
      {tags.length > 0 && (
        <section className="sidebar-card">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">{t('sidebar.tags')}</h3>
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
                        ? 'bg-brand text-white'
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
