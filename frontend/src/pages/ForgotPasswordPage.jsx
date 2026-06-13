import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api, { getErrorDetail } from '../services/api';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
      toast.success(t('auth.resetLinkSentToast'));
    } catch (err) {
      toast.error(getErrorDetail(err, t('auth.failedToSendReset')));
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <div className="card text-center">
          <h1 className="text-2xl font-bold mb-4">{t('auth.checkEmail')}</h1>
          <p className="text-gray-600 text-sm mb-4">
            {t('auth.resetLinkSent', { email })}
            {' '}{t('auth.linkExpires')}
          </p>
          <Link to="/login" className="text-blue-600 hover:underline text-sm">
            {t('auth.backToLogin')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-12">
      <div className="card">
        <h1 className="text-2xl font-bold text-center mb-2">{t('auth.forgotPasswordTitle')}</h1>
        <p className="text-gray-500 text-sm text-center mb-6">
          {t('auth.forgotPasswordDesc')}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.email')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              required
              autoComplete="email"
            />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? t('auth.sending') : t('auth.sendResetLink')}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-4">
          <Link to="/login" className="text-blue-600 hover:underline">{t('auth.backToLogin')}</Link>
        </p>
      </div>
    </div>
  );
}
