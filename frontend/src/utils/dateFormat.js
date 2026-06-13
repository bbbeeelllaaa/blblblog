/**
 * Format a date using the given locale.
 * @param {string|Date} date - Date to format
 * @param {string} [locale='zh-CN'] - Locale for Intl.DateTimeFormat
 * @param {object} [options] - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export function formatDate(date, locale = 'zh-CN', options) {
  if (!date) return '';
  return new Date(date).toLocaleDateString(locale, options || {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format a date and time using the given locale.
 */
export function formatDateTime(date, locale = 'zh-CN', options) {
  if (!date) return '';
  return new Date(date).toLocaleString(locale, options || {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format a relative timestamp (e.g. "3 days ago", "just now").
 */
export function formatRelative(date, locale = 'zh-CN') {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const diff = now - d;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (locale.startsWith('zh')) {
    if (seconds < 60) return '刚刚';
    if (minutes < 60) return `${minutes} 分钟前`;
    if (hours < 24) return `${hours} 小时前`;
    if (days < 30) return `${days} 天前`;
    return formatDate(date, locale);
  } else {
    if (seconds < 60) return 'just now';
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    if (days < 30) return `${days} day${days !== 1 ? 's' : ''} ago`;
    return formatDate(date, locale);
  }
}
