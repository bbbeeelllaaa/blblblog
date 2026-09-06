import axios from 'axios';
import toast from 'react-hot-toast';

export function getErrorDetail(err, fallback = 'Something went wrong') {
  const detail = err?.response?.data?.detail;
  if (!detail) return fallback;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((d) => d.msg || d.message || JSON.stringify(d)).join('; ');
  }
  if (typeof detail === 'object') return detail.msg || detail.message || fallback;
  return fallback;
}

export function handleApiError(err, fallback = 'Something went wrong') {
  toast.error(getErrorDetail(err, fallback));
}

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

// Users
export const userAPI = {
  getUser: (id) => api.get(`/users/${id}`),
  updateMe: (data) => api.put('/users/me', data),
  uploadAvatar: (file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/users/me/avatar', form);
  },
};

// Articles
export const articleAPI = {
  list: (params) => api.get('/articles', { params }),
  get: (id) => api.get(`/articles/${id}`),
  create: (data) => api.post('/articles', data),
  update: (id, data) => api.put(`/articles/${id}`, data),
  delete: (id) => api.delete(`/articles/${id}`),
};

// Comments
export const commentAPI = {
  list: (articleId, params) => api.get(`/articles/${articleId}/comments`, { params }),
  create: (articleId, data) => api.post(`/articles/${articleId}/comments`, data),
  delete: (articleId, commentId) => api.delete(`/articles/${articleId}/comments/${commentId}`),
};

// Likes
export const likeAPI = {
  toggleArticle: (id) => api.post(`/likes/articles/${id}`),
  toggleComment: (id) => api.post(`/likes/comments/${id}`),
};

// Favorites
export const favoriteAPI = {
  toggle: (articleId) => api.post(`/favorites/articles/${articleId}`),
  list: (params) => api.get('/favorites', { params }),
};

// Search
export const searchAPI = {
  search: (params) => api.get('/search', { params }),
};

// Stats
export const statsAPI = {
  recordView: (articleId, userId) =>
    api.post(`/stats/view/${articleId}`, null, { params: { user_id: userId || 'anonymous' } }),
  online: () => api.get('/stats/online'),
  articleStats: (articleId) => api.get(`/stats/article/${articleId}`),
};

// Admin
export const adminAPI = {
  listUsers: (params) => api.get('/admin/users', { params }),
  toggleUserAdmin: (userId, isAdmin) => api.put(`/admin/users/${userId}/admin`, { is_admin: isAdmin }),
  deleteUser: (userId) => api.delete(`/admin/users/${userId}`),
  listArticles: (params) => api.get('/admin/articles', { params }),
  deleteArticle: (articleId) => api.delete(`/admin/articles/${articleId}`),
  listComments: (params) => api.get('/admin/comments', { params }),
  deleteComment: (commentId) => api.delete(`/admin/comments/${commentId}`),
  getStats: () => api.get('/admin/stats'),
  listTags: () => api.get('/admin/tags'),
  updateTag: (tagId, data) => api.put(`/admin/tags/${tagId}`, data),
};

// Site (sidebar)
export const siteAPI = {
  getSidebar: () => api.get('/site/sidebar'),
  updateOwner: (data) => api.put('/site/owner', data),
};

// Guestbook
export const guestbookAPI = {
  list: (params) => api.get('/guestbook', { params }),
  create: (data) => api.post('/guestbook', data),
  delete: (id) => api.delete(`/guestbook/${id}`),
};

export default api;
