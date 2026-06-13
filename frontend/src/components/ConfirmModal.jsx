import { useTranslation } from 'react-i18next';

export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel }) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="btn-secondary text-sm">
            {t('common.cancel')}
          </button>
          <button onClick={onConfirm} className="btn-danger text-sm">
            {t('common.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
