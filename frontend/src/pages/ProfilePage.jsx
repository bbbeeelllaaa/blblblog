import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import { getErrorDetail } from '../services/api';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/bmp'];

export default function ProfilePage() {
  const { t } = useTranslation();
  const { user, updateProfile, uploadAvatar } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [form, setForm] = useState({
    username: user?.username || '',
    bio: user?.bio || '',
    interests: user?.interests || '',
    experience: user?.experience || '',
  });
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  if (!user) {
    navigate('/login');
    return null;
  }

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile(form);
      toast.success(t('profile.profileUpdated'));
    } catch (err) {
      toast.error(getErrorDetail(err, t('profile.failedToUpdate')));
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarFile = useCallback(async (file) => {
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error(t('profile.imageTypeError'));
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error(t('profile.fileTooLarge', { size: MAX_FILE_SIZE / 1024 / 1024 }));
      return;
    }

    setAvatarUploading(true);
    try {
      await uploadAvatar(file);
      toast.success(t('profile.avatarUpdated'));
    } catch (err) {
      toast.error(getErrorDetail(err, t('profile.failedToUploadAvatar')));
    } finally {
      setAvatarUploading(false);
    }
  }, [uploadAvatar]);

  const handleAvatarUpload = (e) => {
    handleAvatarFile(e.target.files?.[0]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleAvatarFile(e.dataTransfer.files?.[0]);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">{t('profile.myProfile')}</h1>

      <div className="card mb-6">
        <div className="flex items-center gap-6 mb-6">
          <div
            className={`relative ${dragOver ? 'ring-2 ring-brand rounded-full' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {user.avatar ? (
              <img src={user.avatar} alt="" className="w-20 h-20 rounded-full object-cover" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-brand flex items-center justify-center text-white text-2xl font-medium">
                {user.username?.[0]?.toUpperCase()}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              className="absolute bottom-0 right-0 w-7 h-7 bg-gray-800 text-white rounded-full flex items-center justify-center text-xs hover:bg-gray-700 disabled:opacity-50"
              title={t('profile.uploadAvatar')}
            >
              {avatarUploading ? (
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp,image/bmp"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>
          <div>
            <div className="text-lg font-medium">{user.username}</div>
            <div className="text-sm text-gray-500">{user.email}</div>
            {dragOver && <div className="text-xs text-brand mt-1">{t('profile.dropImage')}</div>}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.username')}</label>
            <input name="username" value={form.username} onChange={handleChange} className="input-field" minLength={3} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.bio')}</label>
            <textarea name="bio" value={form.bio} onChange={handleChange} rows={3}
              className="input-field resize-none" placeholder={t('profile.bioPlaceholder')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.interests')}</label>
            <textarea name="interests" value={form.interests} onChange={handleChange} rows={3}
              className="input-field resize-none" placeholder={t('profile.interestsPlaceholder')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.experience')}</label>
            <textarea name="experience" value={form.experience} onChange={handleChange} rows={3}
              className="input-field resize-none" placeholder={t('profile.experiencePlaceholder')} />
          </div>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? t('profile.saving') : t('profile.saveProfile')}
          </button>
        </form>
      </div>
    </div>
  );
}
