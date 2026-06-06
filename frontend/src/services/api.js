import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
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
    return api.post('/users/me/avatar', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Articles
export const articleAPI = {
  list: (params) => api.get('/articles', { params }),
  get: (id) => api.get(`/articles/${id}`),
  create: (data) => api.post('/articles', data),
  update: (id, data) => api.put(`/articles/${id}`, data),
  delete: (id) => api.delete(`/articles/${id}`),
  getSummary: (id) => api.get(`/articles/${id}/summary`),
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

export default api;
