/**
 * Avatar component — fixes Chrome/Huawei browser bug where rounded-full + object-fit-cover
 * on <img> causes rendering failures. Uses wrapper div for clipping instead.
 *
 * Props:
 *   src        — image URL (if falsy, shows letter fallback)
 *   letter     — fallback letter (upper-cased first char of username)
 *   size       — tailwind size class, e.g. "w-7 h-7" (default: "w-8 h-8")
 *   ring       — optional ring class, e.g. "ring-1 ring-white"
 *   className  — extra classes on wrapper (also controls letter font size)
 *   linkTo     — optional, wraps avatar in <Link to={linkTo}>
 *   linkClassName — extra classes on the Link wrapper
 */

import { Link } from 'react-router-dom';

const LETTER_BG = 'bg-brand';
const LETTER_TEXT = 'text-white';

/**
 * Map size class to a sensible letter font size.
 * Falls back to text-xs font-medium for unknown sizes.
 */
function letterFont(size) {
  const map = {
    'w-4': 'text-[8px] font-medium',
    'w-7': 'text-xs font-medium',
    'w-8': 'text-xs font-medium',
    'w-9': 'text-sm font-medium',
    'w-10': 'text-sm font-medium',
    'w-12': 'text-lg font-medium',
    'w-20': 'text-2xl font-medium',
    'w-24': 'text-3xl font-medium',
  };
  const width = size.split(' ')[0]; // "w-7 h-7" → "w-7"
  return map[width] || 'text-xs font-medium';
}

export default function Avatar({
  src,
  letter = '?',
  size = 'w-8 h-8',
  ring = '',
  className = '',
  linkTo,
  linkClassName = '',
}) {
  const fontSize = letterFont(size);
  const wrapperClass = `${size} rounded-full overflow-hidden shrink-0 flex items-center justify-center ${ring} ${className}`.trim();

  const inner = src ? (
    <div className={wrapperClass} title="">
      <img
        src={src}
        alt=""
        className="w-full h-full object-cover block"
        loading="lazy"
        onError={(e) => {
          // Replace broken image with letter fallback
          e.target.style.display = 'none';
          const parent = e.target.parentElement;
          parent.classList.add(LETTER_BG, LETTER_TEXT, ...fontSize.split(' '));
          parent.textContent = letter;
        }}
      />
    </div>
  ) : (
    <div className={`${wrapperClass} ${LETTER_BG} ${LETTER_TEXT} ${fontSize}`}>
      {letter}
    </div>
  );

  if (linkTo) {
    return (
      <Link to={linkTo} className={`shrink-0 ${linkClassName}`.trim()}>
        {inner}
      </Link>
    );
  }

  return inner;
}
