import { useState } from 'react';

const EMPTY_CARD = { image: '', title: '', description: '', url: '' };

function isEmpty(card) {
  return !card.image.trim() && !card.title.trim() && !card.description.trim() && !card.url.trim();
}

export default function FeaturedCardsEditor({ cards: initialCards, onSave, onCancel, saving }) {
  const [cards, setCards] = useState(() => {
    // Deep-clone initial cards
    return (initialCards || []).map(c => ({ ...EMPTY_CARD, ...c }));
  });

  const updateCard = (index, field, value) => {
    setCards(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const addCard = () => {
    if (cards.length >= 8) return;
    setCards(prev => [...prev, { ...EMPTY_CARD }]);
  };

  const removeCard = (index) => {
    setCards(prev => prev.filter((_, i) => i !== index));
  };

  const moveUp = (index) => {
    if (index === 0) return;
    setCards(prev => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  };

  const moveDown = (index) => {
    if (index >= cards.length - 1) return;
    setCards(prev => {
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  };

  const handleSave = () => {
    const nonEmpty = cards.filter(c => !isEmpty(c));
    onSave(JSON.stringify(nonEmpty));
  };

  return (
    <div className="space-y-3">
      {/* Card list */}
      {cards.map((card, index) => (
        <div
          key={index}
          className="rounded-lg border border-gray-200 bg-gray-50 p-3 relative group"
        >
          {/* Card header with order buttons and remove */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-400">Card {index + 1}</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => moveUp(index)}
                disabled={index === 0}
                className="text-xs p-1 rounded hover:bg-gray-200 disabled:opacity-30 text-gray-500"
                title="Move up"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => moveDown(index)}
                disabled={index >= cards.length - 1}
                className="text-xs p-1 rounded hover:bg-gray-200 disabled:opacity-30 text-gray-500"
                title="Move down"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => removeCard(index)}
                className="text-xs p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-500"
                title="Remove card"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Fields */}
          <div className="space-y-2">
            <input
              type="text"
              value={card.image}
              onChange={(e) => updateCard(index, 'image', e.target.value)}
              placeholder="Image URL (optional)"
              className="w-full text-xs border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-transparent"
            />
            <input
              type="text"
              value={card.title}
              onChange={(e) => updateCard(index, 'title', e.target.value)}
              placeholder="Title"
              className="w-full text-xs border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-transparent"
            />
            <textarea
              value={card.description}
              onChange={(e) => updateCard(index, 'description', e.target.value)}
              rows={2}
              placeholder="Short description (optional)"
              className="w-full text-xs border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-transparent resize-none"
            />
            <input
              type="text"
              value={card.url}
              onChange={(e) => updateCard(index, 'url', e.target.value)}
              placeholder="Link URL (e.g. https://...)"
              className="w-full text-xs border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-transparent"
            />
          </div>

          {/* Live preview */}
          {(card.image || card.title || card.description) && (
            <div className="mt-2 rounded overflow-hidden border border-gray-200 bg-white">
              {card.image && (
                <img
                  src={card.image}
                  alt=""
                  className="w-full h-24 object-cover"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              )}
              <div className="p-2">
                {card.title && <div className="text-xs font-semibold text-gray-800 truncate">{card.title}</div>}
                {card.description && <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{card.description}</div>}
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Add card button */}
      {cards.length < 8 && (
        <button
          type="button"
          onClick={addCard}
          className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-xs text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors"
        >
          + Add a card
        </button>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary text-xs py-1.5 px-4"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={onCancel}
          className="btn-secondary text-xs py-1.5 px-4"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
