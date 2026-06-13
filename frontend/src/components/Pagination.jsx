import { useTranslation } from 'react-i18next';

export default function Pagination({ page, totalPages, onPageChange }) {
  const { t } = useTranslation();

  if (totalPages <= 1) return null;

  return (
    <div className="flex justify-center gap-3 mt-8">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="btn-secondary"
      >
        {t('common.prev')}
      </button>
      <span className="text-gray-500 self-center text-sm">
        {t('common.page', { page, total: totalPages })}
      </span>
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="btn-secondary"
      >
        {t('common.next')}
      </button>
    </div>
  );
}
