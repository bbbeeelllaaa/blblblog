import { useState, useRef } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const EMPTY_CARD = { image: '', title: '', description: '', url: '' };

function isEmpty(card) {
  return !card.image.trim() && !card.title.trim() && !card.description.trim() && !card.url.trim();
}

export default function FeaturedCardsEditor({ cards: initialCards, onSave, onCancel, saving }) {
  const [cards, setCards] = useState(() => {
    return (initialCards || []).map(c => ({ ...EMPTY_CARD, ...c }));
  });
  // Track upload state per card: { [index]: boolean }
  const [uploading, setUploading] = useState({});

  const updateCard = (index, field, value) => {
    setCards(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleImageUpload = async (index, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Basic validation
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are allowed');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large (max 5MB)');
      return;
    }

    setUploading(prev => ({ ...prev, [index]: true }));
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await api.post('/upload/image', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateCard(index, 'image', res.data.url);
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(prev => ({ ...prev, [index]: false }));
    }
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
          className="rounded-lg border border-warm/25 bg-warm/10 p-3 relative group"
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
                className="text-xs p-1 rounded hover:bg-rose/20 text-gray-400 hover:text-rose"
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
            {/* Image upload area */}
            {card.image ? (
              <div className="relative">
                <img
                  src={card.image}
                  alt=""
                  className="w-full h-28 object-cover rounded border border-gray-200"
                  onError={(e) => { e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 60"><rect fill="%23f3f4f6" width="100" height="60"/><text x="50" y="35" text-anchor="middle" fill="%239ca3af" font-size="10">Image broken</text></svg>'; }}
                />
                <button
                  type="button"
                  onClick={() => updateCard(index, 'image', '')}
                  className="absolute top-1 right-1 w-5 h-5 bg-rose text-white rounded-full text-xs flex items-center justify-center hover:bg-rose-hover"
                >
                  x
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-brand hover:bg-brand/10 transition-colors group">
                {uploading[index] ? (
                  <div className="flex flex-col items-center gap-1">
                    <svg className="w-5 h-5 text-brand animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span className="text-xs text-gray-400">Uploading...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-brand transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs text-gray-400 group-hover:text-brand transition-colors">Click to upload image</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(index, e)}
                  className="hidden"
                  disabled={uploading[index]}
                />
              </label>
            )}

            {/* URL input as secondary option */}
            <input
              type="text"
              value={card.image}
              onChange={(e) => updateCard(index, 'image', e.target.value)}
              placeholder="Or paste image URL..."
              className="w-full text-xs border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand focus:border-transparent"
            />
            <input
              type="text"
              value={card.title}
              onChange={(e) => updateCard(index, 'title', e.target.value)}
              placeholder="Title"
              className="w-full text-xs border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand focus:border-transparent"
            />
            <textarea
              value={card.description}
              onChange={(e) => updateCard(index, 'description', e.target.value)}
              rows={2}
              placeholder="Short description (optional)"
              className="w-full text-xs border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand focus:border-transparent resize-none"
            />
            <input
              type="text"
              value={card.url}
              onChange={(e) => updateCard(index, 'url', e.target.value)}
              placeholder="Link URL (e.g. https://...)"
              className="w-full text-xs border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand focus:border-transparent"
            />
          </div>

          {/* Live preview */}
          {(card.image || card.title || card.description) && (
            <div className="mt-2 rounded overflow-hidden border border-brand-light/50 bg-brand-light/20">
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
          className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-xs text-gray-400 hover:border-brand hover:text-brand transition-colors"
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
