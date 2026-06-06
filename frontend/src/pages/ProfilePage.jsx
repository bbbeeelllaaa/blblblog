import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user, updateProfile, uploadAvatar, logout } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [form, setForm] = useState({
    username: user?.username || '',
    bio: user?.bio || '',
    interests: user?.interests || '',
    experience: user?.experience || '',
  });
  const [saving, setSaving] = useState(false);

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
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadAvatar(file);
      toast.success('Avatar updated!');
    } catch (err) {
      toast.error('Failed to upload avatar');
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">My Profile</h1>

      <div className="card mb-6">
        <div className="flex items-center gap-6 mb-6">
          <div className="relative">
            {user.avatar ? (
              <img src={user.avatar} alt="" className="w-20 h-20 rounded-full object-cover" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-blue-500 flex items-center justify-center text-white text-2xl font-medium">
                {user.username?.[0]?.toUpperCase()}
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 w-7 h-7 bg-gray-800 text-white rounded-full flex items-center justify-center text-xs hover:bg-gray-700"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>
          <div>
            <div className="text-lg font-medium">{user.username}</div>
            <div className="text-sm text-gray-500">{user.email}</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input name="username" value={form.username} onChange={handleChange} className="input-field" minLength={3} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
            <textarea name="bio" value={form.bio} onChange={handleChange} rows={3}
              className="input-field resize-none" placeholder="Tell us about yourself..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Interests</label>
            <input name="interests" value={form.interests} onChange={handleChange}
              className="input-field" placeholder="e.g. Python, React, Machine Learning" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Experience</label>
            <textarea name="experience" value={form.experience} onChange={handleChange} rows={3}
              className="input-field resize-none" placeholder="Your work experience..." />
          </div>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>
    </div>
  );
}
