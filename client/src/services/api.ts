import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('roc_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// P1 #23: 401 interceptor clears token and lets React Router redirect naturally
// instead of window.location.href which destroys all in-memory state.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('roc_token');
      window.dispatchEvent(new Event('roc:auth-expired'));
    }
    return Promise.reject(error);
  }
);

export default api;
