import { useState, useRef } from 'react';

export default function TagInput({ value = [], onChange, placeholder = 'Add tags...' }) {
  const [input, setInput] = useState('');
  const inputRef = useRef(null);

  const tags = value || [];

  const addTag = (raw) => {
    const tag = raw.replace(/,/g, '').trim();
    if (tag && !tags.includes(tag) && tags.length < 20) {
      onChange([...tags, tag]);
    }
    setInput('');
  };

  const removeTag = (index) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(input);
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  const handlePaste = (e) => {
    const text = e.clipboardData?.getData('text') || '';
    if (text.includes(',')) {
      e.preventDefault();
      const pastedTags = text.split(',').map(t => t.trim()).filter(Boolean);
      const newTags = [...tags];
      for (const t of pastedTags) {
        if (!newTags.includes(t) && newTags.length < 20) {
          newTags.push(t);
        }
      }
      onChange(newTags);
      setInput('');
    }
  };

  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 p-1.5 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent bg-white min-h-[42px] cursor-text"
      onClick={handleContainerClick}
    >
      {tags.map((tag, i) => (
        <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-200">
          {tag}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); removeTag(i); }}
            className="w-3.5 h-3.5 rounded-full inline-flex items-center justify-center hover:bg-blue-200 hover:text-blue-800 transition-colors"
          >
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onBlur={() => { if (input.trim()) addTag(input); }}
        placeholder={tags.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[100px] border-none outline-none text-sm bg-transparent py-0.5"
      />
    </div>
  );
}
